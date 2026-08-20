from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func

from app.db.session import get_db
from app.models import Chart, Dataset
from app.schemas import (
    Chart as ChartSchema,
    ChartCreate,
    ChartUpdate,
    ChartList,
    ChartRenderRequest,
    ChartRenderResponse,
    ChartSpec,
)
from app.core.security import get_user_id_from_token
from app.services.chart_engine import chart_engine
from app.services.query_engine import execute_sql

router = APIRouter()


@router.post("/charts", response_model=ChartSchema, status_code=status.HTTP_201_CREATED)
async def create_chart(
    chart: ChartCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Create a new chart."""
    # Verify dataset ownership
    result = await db.execute(
        select(Dataset).where(Dataset.id == chart.dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    db_chart = Chart(
        dataset_id=chart.dataset_id,
        user_id=user_id,
        name=chart.name,
        spec_json=chart.spec_json.model_dump() if hasattr(chart.spec_json, 'model_dump') else chart.spec_json,
        chart_type=chart.chart_type,
        description=chart.description,
    )
    db.add(db_chart)
    await db.commit()
    await db.refresh(db_chart)

    return db_chart


@router.get("/charts", response_model=ChartList)
async def list_charts(
    dataset_id: UUID = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """List charts for the current user, optionally filtered by dataset."""
    from sqlalchemy import func

    query = select(Chart).where(Chart.user_id == user_id)

    if dataset_id:
        query = query.where(Chart.dataset_id == dataset_id)

    # Total count
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    # Paginated results
    result = await db.execute(
        query.order_by(Chart.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    charts = result.scalars().all()

    return ChartList(items=charts, total=total, page=page, page_size=page_size)


@router.get("/charts/{chart_id}", response_model=ChartSchema)
async def get_chart(
    chart_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Get a chart by ID."""
    result = await db.execute(
        select(Chart).where(Chart.id == chart_id, Chart.user_id == user_id)
    )
    chart = result.scalar_one_or_none()

    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    return chart


@router.put("/charts/{chart_id}", response_model=ChartSchema)
async def update_chart(
    chart_id: UUID,
    chart_update: ChartUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Update a chart."""
    result = await db.execute(
        select(Chart).where(Chart.id == chart_id, Chart.user_id == user_id)
    )
    chart = result.scalar_one_or_none()

    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    update_data = chart_update.model_dump(exclude_unset=True)
    if "spec_json" in update_data and hasattr(update_data["spec_json"], "model_dump"):
        update_data["spec_json"] = update_data["spec_json"].model_dump()

    for field, value in update_data.items():
        setattr(chart, field, value)

    await db.commit()
    await db.refresh(chart)

    return chart


@router.delete("/charts/{chart_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chart(
    chart_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Delete a chart."""
    result = await db.execute(
        select(Chart).where(Chart.id == chart_id, Chart.user_id == user_id)
    )
    chart = result.scalar_one_or_none()

    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    await db.delete(chart)
    await db.commit()


@router.post("/charts/{chart_id}/render", response_model=ChartRenderResponse)
async def render_chart(
    chart_id: UUID,
    request: ChartRenderRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Render a chart spec to Plotly JSON with data."""
    # Get chart
    result = await db.execute(
        select(Chart).where(Chart.id == chart_id, Chart.user_id == user_id)
    )
    chart = result.scalar_one_or_none()

    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    # Verify dataset access
    dataset_result = await db.execute(
        select(Dataset).where(Dataset.id == chart.dataset_id, Dataset.user_id == user_id)
    )
    dataset = dataset_result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        # Execute SQL to get data
        spec = ChartSpec(**chart.spec_json) if isinstance(chart.spec_json, dict) else chart.spec_json

        # Build SQL from spec (simplified - in reality you'd use a proper compiler)
        sql = _build_sql_from_spec(spec, dataset.duckdb_view_name)

        data, columns, row_count, truncated = await execute_sql(sql, limit=request.limit)

        # Convert to Plotly
        plotly_json = chart_engine.spec_to_plotly(spec, data)

        return ChartRenderResponse(
            plotly_json=plotly_json,
            data=data,
            columns=columns,
            sql=sql,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chart rendering failed: {str(e)}")


@router.post("/charts/render", response_model=ChartRenderResponse)
async def render_chart_spec(
    request: ChartRenderRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Render a chart spec directly (without saving)."""
    # Verify dataset access
    dataset_result = await db.execute(
        select(Dataset).where(Dataset.id == request.dataset_id, Dataset.user_id == user_id)
    )
    dataset = dataset_result.scalar_one_or_none()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        # Build SQL from spec
        sql = _build_sql_from_spec(request.spec, dataset.duckdb_view_name)

        data, columns, row_count, truncated = await execute_sql(sql, limit=request.limit)

        # Convert to Plotly
        plotly_json = chart_engine.spec_to_plotly(request.spec, data)

        return ChartRenderResponse(
            plotly_json=plotly_json,
            data=data,
            columns=columns,
            sql=sql,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chart rendering failed: {str(e)}")


def _build_sql_from_spec(spec: ChartSpec, view_name: str) -> str:
    """Build a SQL query from a Vega-Lite inspired spec."""
    # This is a simplified version - a full implementation would be more complex
    fields = []

    for channel, field in spec.encoding.items():
        if field.field:
            if field.aggregate:
                fields.append(f"{field.aggregate}({field.field}) AS {channel}")
            else:
                fields.append(f"{field.field} AS {channel}")

    if not fields:
        fields = ["*"]

    sql = f"SELECT {', '.join(fields)} FROM {view_name}"

    # Add transforms if any
    if spec.transform:
        for t in spec.transform:
            if t.get("filter"):
                sql += f" WHERE {t['filter']}"

    sql += " LIMIT 10000"
    return sql