# DataLens - Full-Stack Data Analysis Platform

A modern, full-stack data analysis platform combining the power of Google Analytics with ChatGPT for your business data. Upload CSV/Excel files, get instant AI-powered insights, build interactive dashboards, and ask questions in plain English.

## Architecture

**Stack**: Next.js 14 (App Router) + FastAPI + PostgreSQL + Python Data Stack (pandas, duckdb, plotly)

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
                    │  │  /api/v1/profile        │ │ ──▶ Auto-profile (ydata-profiling)
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

## Features

### 1. File Upload
- Drag-and-drop zone (react-dropzone)
- Support for CSV, Excel (.xlsx), Parquet, JSON
- Automatic type detection and data cleaning
- Files registered as DuckDB views for instant querying

### 2. Auto-Profiling / EDA
- Engine: `ydata-profiling` (formerly pandas-profiling)
- Output: Column stats, correlations, missing values, distributions, interactions
- Storage: JSON profile in Postgres (JSONB), HTML report served via FastAPI
- Async: Background job via `asyncio` / `fastapi.BackgroundTasks`

### 3. Query Engine
- DuckDB: Register uploaded files as views → execute SQL directly on files (zero-copy)
- Pandas fallback: For complex pandas-only operations
- API: `POST /query` { sql, dataset_id } → returns Arrow/JSON
- Safety: Read-only DuckDB, statement timeout, row limits

### 4. Natural Language → SQL
- Stack: LangChain `SQLDatabaseChain` + `ChatOpenAI` / local LLM (Ollama)
- Context: Feed DuckDB schema + sample rows + profile stats as context
- pgvector: Store column embeddings for semantic column matching
- API: `POST /nl-query` { question, dataset_id } → { sql, results, explanation, chart_spec }

### 5. Visual Chart Builder
- Frontend: Drag-drop builder (x-axis, y-axis, color, facet, chart type)
- Spec: Vega-Lite-inspired JSON spec
- Backend: Convert spec → Plotly.js JSON via `plotly.py` / custom mapper
- Frontend Render: `react-plotly.js` for interactive charts
- Export: PNG, SVG, Plotly JSON

### 6. Dashboard Builder + Sharing
- Grid: `react-grid-layout` for drag-drop resize
- Components: Charts, text, filters, KPI cards
- Filters: Global filters (date range, category) → propagate to all charts
- Sharing: Public link with token, embed iframe, export PDF

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
│   │   │   │   │   │   ├── charts/
│   │   │   │   │   │   │   ├── new/page.tsx   # Chart builder
│   │   │   │   │   │   │   └── [id]/          # Chart view/edit
│   │   │   │   │   │   └── query/page.tsx     # NL → SQL interface
│   │   │   │   ├── dashboards/
│   │   │   │   │   ├── [id]/page.tsx          # Dashboard view
│   │   │   │   │   └── builder/page.tsx       # Dashboard builder
│   │   │   │   ├── charts/page.tsx            # Charts list
│   │   │   │   ├── query/page.tsx             # SQL editor
│   │   │   │   ├── settings/page.tsx          # User settings
│   │   │   │   └── layout.tsx                 # Dashboard layout + sidebar
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

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Using Docker Compose (Recommended)

```bash
# Clone the repository
cd DataLens

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development

#### Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp ../.env.example .env
# Edit .env

# Run database migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp ../.env.example .env.local
# Edit .env.local

# Start development server
npm run dev
```

## Environment Variables

See `.env.example` for all available options.

### Required
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT signing secret (generate with `openssl rand -hex 32`)
- `NEXTAUTH_SECRET`: NextAuth.js secret (generate with `openssl rand -hex 32`)

### Optional
- `OPENAI_API_KEY`: For NL→SQL with GPT-4
- `OLLAMA_BASE_URL`: For local LLM (default: http://localhost:11434)
- `OLLAMA_MODEL`: Ollama model name (default: llama3)
- `GOOGLE_CLIENT_ID/SECRET`: Google OAuth
- `GITHUB_CLIENT_ID/SECRET`: GitHub OAuth

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login, get JWT token
- `GET /api/v1/auth/me` - Get current user info

### Datasets
- `POST /api/v1/datasets/upload` - Upload file
- `GET /api/v1/datasets` - List datasets (paginated)
- `GET /api/v1/datasets/{id}` - Get dataset details
- `DELETE /api/v1/datasets/{id}` - Delete dataset

### Profiling
- `POST /api/v1/datasets/{id}/profile` - Generate profile (async)
- `GET /api/v1/datasets/{id}/profile` - Get profile JSON
- `GET /api/v1/datasets/{id}/profile/html` - Get HTML report
- `GET /api/v1/datasets/{id}/profile/summary` - Get summary stats

### Query
- `POST /api/v1/query` - Execute SQL query
- `POST /api/v1/nl-query` - Natural language query
- `GET /api/v1/datasets/{id}/schema` - Get dataset schema
- `GET /api/v1/datasets/{id}/sample` - Get sample rows

### Charts
- `POST /api/v1/charts` - Create chart
- `GET /api/v1/charts` - List charts
- `GET /api/v1/charts/{id}` - Get chart
- `PUT /api/v1/charts/{id}` - Update chart
- `DELETE /api/v1/charts/{id}` - Delete chart
- `POST /api/v1/charts/{id}/render` - Render chart to Plotly JSON
- `POST /api/v1/charts/render` - Render spec directly

### Dashboards
- `POST /api/v1/dashboards` - Create dashboard
- `GET /api/v1/dashboards` - List dashboards
- `GET /api/v1/dashboards/{id}` - Get dashboard with items
- `PUT /api/v1/dashboards/{id}` - Update dashboard
- `DELETE /api/v1/dashboards/{id}` - Delete dashboard
- `POST /api/v1/dashboards/{id}/share` - Create share token
- `DELETE /api/v1/dashboards/{id}/share` - Remove share token
- `GET /api/v1/dashboards/share/{token}` - Get shared dashboard (public)
- `POST /api/v1/dashboards/{id}/items` - Add item
- `PUT /api/v1/dashboards/{id}/items/{item_id}` - Update item
- `DELETE /api/v1/dashboards/{id}/items/{item_id}` - Delete item

## Database Schema

The application uses PostgreSQL with pgvector extension. Tables include:
- `users` - User accounts
- `datasets` - Uploaded datasets
- `profiles` - Data profiling reports (JSONB)
- `charts` - Saved chart specifications
- `dashboards` - Dashboard layouts
- `dashboard_items` - Dashboard components (charts, text, filters, KPIs)
- `shares` - Public share tokens
- `column_embeddings` - Vector embeddings for NL→SQL

## Technology Stack

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui (Radix UI primitives)
- TanStack Query (React Query)
- NextAuth.js
- react-plotly.js
- react-grid-layout
- react-dropzone
- react-hook-form + zod

### Backend
- FastAPI
- SQLAlchemy 2.0 (async)
- asyncpg
- DuckDB
- ydata-profiling
- LangChain
- OpenAI / Ollama
- pgvector
- Pydantic v2
- Alembic (migrations)

## Development

### Running Tests
```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

### Linting
```bash
# Backend
cd backend && ruff check . && black --check .

# Frontend
cd frontend && npm run lint
```

### Database Migrations
```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Deployment

### Docker Production
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Manual Deployment
1. Build frontend: `cd frontend && npm run build`
2. Install backend deps: `cd backend && pip install -r requirements.txt`
3. Run migrations: `alembic upgrade head`
4. Start services with process manager (systemd, supervisor, etc.)

## License

MIT License - feel free to use for personal or commercial projects.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request