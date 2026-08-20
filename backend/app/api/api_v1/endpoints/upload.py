import os
import uuid
from uuid import UUID
import shutil
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models import User, Dataset
from app.schemas import Dataset as DatasetSchema, UploadResponse
from app.core.security import get_user_id_from_token
from app.core.config import settings
from app.services.uploader import process_upload

router = APIRouter()


ALLOWED_MIME_TYPES = {
    "text/csv": ".csv",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/parquet": ".parquet",
    "application/json": ".json",
    "text/plain": ".txt",  # for CSV without proper mime
}


def get_file_extension(mime_type: str, filename: str) -> str:
    """Get file extension from mime type or filename."""
    if mime_type in ALLOWED_MIME_TYPES:
        return ALLOWED_MIME_TYPES[mime_type]
    # Fallback to filename extension
    ext = Path(filename).suffix.lower()
    if ext in [".csv", ".xls", ".xlsx", ".parquet", ".json"]:
        return ext
    return ""


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """
    Upload a CSV, Excel, Parquet, or JSON file.
    """
    # Validate file type
    ext = get_file_extension(file.content_type or "", file.filename or "")
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Allowed: CSV, Excel, Parquet, JSON"
        )

    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / (1024*1024):.0f}MB"
        )

    # Generate unique filename
    dataset_id = uuid.uuid4()
    safe_filename = f"{dataset_id}{ext}"
    file_path = Path(settings.UPLOAD_DIR) / safe_filename

    # Ensure upload directory exists
    file_path.parent.mkdir(parents=True, exist_ok=True)

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    # Create dataset record
    dataset = Dataset(
        id=dataset_id,
        user_id=user_id,
        name=file.filename or f"dataset_{dataset_id}",
        filename=file.filename or safe_filename,
        file_path=str(file_path),
        file_type=ext[1:],  # Remove leading dot
        size_bytes=file_size,
        duckdb_view_name=f"dataset_{dataset_id.hex[:8]}",
        status="uploaded",
    )
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)

    # Process in background: infer schema, register in DuckDB, create profile
    background_tasks.add_task(process_upload, dataset_id, str(file_path), ext)

    return UploadResponse(
        dataset_id=dataset_id,
        filename=file.filename or safe_filename,
        status="uploaded",
        message="File uploaded successfully. Processing in background."
    )


async def process_upload(dataset_id: uuid.UUID, file_path: str, ext: str):
    """Background task to process uploaded file."""
    from app.db.session import async_session_maker
    from app.services.uploader import process_upload as svc_process_upload

    async with async_session_maker() as db:
        await svc_process_upload(db, dataset_id, file_path, ext)