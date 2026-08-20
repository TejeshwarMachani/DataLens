from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models import Dashboard, DashboardItem, Chart, Dataset
from app.schemas import Dashboard as DashboardSchema, DashboardCreate, DashboardUpdate, DashboardList, DashboardItem as DashboardItemSchema, DashboardItemCreate, DashboardItemUpdate, ShareCreate
from app.core.security import get_user_id_from_token

router = APIRouter()


@router.post("/dashboards", response_model=DashboardSchema, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    dashboard: DashboardCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Create a new dashboard."""
    db_dashboard = Dashboard(
        owner_id=user_id,
        name=dashboard.name,
        description=dashboard.description,
        layout_json=dashboard.layout_json.model_dump() if hasattr(dashboard.layout_json, 'model_dump') else dashboard.layout_json,
        is_public=dashboard.is_public,
    )
    db.add(db_dashboard)
    await db.commit()
    await db.refresh(db_dashboard)

    # Create dashboard items
    for item in dashboard.layout_json.get("items", []):
        db_item = DashboardItem(
            dashboard_id=db_dashboard.id,
            chart_id=item.get("chart_id"),
            item_type=item.get("item_type", "chart"),
            config_json=item,
            order=item.get("order", 0),
        )
        db.add(db_item)

    await db.commit()
    await db.refresh(db_dashboard)

    return db_dashboard


@router.get("/dashboards", response_model=DashboardList)
async def list_dashboards(
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """List user's dashboards."""
    query = select(Dashboard).where(Dashboard.owner_id == user_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    result = await db.execute(
        query.order_by(Dashboard.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    dashboards = result.scalars().all()

    return DashboardList(items=dashboards, total=total, page=page, page_size=page_size)


@router.get("/dashboards/{dashboard_id}", response_model=DashboardSchema)
async def get_dashboard(
    dashboard_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Get a dashboard with all its items."""
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.owner_id == user_id)
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    # Load items
    items_result = await db.execute(
        select(DashboardItem).where(DashboardItem.dashboard_id == dashboard_id).order_by(DashboardItem.order)
    )
    items = items_result.scalars().all()
    dashboard.items = items

    return dashboard


@router.get("/dashboards/share/{token}", response_model=DashboardSchema)
async def get_shared_dashboard(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a public/shared dashboard by token."""
    result = await db.execute(
        select(Dashboard).where(Dashboard.share_token == token, Dashboard.is_public == True)
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found or not shared")

    # Load items
    items_result = await db.execute(
        select(DashboardItem).where(DashboardItem.dashboard_id == dashboard.id).order_by(DashboardItem.order)
    )
    items = items_result.scalars().all()
    dashboard.items = items

    return dashboard


@router.put("/dashboards/{dashboard_id}", response_model=DashboardSchema)
async def update_dashboard(
    dashboard_id: UUID,
    dashboard_update: DashboardUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Update a dashboard."""
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.owner_id == user_id)
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    update_data = dashboard_update.model_dump(exclude_unset=True)

    if "layout_json" in update_data and hasattr(update_data["layout_json"], "model_dump"):
        update_data["layout_json"] = update_data["layout_json"].model_dump()

    for field, value in update_data.items():
        setattr(dashboard, field, value)

    dashboard.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(dashboard)

    return dashboard


@router.delete("/dashboards/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dashboard_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Delete a dashboard."""
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.owner_id == user_id)
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    await db.delete(dashboard)
    await db.commit()


@router.post("/dashboards/{dashboard_id}/share", response_model=dict)
async def create_share_token(
    dashboard_id: UUID,
    share: ShareCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Generate a share token for a dashboard."""
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.owner_id == user_id)
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    import secrets
    dashboard.is_public = True
    dashboard.share_token = secrets.token_urlsafe(32)
    dashboard.updated_at = datetime.utcnow()

    await db.commit()

    return {
        "share_token": dashboard.share_token,
        "share_url": f"/dashboards/share/{dashboard.share_token}",
    }


@router.delete("/dashboards/{dashboard_id}/share")
async def remove_share_token(
    dashboard_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Remove share token (make dashboard private)."""
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.owner_id == user_id)
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    dashboard.is_public = False
    dashboard.share_token = None
    dashboard.updated_at = datetime.utcnow()

    await db.commit()

    return {"message": "Share link removed"}


@router.post("/dashboards/{dashboard_id}/items", response_model=DashboardItemSchema)
async def add_dashboard_item(
    dashboard_id: UUID,
    item: DashboardItemCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Add an item to a dashboard."""
    # Verify ownership
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.owner_id == user_id)
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    db_item = DashboardItem(
        dashboard_id=dashboard_id,
        chart_id=item.chart_id,
        item_type=item.item_type,
        config_json=item.config_json.model_dump() if hasattr(item.config_json, 'model_dump') else item.config_json,
        order=item.order,
    )
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)

    return db_item


@router.put("/dashboards/{dashboard_id}/items/{item_id}", response_model=DashboardItemSchema)
async def update_dashboard_item(
    dashboard_id: UUID,
    item_id: UUID,
    item_update: DashboardItemUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Update a dashboard item."""
    # Verify ownership
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.owner_id == user_id)
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    result = await db.execute(
        select(DashboardItem).where(DashboardItem.id == item_id, DashboardItem.dashboard_id == dashboard_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = item_update.model_dump(exclude_unset=True)

    if "config_json" in update_data and hasattr(update_data["config_json"], "model_dump"):
        update_data["config_json"] = update_data["config_json"].model_dump()

    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)

    return item


@router.delete("/dashboards/{dashboard_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard_item(
    dashboard_id: UUID,
    item_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_user_id_from_token),
):
    """Delete a dashboard item."""
    result = await db.execute(
        select(Dashboard).where(Dashboard.id == dashboard_id, Dashboard.owner_id == user_id)
    )
    dashboard = result.scalar_one_or_none()

    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    result = await db.execute(
        select(DashboardItem).where(DashboardItem.id == item_id, DashboardItem.dashboard_id == dashboard_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    await db.delete(item)
    await db.commit()