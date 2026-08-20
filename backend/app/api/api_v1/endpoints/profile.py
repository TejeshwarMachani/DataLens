import uuid
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models import Dataset, Profile, DatasetStatus
from app.schemas import Profile as ProfileSchema, Dataset as DatasetSchema
from app.core.security import get_user_id_from_token
from app.services.profiler import profiler_service

router = APIRouter()


@router.post("/datasets/{dataset_id}/profile", response_model=ProfileSchema, status_code=status.HTTP_202_ACCEPTED)
async def generate_profile(
    dataset_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """
    Generate a profile report for a dataset.
    Runs in background for large datasets.
    """
    # Verify dataset ownership
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if dataset.status != DatasetStatus.READY:
        raise HTTPException(status_code=400, detail="Dataset not ready for profiling")

    # Check if profile already exists
    existing = await profiler_service.get_profile(dataset_id, db)
    if existing:
        return existing

    # Run profiling in background
    background_tasks.add_task(profiler_service.profile_dataset, dataset, db)

    # Return a placeholder or the in-progress status
    return ProfileSchema(
        id=uuid.uuid4(),
        dataset_id=dataset_id,
        profile_json={},
        html_report_path=None,
    )


@router.get("/datasets/{dataset_id}/profile", response_model=ProfileSchema)
async def get_profile(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Get the profile report for a dataset."""
    # Verify dataset ownership
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    profile = await profiler_service.get_profile(dataset_id, db)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Generate it first.")

    return profile


@router.get("/datasets/{dataset_id}/profile/html")
async def get_profile_html(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Serve the HTML profile report."""
    from fastapi.responses import FileResponse
    import os

    # Verify dataset ownership
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    profile = await profiler_service.get_profile(dataset_id, db)
    if not profile or not profile.html_report_path:
        raise HTTPException(status_code=404, detail="HTML report not found")

    if not os.path.exists(profile.html_report_path):
        raise HTTPException(status_code=404, detail="HTML report file missing")

    return FileResponse(
        profile.html_report_path,
        media_type="text/html",
        filename=f"profile_{dataset.name}.html"
    )


@router.get("/datasets/{dataset_id}/profile/summary")
async def get_profile_summary(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Get summary statistics from the profile."""
    # Verify dataset ownership
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    profile = await profiler_service.get_profile(dataset_id, db)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    summary = profiler_service.generate_summary_stats(profile.profile_json)
    return summary


@router.delete("/datasets/{dataset_id}/profile", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Delete the profile for a dataset."""
    # Verify dataset ownership
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    await profiler_service.delete_profile(dataset_id, db)