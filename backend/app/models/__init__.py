import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, BigInteger, Enum as SQLEnum, JSON, UUID as SQLUUID, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase
from sqlalchemy.dialects.postgresql import UUID as PGUUID
import enum

from app.db.database import Base


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class DatasetStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROFILING = "profiling"
    READY = "ready"
    ERROR = "error"


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)  # csv, xlsx, parquet, json
    rows: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    columns: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    duckdb_view_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    status: Mapped[DatasetStatus] = mapped_column(
        SQLEnum(DatasetStatus),
        default=DatasetStatus.UPLOADED,
        nullable=False
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    column_info: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="datasets")
    profile: Mapped[Optional["Profile"]] = relationship("Profile", back_populates="dataset", uselist=False, cascade="all, delete-orphan")
    charts: Mapped[List["Chart"]] = relationship("Chart", back_populates="dataset", cascade="all, delete-orphan")
    column_embeddings: Mapped[List["ColumnEmbedding"]] = relationship("ColumnEmbedding", back_populates="dataset", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole),
        default=UserRole.USER,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    datasets: Mapped[List["Dataset"]] = relationship("Dataset", back_populates="user", cascade="all, delete-orphan")
    charts: Mapped[List["Chart"]] = relationship("Chart", back_populates="user", cascade="all, delete-orphan")
    dashboards: Mapped[List["Dashboard"]] = relationship("Dashboard", back_populates="owner", cascade="all, delete-orphan")
    shares: Mapped[List["Share"]] = relationship("Share", back_populates="owner", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    profile_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    html_report_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="profile")


class ChartType(str, enum.Enum):
    BAR = "bar"
    LINE = "line"
    SCATTER = "scatter"
    HISTOGRAM = "histogram"
    BOX = "box"
    HEATMAP = "heatmap"
    PIE = "pie"
    AREA = "area"
    VIOLIN = "violin"
    TABLE = "table"


class Chart(Base):
    __tablename__ = "charts"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    spec_json: Mapped[dict] = mapped_column(JSON, nullable=False)  # Vega-Lite inspired spec
    plotly_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # Cached Plotly output
    chart_type: Mapped[ChartType] = mapped_column(SQLEnum(ChartType), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="charts")
    user: Mapped["User"] = relationship("User", back_populates="charts")
    dashboard_items: Mapped[List["DashboardItem"]] = relationship("DashboardItem", back_populates="chart", cascade="all, delete-orphan")


class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    layout_json: Mapped[dict] = mapped_column(JSON, nullable=False)  # react-grid-layout layout
    is_public: Mapped[bool] = mapped_column(default=False, nullable=False)
    share_token: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="dashboards")
    items: Mapped[List["DashboardItem"]] = relationship("DashboardItem", back_populates="dashboard", cascade="all, delete-orphan", order_by="DashboardItem.order")

    @property
    def item_count(self) -> int:
        return len(self.items) if self.items else 0

    @property
    def is_shared(self) -> bool:
        return self.is_public


class DashboardItemType(str, enum.Enum):
    CHART = "chart"
    TEXT = "text"
    FILTER = "filter"
    KPI = "kpi"


class DashboardItem(Base):
    __tablename__ = "dashboard_items"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("dashboards.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    chart_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("charts.id", ondelete="SET NULL"),
        nullable=True
    )
    item_type: Mapped[DashboardItemType] = mapped_column(SQLEnum(DashboardItemType), nullable=False)
    config_json: Mapped[dict] = mapped_column(JSON, nullable=False)  # position, size, props
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    dashboard: Mapped["Dashboard"] = relationship("Dashboard", back_populates="items")
    chart: Mapped[Optional["Chart"]] = relationship("Chart", back_populates="dashboard_items")


class Share(Base):
    __tablename__ = "shares"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("dashboards.id", ondelete="CASCADE"),
        nullable=False
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="shares")


class NLQueryHistory(Base):
    __tablename__ = "nl_query_history"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    sql_query: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="success")  # success, error
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model: Mapped[str] = mapped_column(String(100), nullable=False)  # openai, ollama
    row_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    execution_time_ms: Mapped[Optional[float]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    dataset: Mapped["Dataset"] = relationship("Dataset")
    user: Mapped["User"] = relationship("User")


class ColumnEmbedding(Base):
    __tablename__ = "column_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    column_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding: Mapped[List[float]] = mapped_column(JSON, nullable=False)  # Store as JSON array, pgvector handles via custom type
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="column_embeddings")

    __table_args__ = (
        Index('ix_column_embeddings_dataset_column', 'dataset_id', 'column_name', unique=True),
    )