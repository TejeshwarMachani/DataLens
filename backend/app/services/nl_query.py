import os
import json
import logging
from typing import Dict, Any, List, Optional
from uuid import UUID

from app.core.config import settings
from app.core.duckdb import get_duckdb_conn

logger = logging.getLogger(__name__)

# Try to import LangChain components lazily (not at module level)
LANGCHAIN_AVAILABLE = None  # Will be determined at runtime


class NLQueryService:
    """Natural Language to SQL query service using LangChain or fallback."""

    def __init__(self):
        self.llm = None
        self._init_llm()

    def _init_llm(self):
        """Initialize LLM - prefer OpenAI, fallback to Ollama."""
        global LANGCHAIN_AVAILABLE

        # Check LangChain availability at runtime
        if LANGCHAIN_AVAILABLE is None:
            try:
                from langchain_openai import ChatOpenAI
                from langchain_community.utilities import SQLDatabase
                from langchain_community.agent_toolkits import SQLDatabaseToolkit
                from langchain.agents import create_sql_agent, AgentExecutor
                from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
                from langchain.schema import SystemMessage, HumanMessage
                from langchain_community.callbacks import get_openai_callback
                LANGCHAIN_AVAILABLE = True
            except ImportError as e:
                LANGCHAIN_AVAILABLE = False
                logger.warning(f"LangChain not available: {e}, using fallback NL->SQL")

        if not LANGCHAIN_AVAILABLE:
            logger.warning("LangChain not available, using fallback NL->SQL")
            self.llm = None
            return

        # Import inside the function to avoid module-level import issues
        from langchain_openai import ChatOpenAI
        from langchain.schema import SystemMessage, HumanMessage

        if settings.OPENAI_API_KEY:
            try:
                self.llm = ChatOpenAI(
                    model="gpt-4o-mini",
                    temperature=0,
                    api_key=settings.OPENAI_API_KEY,
                )
                logger.info("Using OpenAI GPT-4o-mini for NL->SQL")
            except Exception as e:
                logger.warning(f"OpenAI initialization failed: {e}")
                self.llm = None
        else:
            # Try Ollama
            try:
                from langchain_community.llms import Ollama
                self.llm = Ollama(
                    model=settings.OLLAMA_MODEL,
                    base_url=settings.OLLAMA_BASE_URL,
                    temperature=0,
                )
                logger.info(f"Using Ollama {settings.OLLAMA_MODEL} for NL->SQL")
            except Exception as e:
                logger.warning(f"Ollama not available: {e}")
                self.llm = None

    def _create_db_connection(self, view_name: str):
        """Create a SQLDatabase connection to DuckDB view."""
        from sqlalchemy import create_engine

        # Use DuckDB's SQLAlchemy dialect
        # Note: duckdb-engine is needed for SQLAlchemy integration
        db_url = f"duckdb:///{settings.DUCKDB_PATH}"
        engine = create_engine(db_url)

        # Import SQLDatabase here to avoid module-level import issues
        try:
            from langchain_community.utilities import SQLDatabase
            return SQLDatabase(engine, include_tables=[view_name])
        except ImportError:
            return None

    def _get_schema_context(self, view_name: str) -> str:
        """Get schema information for the view."""
        with get_duckdb_conn() as conn:
            schema = conn.execute(f"DESCRIBE {view_name}").fetchall()

        lines = [f"Table: {view_name}"]
        for col in schema:
            col_name, col_type, *_ = col
            lines.append(f"  - {col_name}: {col_type}")

        # Add sample data
        samples = conn.execute(f"SELECT * FROM {view_name} LIMIT 3").fetchall()
        if samples:
            lines.append("\nSample rows:")
            for row in samples:
                lines.append(f"  {row}")

        return "\n".join(lines)

    async def query(
        self,
        question: str,
        dataset_view_name: str,
        dataset_id: UUID,
        chart_suggestion: bool = True,
    ) -> Dict[str, Any]:
        """
        Process a natural language question and return SQL + results.
        """
        if not self.llm:
            return await self._fallback_query(question, dataset_view_name)

        try:
            # Get schema context
            schema_context = self._get_schema_context(dataset_view_name)

            # Build the prompt
            system_prompt = f"""You are a data analyst that converts natural language questions into SQL queries.

Database schema:
{schema_context}

Rules:
1. Only generate SELECT queries - no INSERT, UPDATE, DELETE, DROP
2. Use the exact table name: {dataset_view_name}
3. Return results as JSON with: sql, answer, chart_spec (if chart_suggestion)
4. Keep queries simple and efficient
5. Use LIMIT 100 by default
6. For aggregations, include appropriate GROUP BY

Output format:
```json
{{
  "sql": "SELECT ...",
  "answer": "Natural language explanation of results",
  "chart_spec": {{ ...vega-lite spec... }} or null
}}
```"""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=question),
            ]

            response = self.llm.invoke(messages)

            # Parse response
            content = response.content
            result = self._parse_llm_response(content)

            # Execute the SQL
            if result.get("sql"):
                from app.services.query_engine import execute_sql
                data, columns, row_count, truncated = await execute_sql(
                    result["sql"], limit=100
                )
                result["data"] = data
                result["columns"] = columns
                result["row_count"] = row_count

            # Ensure all expected fields are present
            if "error" not in result:
                result["error"] = None

            return result

        except Exception as e:
            logger.error(f"NL query failed: {e}")
            return {
                "sql": None,
                "answer": f"Query failed: {str(e)}",
                "chart_spec": None,
                "data": None,
                "columns": None,
                "row_count": None,
                "error": str(e),
            }

    async def _fallback_query(
        self,
        question: str,
        dataset_view_name: str
    ) -> Dict[str, Any]:
        """Simple fallback when LLM is not available."""
        # Very basic keyword matching for common queries
        q_lower = question.lower()

        if "top" in q_lower or "highest" in q_lower or "max" in q_lower:
            return {
                "sql": f"SELECT * FROM {dataset_view_name} ORDER BY 1 DESC LIMIT 10",
                "answer": "Showing top 10 rows (fallback query - install OpenAI or Ollama for full NL→SQL)",
                "chart_spec": None,
                "data": None,
                "columns": None,
                "row_count": None,
                "error": None,
            }
        elif "count" in q_lower or "how many" in q_lower:
            return {
                "sql": f"SELECT COUNT(*) as count FROM {dataset_view_name}",
                "answer": "Count of all rows",
                "chart_spec": None,
                "data": None,
                "columns": None,
                "row_count": None,
                "error": None,
            }
        else:
            return {
                "sql": f"SELECT * FROM {dataset_view_name} LIMIT 10",
                "answer": "Showing first 10 rows (fallback query)",
                "chart_spec": None,
                "data": None,
                "columns": None,
                "row_count": None,
                "error": None,
            }

    def _parse_llm_response(self, content: str) -> Dict[str, Any]:
        """Parse LLM response to extract JSON."""
        import re

        # Try to find JSON block
        json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try to parse entire content as JSON
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        # Fallback: return as plain text
        return {
            "sql": None,
            "answer": content,
            "chart_spec": None,
        }

    async def _fallback_query(
        self,
        question: str,
        dataset_view_name: str
    ) -> Dict[str, Any]:
        """Simple fallback when LLM is not available."""
        # Very basic keyword matching for common queries
        q_lower = question.lower()

        if "top" in q_lower or "highest" in q_lower or "max" in q_lower:
            return {
                "sql": f"SELECT * FROM {dataset_view_name} ORDER BY 1 DESC LIMIT 10",
                "answer": "Showing top 10 rows (fallback query - install OpenAI or Ollama for full NL→SQL)",
                "chart_spec": None,
            }
        elif "count" in q_lower or "how many" in q_lower:
            return {
                "sql": f"SELECT COUNT(*) as count FROM {dataset_view_name}",
                "answer": "Count of all rows",
                "chart_spec": None,
            }
        else:
            return {
                "sql": f"SELECT * FROM {dataset_view_name} LIMIT 10",
                "answer": "Showing first 10 rows (fallback query)",
                "chart_spec": None,
            }


# Lazy initialization - will be created on first use
_nl_query_service = None


def get_nl_query_service() -> NLQueryService:
    """Get or create the NL query service instance."""
    global _nl_query_service
    if _nl_query_service is None:
        _nl_query_service = NLQueryService()
    return _nl_query_service