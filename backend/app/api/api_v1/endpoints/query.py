from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models import Dataset
from app.schemas import QueryRequest, QueryResponse
from app.core.security import get_user_id_from_token
from app.services.query_engine import execute_sql

router = APIRouter()


class QueryExecuteRequest(BaseModel):
    sql: str
    dataset_id: UUID
    limit: int = 10000
    offset: int = 0


@router.post("/query", response_model=QueryResponse)
async def execute_query_endpoint(
    request: QueryExecuteRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Execute a SQL query on a dataset."""
    # Verify dataset ownership
    result = await db.execute(
        select(Dataset).where(Dataset.id == request.dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if dataset.status != "ready":
        raise HTTPException(status_code=400, detail="Dataset not ready for querying")

    try:
        import time
        start = time.time()

        data, columns, row_count, truncated = await execute_sql(
            request.sql,
            limit=request.limit,
            offset=request.offset
        )

        execution_time_ms = (time.time() - start) * 1000

        return QueryResponse(
            columns=columns,
            rows=[[row.get(col) for col in columns] for row in data],
            row_count=row_count,
            truncated=truncated,
            sql=request.sql,
            execution_time_ms=execution_time_ms,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")


@router.get("/datasets/{dataset_id}/schema")
async def get_dataset_schema(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Get schema information for a dataset."""
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    from app.services.query_engine import get_dataset_schema as svc_get_schema
    schema = await svc_get_schema(dataset.duckdb_view_name)
    return schema


@router.get("/datasets/{dataset_id}/sample")
async def get_sample_data(
    dataset_id: UUID,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Get sample rows from a dataset."""
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    from app.services.query_engine import get_sample_data as svc_get_sample
    data = await svc_get_sample(dataset.duckdb_view_name, limit)
    return {"data": data}