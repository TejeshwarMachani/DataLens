import os
import uuid
import pandas as pd
import duckdb
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Dataset, DatasetStatus
from app.core.duckdb import get_duckdb_conn, register_dataset, get_table_schema, get_sample_data
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


async def process_upload(db: AsyncSession, dataset_id: uuid.UUID, file_path: str, ext: str):
    """
    Process uploaded file:
    1. Read with pandas to infer schema
    2. Register in DuckDB
    3. Update dataset with row/column counts and schema info
    4. Trigger profiling (optional)
    """
    try:
        # Update status to profiling
        result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
        dataset = result.scalar_one_or_none()
        if not dataset:
            logger.error(f"Dataset {dataset_id} not found")
            return

        dataset.status = DatasetStatus.PROFILING
        await db.commit()

        # Read with pandas to infer schema and get row count
        df = _read_file(file_path, ext)
        if df is None:
            dataset.status = DatasetStatus.ERROR
            dataset.error_message = "Failed to read file"
            await db.commit()
            return

        # Get row/column counts
        rows = len(df)
        columns = len(df.columns)

        # Build column info
        column_info = {}
        for col in df.columns:
            dtype = str(df[col].dtype)
            col_type = _infer_column_type(df[col])
            missing_count = int(df[col].isna().sum())
            missing_pct = missing_count / rows * 100 if rows > 0 else 0

            # Get sample values (non-null)
            sample_values = df[col].dropna().head(5).tolist()

            column_info[col] = {
                "dtype": dtype,
                "type": col_type,
                "missing_count": missing_count,
                "missing_pct": round(missing_pct, 2),
                "unique_count": int(df[col].nunique()),
                "sample_values": sample_values,
            }

        # Register in DuckDB
        with get_duckdb_conn() as conn:
            success = register_dataset(conn, dataset.duckdb_view_name, file_path)
            if not success:
                dataset.status = DatasetStatus.ERROR
                dataset.error_message = "Failed to register in DuckDB"
                await db.commit()
                return

        # Update dataset
        dataset.rows = rows
        dataset.columns = columns
        dataset.column_info = column_info
        dataset.status = DatasetStatus.READY
        await db.commit()

        # Generate column embeddings for NL->SQL (optional, can be done later)
        # await generate_column_embeddings(db, dataset_id, column_info)

        logger.info(f"Processed dataset {dataset_id}: {rows} rows, {columns} columns")

    except Exception as e:
        logger.error(f"Error processing upload {dataset_id}: {e}", exc_info=True)
        # Update dataset with error
        result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
        dataset = result.scalar_one_or_none()
        if dataset:
            dataset.status = DatasetStatus.ERROR
            dataset.error_message = str(e)
            await db.commit()


def _read_file(file_path: str, ext: str) -> Optional[pd.DataFrame]:
    """Read file with pandas based on extension."""
    try:
        if ext == ".csv":
            return pd.read_csv(file_path, low_memory=False)
        elif ext in [".xls", ".xlsx"]:
            return pd.read_excel(file_path)
        elif ext == ".parquet":
            return pd.read_parquet(file_path)
        elif ext == ".json":
            return pd.read_json(file_path)
        else:
            return None
    except Exception as e:
        logger.error(f"Failed to read {file_path}: {e}")
        return None


def _infer_column_type(series: pd.Series) -> str:
    """Infer semantic column type from pandas series."""
    dtype = series.dtype

    if pd.api.types.is_numeric_dtype(dtype):
        # Check if it's likely an ID (high cardinality, integer)
        if pd.api.types.is_integer_dtype(dtype):
            unique_ratio = series.nunique() / len(series) if len(series) > 0 else 0
            if unique_ratio > 0.9:
                return "identifier"
        return "numeric"

    elif pd.api.types.is_datetime64_any_dtype(dtype):
        return "datetime"

    elif pd.api.types.is_bool_dtype(dtype):
        return "boolean"

    elif pd.api.types.is_categorical_dtype(dtype) or pd.api.types.is_object_dtype(dtype):
        unique_ratio = series.nunique() / len(series) if len(series) > 0 else 0
        if unique_ratio > 0.9:
            return "identifier"
        elif unique_ratio < 0.05:
            return "categorical"
        else:
            return "text"

    return "unknown"