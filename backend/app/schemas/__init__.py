from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class UserInDBBase(UserBase):
    id: UUID
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class User(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    password_hash: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User



class TokenData(BaseModel):
    user_id: Optional[UUID] = None


# Dataset Schemas
class DatasetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class DatasetCreate(DatasetBase):
    pass


class DatasetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)


class DatasetInDBBase(DatasetBase):
    id: UUID
    user_id: UUID
    filename: str
    file_path: str
    file_type: str
    rows: Optional[int] = None
    columns: Optional[int] = None
    size_bytes: Optional[int] = None
    duckdb_view_name: str
    status: str
    error_message: Optional[str] = None
    column_info: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Dataset(DatasetInDBBase):
    pass


class DatasetWithProfile(Dataset):
    profile: Optional["Profile"] = None


class DatasetList(BaseModel):
    items: List[Dataset]
    total: int
    page: int
    page_size: int


# Profile Schemas
class ProfileBase(BaseModel):
    profile_json: Dict[str, Any]


class ProfileCreate(ProfileBase):
    dataset_id: UUID


class ProfileInDBBase(ProfileBase):
    id: UUID
    dataset_id: UUID
    html_report_path: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Profile(ProfileInDBBase):
    pass


# Chart Schemas
class ChartBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    spec_json: Dict[str, Any]
    chart_type: str
    description: Optional[str] = None


class ChartCreate(ChartBase):
    dataset_id: UUID


class ChartUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    spec_json: Optional[Dict[str, Any]] = None
    chart_type: Optional[str] = None
    description: Optional[str] = None


class ChartInDBBase(ChartBase):
    id: UUID
    dataset_id: UUID
    user_id: UUID
    plotly_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Chart(ChartInDBBase):
    pass


class ChartWithDataset(Chart):
    dataset: Optional[Dataset] = None


class ChartList(BaseModel):
    items: List[Chart]
    total: int
    page: int
    page_size: int


# Chart Spec (Vega-Lite inspired)
class EncodingField(BaseModel):
    field: str
    type: str  # quantitative, ordinal, nominal, temporal
    title: Optional[str] = None
    aggregate: Optional[str] = None  # sum, mean, count, min, max
    bin: Optional[bool] = None
    time_unit: Optional[str] = None  # year, month, day, etc.
    scale: Optional[Dict[str, Any]] = None
    sort: Optional[Dict[str, Any]] = None


class ChartSpec(BaseModel):
    mark: str  # bar, line, point, area, rect, arc, text
    encoding: Dict[str, EncodingField]  # x, y, color, size, facet, tooltip, etc.
    transform: Optional[List[Dict[str, Any]]] = None  # filter, calculate, aggregate, etc.
    width: Optional[int] = None
    height: Optional[int] = None
    title: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class ChartRenderRequest(BaseModel):
    spec: ChartSpec
    dataset_id: UUID
    limit: int = 10000


class ChartRenderResponse(BaseModel):
    plotly_json: Dict[str, Any]
    data: List[Dict[str, Any]]
    columns: List[str]
    sql: str


# Dashboard Schemas
class DashboardItemConfig(BaseModel):
    # For charts
    chart_id: Optional[UUID] = None
    # For text
    content: Optional[str] = None
    # For filters
    filter_column: Optional[str] = None
    filter_type: Optional[str] = None  # select, multi_select, date_range, number_range
    # For KPI
    metric: Optional[str] = None
    aggregation: Optional[str] = None
    format: Optional[str] = None
    # Layout
    x: int = 0
    y: int = 0
    w: int = 6
    h: int = 4
    min_w: Optional[int] = None
    min_h: Optional[int] = None
    max_w: Optional[int] = None
    max_h: Optional[int] = None


class DashboardItemBase(BaseModel):
    item_type: str  # chart, text, filter, kpi
    config_json: DashboardItemConfig
    order: int = 0


class DashboardItemCreate(DashboardItemBase):
    pass


class DashboardItemUpdate(BaseModel):
    item_type: Optional[str] = None
    config_json: Optional[DashboardItemConfig] = None
    order: Optional[int] = None


class DashboardItemInDBBase(DashboardItemBase):
    id: UUID
    dashboard_id: UUID
    chart_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)


class DashboardItem(DashboardItemInDBBase):
    pass


class DashboardBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    layout_json: Dict[str, List[DashboardItemConfig]]
    is_public: bool = False


class DashboardCreate(DashboardBase):
    pass


class DashboardUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    layout_json: Optional[Dict[str, List[DashboardItemConfig]]] = None
    is_public: Optional[bool] = None


class DashboardInDBBase(DashboardBase):
    id: UUID
    owner_id: UUID
    share_token: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Dashboard(DashboardInDBBase):
    items: List[DashboardItem] = []

    @property
    def item_count(self) -> int:
        return len(self.items) if self.items else 0

    @property
    def is_shared(self) -> bool:
        return self.is_public

    @property
    def description(self) -> Optional[str]:
        # Description can be stored in layout_json or as a separate field
        # For now return None - can be extended later
        return None


class DashboardWithItems(Dashboard):
    pass


class DashboardList(BaseModel):
    items: List[Dashboard]
    total: int
    page: int
    page_size: int


# Share Schemas
class ShareCreate(BaseModel):
    dashboard_id: UUID
    expires_at: Optional[datetime] = None


class ShareInDBBase(BaseModel):
    id: UUID
    owner_id: UUID
    dashboard_id: UUID
    token: str
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Share(ShareInDBBase):
    pass


# Query Schemas
class QueryRequest(BaseModel):
    sql: str = Field(..., min_length=1)
    dataset_id: UUID
    limit: int = 10000


class QueryResponse(BaseModel):
    columns: List[str]
    rows: List[List[Any]]
    row_count: int
    truncated: bool
    sql: str
    execution_time_ms: float


# NL Query Schemas
class NLQueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    dataset_id: UUID
    chart_suggestion: bool = True
    model: Optional[str] = None  # "openai" or "ollama"


class NLQueryResponse(BaseModel):
    answer: str
    sql: Optional[str] = None
    chart_spec: Optional[ChartSpec] = None
    data: Optional[List[Dict[str, Any]]] = None
    columns: Optional[List[str]] = None
    confidence: float
    explanation: Optional[str] = None
    status: str = "success"  # success, error
    error_message: Optional[str] = None
    model: Optional[str] = None
    row_count: Optional[int] = None
    execution_time_ms: Optional[float] = None


class NLQueryHistoryItem(BaseModel):
    id: UUID
    dataset_id: UUID
    question: str
    sql_query: Optional[str] = None
    answer: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    model: str
    row_count: Optional[int] = None
    execution_time_ms: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NLQueryHistory(BaseModel):
    items: List[NLQueryHistoryItem]
    total: int
    page: int
    page_size: int


# Upload Schemas
class UploadResponse(BaseModel):
    dataset_id: UUID
    filename: str
    status: str
    message: str


# Column Embedding/Search
class ColumnSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    dataset_id: Optional[UUID] = None
    top_k: int = 5


class ColumnSearchResult(BaseModel):
    column_name: str
    description: str
    similarity: float


# Pagination
class PageParams(BaseModel):
    page: int = 1
    page_size: int = 20


# Forward references
DatasetWithProfile.model_rebuild()
Profile.model_rebuild()