# DataLens - Full-Stack Data Analysis Platform

## Architecture Overview

**Stack**: Next.js 14 (App Router) + FastAPI + PostgreSQL + Python Data Stack (pandas, duckdb, plotly, duckdb-engine)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Next.js 14 Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Upload     │  │  Profile    │  │  Chart      │  │  Dashboard          │ │
│  │  / Drag-Drop│──▶│  / Profile  │──▶│  Builder    │──▶│  Builder + Share  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │               │                │                    │              │
│         └───────────────┴────────────────┴────────────────────┘              │
│                                  │                                            │
│                    ┌─────────────▼─────────────┐                              │
│                    │      Next.js API Routes   │                              │
│                    │   (Auth, Upload, Proxy)   │                              │
│                    └─────────────┬─────────────┘                              │
└──────────────────────────────────┼────────────────────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │       FastAPI Backend        │
                    │  ┌─────────────────────────┐ │
                    │  │  /api/v1/upload         │ │ ──▶ Upload CSV/Excel/Parquet
                    │  │  /api/v1/datasets       │ │ ──▶ CRUD datasets
                    │  │  /api/v1/profile        │ │ ──▶ Auto-profile (pandas-profiling / ydata-profiling)
                    │  │  /api/v1/query          │ │ ──▶ DuckDB SQL / pandas execution
                    │  │  /api/v1/nl-query       │ │ ──▶ NL → SQL (LangChain + SQLDatabase)
                    │  │  /api/v1/charts         │ │ ──▶ Chart specs → Plotly JSON
                    │  │  /api/v1/dashboards     │ │ ──▶ CRUD dashboards + sharing
                    │  │  /api/v1/auth           │ │ ──▶ JWT auth (NextAuth.js proxy)
                    │  └─────────────────────────┘ │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      PostgreSQL (pgvector)   │
                    │  ┌─────────────────────────┐ │
                    │  │ users, datasets,        │ │
                    │  │ profiles, charts,       │ │
                    │  │ dashboards, shares      │ │
                    │  │ + pgvector for embeddings│ │
                    │  └─────────────────────────┘ │
                    └──────────────────────────────┘
```

---

## Project Structure

```
E:\DataLens\
├── frontend/                    # Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/         # Auth routes (login, register)
│   │   │   ├── (dashboard)/    # Protected dashboard routes
│   │   │   │   ├── datasets/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── page.tsx          # Dataset detail + profile
│   │   │   │   │   │   ├── profile/          # Auto-profile view
│   │   │   │   │   │   ├── charts/           # Chart builder
│   │   │   │   │   │   └── query/            # NL → SQL interface
│   │   │   │   ├── dashboards/
│   │   │   │   │   ├── [id]/page.tsx         # Dashboard view
│   │   │   │   │   └── builder/page.tsx      # Dashboard builder
│   │   │   │   └── layout.tsx
│   │   │   ├── api/              # Next.js API routes (auth proxy, upload)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx          # Landing page
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── upload/           # Drag-drop upload zone
│   │   │   ├── profile/          # Profile report components
│   │   │   ├── charts/           # Chart builder + Plotly renderer
│   │   │   ├── query/            # NL query interface
│   │   │   └── dashboard/        # Dashboard builder + grid
│   │   ├── lib/
│   │   │   ├── api.ts            # FastAPI client
│   │   │   ├── auth.ts           # NextAuth config
│   │   │   └── utils.ts
│   │   └── hooks/
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                      # FastAPI
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── upload.py     # File upload handling
│   │   │   │   ├── datasets.py   # Dataset CRUD
│   │   │   │   ├── profile.py    # Auto-profiling (ydata-profiling)
│   │   │   │   ├── query.py      # DuckDB SQL / pandas execution
│   │   │   │   ├── nl_query.py   # NL → SQL via LangChain
│   │   │   │   ├── charts.py     # Chart spec → Plotly JSON
│   │   │   │   ├── dashboards.py # Dashboard CRUD + sharing
│   │   │   │   └── auth.py       # JWT verification
│   │   │   └── router.py
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic settings
│   │   │   ├── database.py       # SQLAlchemy + asyncpg
│   │   │   ├── security.py       # JWT, password hashing
│   │   │   └── duckdb.py         # DuckDB connection pool
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── dataset.py
│   │   │   ├── profile.py
│   │   │   ├── chart.py
│   │   │   ├── dashboard.py
│   │   │   └── share.py
│   │   ├── schemas/
│   │   │   ├── dataset.py
│   │   │   ├── profile.py
│   │   │   ├── query.py
│   │   │   ├── chart.py
│   │   │   └── dashboard.py
│   │   ├── services/
│   │   │   ├── profiler.py       # ydata-profiling wrapper
│   │   │   ├── query_engine.py   # DuckDB + pandas execution
│   │   │   ├── nl2sql.py         # LangChain SQLDatabase chain
│   │   │   ├── chart_engine.py   # Vega-Lite → Plotly conversion
│   │   │   └── embeddings.py     # pgvector for NL→SQL
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml            # Postgres + pgvector + FastAPI + Next.js
├── .env.example
└── README.md
```

---

## Core Components

### 1. File Upload (`/api/v1/upload`)
- **Frontend**: Drag-drop zone (react-dropzone) → Next.js API route → streams to FastAPI
- **Backend**: FastAPI `UploadFile` → save to `/data/uploads/{dataset_id}.{ext}` → register in Postgres
- **Supported**: CSV, Excel (.xlsx), Parquet, JSON
- **DuckDB**: Auto-register as view for instant querying

### 2. Auto-Profiling / EDA (`/api/v1/profile`)
- **Engine**: `ydata-profiling` (formerly pandas-profiling) → HTML/JSON report
- **Output**: Column stats, correlations, missing values, distributions, interactions
- **Storage**: Store JSON profile in Postgres (JSONB), serve HTML report via FastAPI
- **Async**: Background job via `asyncio` / `fastapi.BackgroundTasks`

### 3. Query Engine (`/api/v1/query`)
- **DuckDB**: Register uploaded files as views → execute SQL directly on files (zero-copy)
- **Pandas fallback**: For complex pandas-only operations
- **API**: `POST /query` { sql: "SELECT * FROM dataset_123 WHERE ..." } → returns Arrow/JSON
- **Safety**: Read-only DuckDB, statement timeout, row limits

### 4. Natural Language → SQL (`/api/v1/nl-query`)
- **Stack**: LangChain `SQLDatabaseChain` + `ChatOpenAI` / local LLM (Ollama)
- **Context**: Feed DuckDB schema + sample rows + profile stats as context
- **pgvector**: Store column embeddings for semantic column matching
- **API**: `POST /nl-query` { question: "top 5 customers by revenue" } → { sql, results, explanation }

### 5. Visual Chart Builder (`/api/v1/charts`)
- **Frontend**: Drag-drop builder (x-axis, y-axis, color, facet, chart type)
- **Spec**: Vega-Lite-inspired JSON spec
- **Backend**: Convert spec → Plotly.js JSON via `plotly.py` / custom mapper
- **Frontend Render**: `react-plotly.js` for interactive charts
- **Export**: PNG, SVG, Plotly JSON

### 6. Dashboard Builder + Sharing (`/api/v1/dashboards`)
- **Grid**: `react-grid-layout` for drag-drop resize
- **Components**: Charts, text, filters, KPI cards
- **Filters**: Global filters (date range, category) → propagate to all charts
- **Sharing**: Public link with token, embed iframe, export PDF

---

## Database Schema (PostgreSQL + pgvector)

```sql
-- Users & Auth
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datasets
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    filename VARCHAR(255),
    file_path VARCHAR(512),
    file_type VARCHAR(50),  -- csv, xlsx, parquet, json
    rows INTEGER,
    columns INTEGER,
    size_bytes BIGINT,
    duckdb_view_name VARCHAR(255),  -- e.g., "dataset_abc123"
    status VARCHAR(50) DEFAULT 'uploaded',  -- uploaded, profiling, ready, error
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (ydata-profiling JSON output)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    profile_json JSONB NOT NULL,
    html_report_path VARCHAR(512),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Charts
CREATE TABLE charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    spec_json JSONB NOT NULL,  -- Vega-Lite spec
    plotly_json JSONB,         -- Cached Plotly output
    chart_type VARCHAR(50),    -- bar, line, scatter, heatmap, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboards
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    layout_json JSONB NOT NULL,  -- react-grid-layout layout
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(64) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard Items (charts, text, filters)
CREATE TABLE dashboard_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
    chart_id UUID REFERENCES charts(id) ON DELETE SET NULL,
    item_type VARCHAR(50),  -- chart, text, filter, kpi
    config_json JSONB,      -- position, size, props
    "order" INTEGER DEFAULT 0
);

-- Column embeddings for NL→SQL (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE column_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    column_name VARCHAR(255),
    description TEXT,
    embedding vector(1536),  -- OpenAI embeddings or local
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Contracts

### Upload
```
POST /api/v1/upload
Content-Type: multipart/form-data
→ { dataset_id, name, rows, columns, status }
```

### Datasets
```
GET    /api/v1/datasets              → List user datasets
GET    /api/v1/datasets/{id}         → Dataset detail
DELETE /api/v1/datasets/{id}         → Delete dataset + file
```

### Profile
```
POST   /api/v1/profile/{dataset_id}  → Trigger profiling (async)
GET    /api/v1/profile/{dataset_id}  → Get profile JSON
GET    /api/v1/profile/{dataset_id}/html → HTML report
```

### Query
```
POST /api/v1/query
{ sql: "SELECT * FROM dataset_abc LIMIT 100" }
→ { columns: [], rows: [][], row_count: 100, truncated: false }
```

### NL Query
```
POST /api/v1/nl-query
{ question: "Top 5 products by sales", dataset_id: "uuid" }
→ { sql, results, explanation, confidence }
```

### Charts
```
POST   /api/v1/charts              → Create chart spec
GET    /api/v1/charts/{id}         → Get chart + Plotly JSON
PUT    /api/v1/charts/{id}         → Update spec
DELETE /api/v1/charts/{id}
POST   /api/v1/charts/{id}/render  → Generate Plotly JSON from spec
```

### Dashboards
```
POST   /api/v1/dashboards
GET    /api/v1/dashboards
GET    /api/v1/dashboards/{id}
PUT    /api/v1/dashboards/{id}
DELETE /api/v1/dashboards/{id}
GET    /api/v1/dashboards/share/{token}  → Public view
```

---

## Frontend Components

### Upload Zone (`components/upload/UploadZone.tsx`)
```tsx
// react-dropzone + progress → Next.js API → FastAPI
```

### Profile Viewer (`components/profile/ProfileReport.tsx`)
```tsx
// Renders ydata-profiling HTML in iframe + JSON summary cards
```

### Chart Builder (`components/charts/ChartBuilder.tsx`)
```tsx
// Drag-drop: X-axis, Y-axis, Color, Facet, Chart Type
// Live preview with Plotly
// Save → POST /charts
```

### NL Query (`components/query/NLQuery.tsx`)
```tsx
// Chat-like interface: question → streaming SQL → results table
// "Explain" button shows reasoning
```

### Dashboard Builder (`components/dashboard/DashboardBuilder.tsx`)
```tsx
// react-grid-layout: drag, resize, add/remove widgets
// Global filter bar → context → all charts
// "Share" button → generates public token
```

### Dashboard View (`components/dashboard/DashboardView.tsx`)
```tsx
// Read-only grid, responsive, filter controls
// Embeddable via iframe
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Docker Compose: Postgres + pgvector + FastAPI + Next.js
- [ ] FastAPI project structure, SQLAlchemy models, auth
- [ ] Next.js + shadcn/ui + Tailwind, NextAuth.js
- [ ] Database migrations (Alembic)
- [ ] Basic auth flow (register/login/JWT)

### Phase 2: Upload + Profiling (Week 1-2)
- [ ] File upload endpoint + Next.js upload UI
- [ ] DuckDB integration: register CSV/Parquet as views
- [ ] ydata-profiling integration (background job)
- [ ] Profile viewer (HTML iframe + summary cards)

### Phase 3: Query + NL→SQL (Week 2)
- [ ] DuckDB query endpoint (SQL → Arrow/JSON)
- [ ] LangChain SQLDatabaseChain + OpenAI/Ollama
- [ ] pgvector column embeddings for context
- [ ] NL Query chat UI

### Phase 4: Chart Builder (Week 2-3)
- [ ] Vega-Lite-inspired spec schema
- [ ] Spec → Plotly converter
- [ ] Drag-drop builder UI + live Plotly preview
- [ ] Chart CRUD API

### Phase 5: Dashboards + Sharing (Week 3)
- [ ] Dashboard CRUD + react-grid-layout
- [ ] Global filters context
- [ ] Public sharing + embed iframe
- [ ] PDF/PNG export

---

## Configuration

### `.env.example`
```env
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# Backend
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/datalens
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# DuckDB
DUCKDB_PATH=/data/duckdb/analytics.duckdb

# File Storage
UPLOAD_DIR=/data/uploads
MAX_UPLOAD_SIZE=100MB

# LLM (OpenAI or Ollama)
OPENAI_API_KEY=sk-...
# OLLAMA_BASE_URL=http://localhost:11434
# OLLAMA_MODEL=llama3

# pgvector
PGVECTOR_DIM=1536
```

### `docker-compose.yml`
```yaml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: datalens
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports: ["5432:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/datalens
      # ... other env vars
    volumes:
      - ./backend:/app
      - upload_data:/data/uploads
      - duckdb_data:/data/duckdb
    ports: ["8000:8000"]
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    ports: ["3000:3000"]
    depends_on: [backend]
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
  upload_data:
  duckdb_data:
```

---

## Verification Checklist

### Phase 1
- [ ] `docker compose up` → Postgres healthy, FastAPI `/health` returns 200, Next.js loads at localhost:3000
- [ ] Register → login → JWT cookie set → can access protected route

### Phase 2
- [ ] Drag-drop CSV → appears in dataset list
- [ ] Click dataset → "Profile" button → background job runs → HTML report renders
- [ ] Profile JSON shows columns, types, stats, correlations

### Phase 3
- [ ] `POST /query` with SQL → returns results as JSON
- [ ] NL query: "top 5 categories by sales" → returns SQL + results + explanation

### Phase 4
- [ ] Chart builder: pick X, Y, chart type → live Plotly chart
- [ ] Save chart → appears in chart list

### Phase 5
- [ ] Create dashboard → add charts + text + filters
- [ ] Global filter updates all charts
- [ ] Share link → opens public view without auth

---

## Tech Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| **DuckDB** | Zero-copy querying on Parquet/CSV, fast analytical SQL, no separate server |
| **ydata-profiling** | Best-in-class automated EDA, HTML + JSON output, active maintenance |
| **LangChain SQLDatabaseChain** | Battle-tested NL→SQL, supports schema context, extensible |
| **pgvector** | Column embeddings for semantic NL→SQL column matching |
| **Vega-Lite spec → Plotly** | Declarative spec, portable, Plotly renders interactively in React |
| **react-grid-layout** | Battle-tested dashboard grid, drag/resize, responsive |
| **Next.js API routes for upload** | Streaming upload to backend, avoids CORS, NextAuth integration |
| **FastAPI + SQLAlchemy async** | Fast, type-safe, great OpenAPI docs, async pg support |
| **JWT + NextAuth.js** | Secure, supports multiple providers later, middleware protection |