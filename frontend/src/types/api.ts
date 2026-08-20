// TypeScript types matching DataLens backend API contracts
// Generated from backend/schemas/__init__.py and API endpoints

export type UUID = string;
export type ISODateString = string;

// ============================================
// AUTH
// ============================================

export interface User {
  id: UUID;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Token {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthMeResponse {
  id: UUID;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

// ============================================
// DATASETS
// ============================================

export type DatasetStatus = 'uploaded' | 'profiling' | 'ready' | 'error';
export type FileType = 'csv' | 'xlsx' | 'parquet' | 'json';

export interface Dataset {
  id: UUID;
  user_id: UUID;
  name: string;
  filename: string;
  file_path: string;
  file_type: FileType;
  rows: number | null;
  columns: number | null;
  size_bytes: number | null;
  duckdb_view_name: string;
  status: DatasetStatus;
  error_message: string | null;
  column_info: Record<string, ColumnInfo> | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface DatasetList {
  items: Dataset[];
  total: number;
  page: number;
  page_size: number;
}

export interface UploadResponse {
  dataset_id: UUID;
  filename: string;
  status: DatasetStatus;
  message: string;
}

export interface ColumnInfo {
  dtype: string;
  type: string;
  missing_count: number;
  missing_pct: number;
  unique_count: number;
  sample_values: unknown[];
}

// ============================================
// PROFILING
// ============================================

export interface Profile {
  id: UUID;
  dataset_id: UUID;
  profile_json: Record<string, unknown>;
  html_report_path: string | null;
  created_at: ISODateString;
}

export interface ProfileSummary {
  n_variables: number;
  n_observations: number;
  missing_cells: number;
  missing_cells_pct: number;
  duplicate_rows: number;
  duplicate_rows_pct: number;
  variable_types: Record<string, number>;
  top_missing: Array<{
    name: string;
    missing_count: number;
    missing_pct: number;
  }>;
  high_correlations: Array<{
    columns: string;
    correlation: number;
    method: string;
  }>;
}

// ============================================
// CHARTS
// ============================================

export type ChartMarkType =
  | 'bar'
  | 'line'
  | 'point'
  | 'area'
  | 'heatmap'
  | 'pie'
  | 'box'
  | 'violin'
  | 'histogram';

export type EncodingFieldType = 'quantitative' | 'ordinal' | 'nominal' | 'temporal';
export type AggregateType = 'sum' | 'mean' | 'count' | 'min' | 'max';
export type TimeUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

export interface EncodingField {
  field: string;
  type: EncodingFieldType;
  title?: string;
  aggregate?: AggregateType;
  bin?: boolean;
  time_unit?: TimeUnit;
  scale?: Record<string, unknown>;
  sort?: Record<string, unknown>;
}

export interface ChartSpec {
  mark: ChartMarkType;
  encoding: Record<string, EncodingField>;
  transform?: Array<{
    filter?: string;
    aggregate?: Record<string, unknown>;
    calculate?: string;
  }>;
  width?: number;
  height?: number;
  title?: string;
  config?: Record<string, unknown>;
}

export interface Chart {
  id: UUID;
  dataset_id: UUID;
  user_id: UUID;
  name: string;
  spec_json: ChartSpec;
  plotly_json: Record<string, unknown> | null;
  chart_type: ChartMarkType;
  description: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface ChartList {
  items: Chart[];
  total: number;
  page: number;
  page_size: number;
}

export interface ChartCreate {
  dataset_id: UUID;
  name: string;
  spec_json: ChartSpec;
  chart_type: ChartMarkType;
  description?: string;
}

export interface ChartUpdate {
  name?: string;
  spec_json?: ChartSpec;
  chart_type?: ChartMarkType;
  description?: string;
}

export interface ChartRenderRequest {
  spec: ChartSpec;
  dataset_id: UUID;
  limit?: number;
}

export interface ChartRenderResponse {
  plotly_json: Record<string, unknown>;
  data: Record<string, unknown>[];
  columns: string[];
  sql: string;
}

// ============================================
// DASHBOARDS
// ============================================

export type DashboardItemType = 'chart' | 'text' | 'filter' | 'kpi';
export type FilterType = 'select' | 'multi_select' | 'date_range' | 'number_range';
export type KPIAggregation = 'sum' | 'mean' | 'count' | 'min' | 'max';

export interface DashboardItemConfig {
  // Chart item
  chart_id?: UUID;
  // Text item
  content?: string;
  // Filter item
  filter_column?: string;
  filter_type?: FilterType;
  // KPI item
  metric?: string;
  aggregation?: KPIAggregation;
  format?: string;
  // Layout (all types)
  x: number;
  y: number;
  w: number;
  h: number;
  min_w?: number;
  min_h?: number;
  max_w?: number;
  max_h?: number;
}

export interface DashboardItem {
  id: UUID;
  dashboard_id: UUID;
  chart_id: UUID | null;
  item_type: DashboardItemType;
  config_json: DashboardItemConfig;
  order: number;
}

export interface Dashboard {
  id: UUID;
  owner_id: UUID;
  name: string;
  description?: string;
  layout_json: { items: DashboardItemConfig[] };
  is_public: boolean;
  share_token: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
  items?: DashboardItem[];
  item_count?: number;
  is_shared?: boolean;
}

export interface DashboardList {
  items: Dashboard[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardCreate {
  name: string;
  description?: string;
  layout_json: { items: DashboardItemConfig[] };
  is_public?: boolean;
}

export interface DashboardUpdate {
  name?: string;
  description?: string;
  layout_json?: { items: DashboardItemConfig[] };
  is_public?: boolean;
}

export interface DashboardItemCreate {
  item_type: DashboardItemType;
  config_json: DashboardItemConfig;
  order?: number;
}

export interface DashboardItemUpdate {
  item_type?: DashboardItemType;
  config_json?: DashboardItemConfig;
  order?: number;
}

export interface ShareCreate {
  dashboard_id: UUID;
  expires_at?: ISODateString;
}

export interface ShareResponse {
  share_token: string;
  share_url: string;
}

// ============================================
// QUERY
// ============================================

export interface QueryRequest {
  sql: string;
  dataset_id: UUID;
  limit?: number;
  offset?: number;
}

export interface QueryResponse {
  columns: string[];
  rows: unknown[][];
  row_count: number;
  truncated: boolean;
  sql: string;
  execution_time_ms: number;
}

export interface NLQueryRequest {
  question: string;
  dataset_id: UUID;
  chart_suggestion?: boolean;
}

export interface NLQueryResponse {
  answer: string;
  sql?: string;
  chart_spec?: ChartSpec;
  data?: Record<string, unknown>[];
  columns?: string[];
  confidence: number;
  explanation?: string;
  status?: 'success' | 'error';
  error_message?: string;
  model?: string;
  row_count?: number;
  created_at?: string;
  id?: string;
  question?: string;
}

export interface NLQueryHistoryItem {
  id: UUID;
  dataset_id: UUID;
  question: string;
  sql_query?: string;
  answer?: string;
  status: 'success' | 'error';
  error_message?: string;
  model: string;
  row_count?: number;
  execution_time_ms?: number;
  created_at: ISODateString;
}

export interface NLQueryHistory {
  items: NLQueryHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================
// PAGINATION
// ============================================

export interface PageParams {
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================
// API ERROR
// ============================================

export interface ApiError {
  detail: string;
}