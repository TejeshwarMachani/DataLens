import duckdb
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from app.core.duckdb import get_duckdb_conn, execute_query, get_table_schema
import logging

logger = logging.getLogger(__name__)


async def execute_sql(
    sql: str,
    limit: int = 10000,
    offset: int = 0
) -> Tuple[List[Dict[str, Any]], List[str], int, bool]:
    """
    Execute a SQL query on DuckDB.
    Returns: (rows, columns, total_count, truncated)
    """
    try:
        with get_duckdb_conn() as conn:
            # First, get total count without limit
            count_sql = f"SELECT COUNT(*) FROM ({sql}) AS subq"
            total_count = conn.execute(count_sql).fetchone()[0]

            # Apply limit and offset
            if 'limit' not in sql.lower():
                sql = f"{sql.rstrip(';')} LIMIT {limit}"
            if offset > 0:
                sql = f"{sql} OFFSET {offset}"

            result = conn.execute(sql)
            columns = [desc[0] for desc in result.description] if result.description else []
            rows = result.fetchall()

            # Convert to list of dicts
            data = [dict(zip(columns, row)) for row in rows]

            truncated = total_count > limit

            return data, columns, total_count, truncated

    except duckdb.CatalogException as e:
        logger.error(f"Table not found: {e}")
        raise ValueError(f"Table/view not found: {e}")
    except duckdb.ParserException as e:
        logger.error(f"SQL syntax error: {e}")
        raise ValueError(f"SQL syntax error: {e}")
    except Exception as e:
        logger.error(f"Query execution error: {e}")
        raise


async def execute_pandas(
    sql: str,
    limit: int = 10000
) -> Tuple[List[Dict[str, Any]], List[str], int, bool]:
    """
    Execute SQL and return as pandas DataFrame, then convert to dict.
    Useful for complex operations that need pandas.
    """
    try:
        with get_duckdb_conn() as conn:
            df = conn.execute(sql).fetchdf()

        total_count = len(df)
        if limit and total_count > limit:
            df = df.head(limit)
            truncated = True
        else:
            truncated = False

        columns = df.columns.tolist()
        data = df.to_dict(orient="records")

        return data, columns, total_count, truncated

    except Exception as e:
        logger.error(f"Pandas query execution error: {e}")
        raise


async def get_dataset_schema(dataset_view_name: str) -> Dict[str, Any]:
    """Get schema information for a dataset view."""
    try:
        with get_duckdb_conn() as conn:
            schema = get_table_schema(conn, dataset_view_name)
            return schema
    except Exception as e:
        logger.error(f"Error getting schema for {dataset_view_name}: {e}")
        raise


async def get_sample_data(dataset_view_name: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Get sample rows from a dataset."""
    try:
        with get_duckdb_conn() as conn:
            df = conn.execute(f"SELECT * FROM {dataset_view_name} LIMIT {limit}").fetchdf()
            return df.to_dict(orient="records")
    except Exception as e:
        logger.error(f"Error getting sample data: {e}")
        raise


async def list_datasets_views() -> List[str]:
    """List all DuckDB views (datasets)."""
    try:
        with get_duckdb_conn() as conn:
            result = conn.execute("SHOW TABLES").fetchall()
            return [row[0] for row in result]
    except Exception as e:
        logger.error(f"Error listing datasets: {e}")
        return []


async def drop_view(view_name: str) -> bool:
    """Drop a DuckDB view."""
    try:
        with get_duckdb_conn() as conn:
            conn.execute(f"DROP VIEW IF EXISTS {view_name}")
        return True
    except Exception as e:
        logger.error(f"Error dropping view {view_name}: {e}")
        return False


async def get_column_stats(dataset_view_name: str, column: str) -> Dict[str, Any]:
    """Get statistics for a specific column."""
    try:
        with get_duckdb_conn() as conn:
            # Get basic stats
            stats_sql = f"""
            SELECT
                COUNT(*) as total,
                COUNT({column}) as non_null,
                COUNT(DISTINCT {column}) as unique,
                MIN({column}) as min_val,
                MAX({column}) as max_val
            FROM {dataset_view_name}
            """
            result = conn.execute(stats_sql).fetchone()
            total, non_null, unique, min_val, max_val = result

            stats = {
                "total": total,
                "non_null": non_null,
                "null_count": total - non_null,
                "null_pct": round((total - non_null) / total * 100, 2) if total > 0 else 0,
                "unique": unique,
                "min": min_val,
                "max": max_val,
            }

            # Get value counts for categorical columns (top 20)
            try:
                vc_sql = f"""
                SELECT {column}, COUNT(*) as count
                FROM {dataset_view_name}
                WHERE {column} IS NOT NULL
                GROUP BY {column}
                ORDER BY count DESC
                LIMIT 20
                """
                vc_result = conn.execute(vc_sql).fetchall()
                stats["value_counts"] = [{"value": str(row[0]), "count": row[1]} for row in vc_result]
            except:
                stats["value_counts"] = []

            return stats

    except Exception as e:
        logger.error(f"Error getting column stats: {e}")
        raise