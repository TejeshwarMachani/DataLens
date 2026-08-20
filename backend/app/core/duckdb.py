import duckdb
import os
from contextlib import contextmanager
from threading import Lock
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

_duckdb_pool = None
_pool_lock = Lock()


def get_duckdb_pool():
    """Get or create DuckDB connection pool."""
    global _duckdb_pool
    if _duckdb_pool is None:
        with _pool_lock:
            if _duckdb_pool is None:
                # Ensure DuckDB directory exists
                os.makedirs(os.path.dirname(settings.DUCKDB_PATH), exist_ok=True)
                _duckdb_pool = duckdb.connect(settings.DUCKDB_PATH)
                # Enable extensions
                _duckdb_pool.execute("INSTALL httpfs; LOAD httpfs;")
                _duckdb_pool.execute("INSTALL parquet; LOAD parquet;")
                _duckdb_pool.execute("INSTALL json; LOAD json;")
                logger.info(f"DuckDB initialized at {settings.DUCKDB_PATH}")
    return _duckdb_pool


@contextmanager
def get_duckdb_conn():
    """Context manager for DuckDB connections."""
    conn = get_duckdb_pool()
    try:
        yield conn
    except Exception as e:
        logger.error(f"DuckDB error: {e}")
        raise


def register_dataset(conn: duckdb.DuckDBPyConnection, table_name: str, file_path: str) -> bool:
    """Register a dataset file as a DuckDB view."""
    try:
        ext = os.path.splitext(file_path)[1].lower()

        if ext == '.csv':
            conn.execute(f"CREATE OR REPLACE VIEW {table_name} AS SELECT * FROM read_csv_auto('{file_path}')")
        elif ext == '.parquet':
            conn.execute(f"CREATE OR REPLACE VIEW {table_name} AS SELECT * FROM read_parquet('{file_path}')")
        elif ext in ['.xlsx', '.xls']:
            conn.execute(f"CREATE OR REPLACE VIEW {table_name} AS SELECT * FROM read_excel('{file_path}')")
        elif ext == '.json':
            conn.execute(f"CREATE OR REPLACE VIEW {table_name} AS SELECT * FROM read_json_auto('{file_path}')")
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        logger.info(f"Registered dataset as view: {table_name}")
        return True
    except Exception as e:
        logger.error(f"Failed to register dataset {file_path}: {e}")
        return False


def execute_query(conn: duckdb.DuckDBPyConnection, sql: str, limit: int = 10000):
    """Execute a read-only query with safety limits."""
    # Add LIMIT if not present
    sql_lower = sql.lower().strip()
    if 'limit' not in sql_lower and not sql_lower.endswith(';'):
        sql = f"{sql} LIMIT {limit}"
    elif 'limit' not in sql_lower and sql_lower.endswith(';'):
        sql = sql[:-1] + f" LIMIT {limit};"

    return conn.execute(sql).fetchall()


def get_table_schema(conn: duckdb.DuckDBPyConnection, table_name: str) -> dict:
    """Get schema info for a table/view."""
    result = conn.execute(f"DESCRIBE {table_name}").fetchall()
    columns = []
    for row in result:
        columns.append({
            "name": row[0],
            "type": row[1],
            "null": row[2] == "YES",
            "key": row[3],
            "default": row[4],
            "extra": row[5]
        })
    return {"columns": columns}


def get_sample_data(conn: duckdb.DuckDBPyConnection, table_name: str, limit: int = 5) -> list:
    """Get sample rows from a table."""
    return conn.execute(f"SELECT * FROM {table_name} LIMIT {limit}").fetchall()


def close_duckdb():
    """Close DuckDB connection pool."""
    global _duckdb_pool
    if _duckdb_pool:
        _duckdb_pool.close()
        _duckdb_pool = None