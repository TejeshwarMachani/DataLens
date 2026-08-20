from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
import time

from app.db.session import get_db
from app.models import Dataset, NLQueryHistory
from app.schemas import NLQueryRequest, NLQueryResponse, NLQueryHistory as NLQueryHistorySchema
from app.core.security import get_user_id_from_token
from app.services.nl_query import get_nl_query_service

router = APIRouter()


@router.post("/nl-query", response_model=NLQueryResponse)
async def nl_query_endpoint(
    request: NLQueryRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Process a natural language query and return SQL + results."""
    # Verify dataset ownership
    result = await db.execute(
        select(Dataset).where(Dataset.id == request.dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if dataset.status != "ready":
        raise HTTPException(status_code=400, detail="Dataset not ready for querying")

    start_time = time.time()
    model_used = request.model or ("openai" if get_nl_query_service().llm else "fallback")

    try:
        result = await get_nl_query_service().query(
            question=request.question,
            dataset_view_name=dataset.duckdb_view_name,
            dataset_id=dataset.id,
            chart_suggestion=request.chart_suggestion,
        )

        execution_time_ms = (time.time() - start_time) * 1000

        # Save to history
        history = NLQueryHistory(
            dataset_id=dataset.id,
            user_id=user_id,
            question=request.question,
            sql_query=result.get("sql"),
            answer=result.get("answer"),
            status="success" if result.get("sql") else "error",
            error_message=result.get("error"),
            model=model_used,
            row_count=result.get("row_count"),
            execution_time_ms=execution_time_ms,
        )
        db.add(history)
        await db.commit()

        return NLQueryResponse(
            answer=result["answer"],
            sql=result.get("sql"),
            chart_spec=result.get("chart_spec"),
            data=result.get("data"),
            columns=result.get("columns"),
            confidence=0.8,  # Placeholder
            explanation=result.get("answer"),
            status="success",
            model=model_used,
            row_count=result.get("row_count"),
            execution_time_ms=execution_time_ms,
        )
    except Exception as e:
        execution_time_ms = (time.time() - start_time) * 1000

        # Save error to history
        history = NLQueryHistory(
            dataset_id=dataset.id,
            user_id=user_id,
            question=request.question,
            sql_query=None,
            answer=None,
            status="error",
            error_message=str(e),
            model=model_used,
            execution_time_ms=execution_time_ms,
        )
        db.add(history)
        await db.commit()

        raise HTTPException(status_code=500, detail=f"NL query failed: {str(e)}")


@router.get("/nl-query/history", response_model=NLQueryHistorySchema)
async def get_nl_query_history(
    dataset_id: UUID,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Get NL query history for a dataset."""
    # Verify dataset ownership
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Get total count
    count_result = await db.execute(
        select(func.count()).select_from(
            select(NLQueryHistory).where(NLQueryHistory.dataset_id == dataset_id).subquery()
        )
    )
    total = count_result.scalar()

    # Get paginated results
    result = await db.execute(
        select(NLQueryHistory)
        .where(NLQueryHistory.dataset_id == dataset_id)
        .order_by(NLQueryHistory.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = result.scalars().all()

    return NLQueryHistorySchema(items=items, total=total, page=page, page_size=page_size)