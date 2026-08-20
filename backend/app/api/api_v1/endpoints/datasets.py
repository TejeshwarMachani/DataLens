import os
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models import Dataset
from app.schemas import Dataset as DatasetSchema, DatasetList
from app.core.security import get_user_id_from_token

router = APIRouter()


@router.get("/datasets", response_model=DatasetList)
async def list_datasets(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """List user's datasets with pagination."""
    offset = (page - 1) * page_size

    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(select(Dataset).where(Dataset.user_id == user_id).subquery())
    )
    total = count_result.scalar()

    # Get paginated results
    result = await db.execute(
        select(Dataset)
        .where(Dataset.user_id == user_id)
        .order_by(Dataset.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    datasets = result.scalars().all()

    return DatasetList(
        items=datasets,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/datasets/{dataset_id}", response_model=DatasetSchema)
async def get_dataset(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Get dataset details."""
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return dataset


@router.delete("/datasets/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Delete a dataset and its file."""
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Delete file
    try:
        os.remove(dataset.file_path)
    except OSError:
        pass  # File might not exist

    # Delete from DuckDB
    from app.core.duckdb import get_duckdb_conn
    with get_duckdb_conn() as conn:
        conn.execute(f"DROP VIEW IF EXISTS {dataset.duckdb_view_name}")

    await db.delete(dataset)
    await db.commit()