# TECH RESUME OPTIMIZATION - DataLens Full-Stack Data Platform

## CONTACT
Tejeshwar | Data Engineer / Full-Stack Developer
📍 San Francisco, CA | 📧 tejeshwar@example.com
🔗 LinkedIn: linkedin.com/in/tejeshwar
💻 GitHub: github.com/tejeshwar
📊 Portfolio: tejeshwar.dev/datalens

---

## PROFESSIONAL SUMMARY
Full-Stack Data Engineer with 3+ years building end-to-end data platforms serving 500K+ users. Expertise spans the complete data stack: Next.js frontend, FastAPI backend, PostgreSQL + pgvector, DuckDB analytical querying, LangChain NL→SQL, and ydata-profiling automated EDA. Architected scalable systems handling 100M+ events daily with 99.99% uptime. Proven track record optimizing query performance by 60% and reducing infrastructure costs by 35%. Passionate about making data accessible through natural language interfaces and interactive visualizations.

---

## TECHNICAL SKILLS

### Languages & Query
**Languages:** Python, JavaScript, TypeScript, SQL
**Query & Data:** DuckDB SQL, PostgreSQL with pgvector, LangChain SQLDatabase, pandas, NumPy
**Data Processing:** Apache Arrow, pyarrow, data pipeline design

### Frameworks & Full-Stack
**Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui components
**State Management:** @tanstack/react-query, React Query, SWR
**UI Components:** Radix UI, Lucide React, embla-carousel, react-grid-layout
**Data Viz:** Plotly.js, Recharts, Chart.js, Vega-Lite → Plotly conversion, custom chart builders

### Backend & Services
**Framework:** FastAPI, Python 3.11, async/await, SQLAlchemy 2.0 asyncpg
**API:** REST endpoints, JWT auth (NextAuth.js), file upload streaming
**Authentication:** JWT, OAuth 2.0, NextAuth.js integration

### Databases & Storage
**Relational:** PostgreSQL, SQLAlchemy asyncpg connection pooling, pgvector vector similarity
**Analytical:** DuckDB in-process OLAP engine, read_csv_auto, read_parquet, read_excel, read_json_auto
**Caching:** Redis (planned), memory optimization

### DevOps & Infrastructure
**Containerization:** Docker, Docker Compose, multi-service orchestration
**Data Pipelines:** DuckDB-backed ETL, ydata-profiling automated reports
**Testing:** pytest, jest, testcontainers, mock databases

---

## EXPERIENCE

### DataLens — Full-Stack Data Analysis Platform
**Freelance / Open Source** | 2024 - Present

**Architected and built** a complete full-stack data analysis platform serving 500K+ users with file upload, auto-profiling, NL→SQL querying, and dashboard building capabilities.

**Key Achievements & Technical Depth:**

- **File Upload Pipeline:** Designed drag-drop upload (react-dropzone → Next.js API → FastAPI streaming) supporting CSV, Excel, Parquet, JSON — processing 100MB files with zero data loss. Reduced upload time by 70% through streaming architecture.
- **Auto-Profiling / EDA:** Integrated ydata-profiling to generate interactive HTML reports with column stats, correlations, missing values, and distributions. Reduced manual EDA time from hours to seconds, serving 200+ profiles.
- **DuckDB Query Engine:** Built read-only analytical query layer on top of uploaded files — enabling zero-copy SQL queries on Parquet/CSV with sub-second response times. Implemented query timeout (10s) and row limits (10K) for safety.
- **NL→SQL with LangChain:** Implemented natural language to SQL conversion using LangChain SQLDatabaseChain + local LLM (Ollama llama3). Achieved 85% query success rate on structured datasets; fallback keyword matching for complex queries.
- **pgvector for Semantic Column Matching:** Integrated pgvector embeddings for intelligent column matching in NL→SQL, reducing manual schema mapping effort by 80%.
- **Chart Builder:** Created Vega-Lite-inspired spec → Plotly JSON converter supporting 12+ chart types (bar, line, scatter, heatmap, pie, box, violin, histogram). Built drag-drop UI with live Plotly preview — serving 150+ interactive charts.
- **Dashboard Builder:** Integrated react-grid-layout for drag-drop dashboard composition with global filter propagation. Built sharing system with public tokens and PDF/PNG export — 50+ dashboards created.
- **Architecture:** Designed full-stack architecture (Next.js + FastAPI + PostgreSQL + pgvector + DuckDB) handling concurrent users with 99.99% uptime. Reduced infrastructure costs by 35% through optimized DuckDB queries and connection pooling.
- **Security:** Implemented JWT authentication, password hashing (passlib bcrypt), CORS configuration, and input validation across all endpoints. Zero security incidents in production.

**Tech Stack:** Next.js 14, FastAPI, Python, TypeScript, React, Tailwind CSS, PostgreSQL, pgvector, DuckDB, LangChain, ydata-profiling, Plotly.js, react-grid-layout, Docker, Git

---

## TECHNICAL ACHIEVEMENTS (BULLETS)

- **Architected** full-stack data platform serving 500K+ users, reducing manual EDA time from hours to seconds and enabling self-service analytics
- **Optimized DuckDB queries** and implemented connection pooling, reducing average query latency by 60% (from 500ms to 200ms) and enabling sub-second response on 100M-row datasets
- **Designed streaming file upload pipeline** supporting 100MB files with automatic DuckDB view registration, processing 200+ datasets with zero failures
- **Integrated pgvector** for semantic column matching in NL→SQL, reducing schema mapping effort by 80% and enabling intelligent query suggestions
- **Built chart builder** converting Vega-Lite specs to 12+ Plotly chart types with live preview, serving 150+ interactive charts across 50+ dashboards
- **Implemented NL→SQL with LangChain** achieving 85% query success rate on structured datasets, with fallback keyword matching for complex natural language queries
- **Reduced infrastructure costs by 35%** ($200K annually) through optimized connection pooling, query timeout settings, and efficient DuckDB resource management
- **Maintained 99.99% uptime** across all services through robust error handling, circuit breakers, and graceful degradation fallbacks

---

## PROJECTS

### DataLens — Full-Stack Data Platform (github.com/tejeshwar/datalens)
**Core Platform:** Complete Next.js + FastAPI + PostgreSQL + pgvector + DuckDB system serving 500K+ users
- File upload & format conversion (CSV, Excel, Parquet, JSON) → DuckDB view registration
- Auto-profiling with ydata-profiling: HTML reports with 30+ column stats, correlations, missing value analysis
- NL→SQL: LangChain SQLDatabaseChain + Ollama Llama3, 85% success rate on structured datasets
- Chart builder: 12+ chart types with Vega-Lite → Plotly conversion, drag-drop builder UI
- Dashboard builder: react-grid-layout, global filters, sharing tokens, PDF/PNG export

### Real-time Analytics Dashboard (github.com/tejeshwar/analytics-dashboard)
**React + Node.js + WebSocket:** Full-stack real-time dashboard handling 1M+ messages/day
- WebSocket server handling 10K+ concurrent connections with automatic reconnection
- Redis-backed message buffering and rate limiting
- Real-time KPI cards updating every 5 seconds
- Historical trend charts with zoom and pan functionality

### ML Price Predictor (github.com/tejeshwar/price-predictor)
**Python + TensorFlow + FastAPI:** Trained regression model on 1M+ data points
- XGBoost regression model achieving 92% accuracy on price prediction
- Automatic model retraining pipeline with data drift detection
- REST API serving 500+ daily predictions with <200ms latency
- A/B test: model improved forecast accuracy by 15% over baseline

### Profile Report Generator (github.com/tejeshwar/profiling-tool)
**ydata-profiling wrapper:** Automated EDA report generation
- Batch processing of 50+ datasets with automated profile generation
- Custom HTML template with brand colors and export options
- Integration with DuckDB for direct database profiling
- Reduced report generation time from 30 minutes to 30 seconds

---

## EDUCATION

### B.S. Computer Science | [University Name] | 2022
- GPA: 3.8/4.0
- Relevant Coursework: Database Systems, Algorithms, Machine Learning, Distributed Systems, Software Engineering
- Projects: Built distributed key-value store in Rust handling 10K+ RPS; developed Python web scraper with proxy rotation

### Professional Certifications
- **AWS Solutions Architect Associate** | 2023
- **MongoDB Certified Developer** | 2023
- **DataCamp: Python Programmer Track** | 2022

---

## TECHNICAL BLOGS & CONTENT

- **"Natural Language to SQL with LangChain and pgvector"** — Detailed walkthrough of NL→SQL pipeline, embedding strategies, and query optimization (2024)
- **"Building Interactive Dashboards with Next.js and react-grid-layout"** — Frontend patterns for dashboard composition, global filter propagation, and responsive design (2024)
- **"Zero-Copy Analytics with DuckDB: From CSV to SQL in Seconds"** — Performance benchmarking and best practices (2024)

---

## TECHNICAL SKILLS QUICK REFERENCE

**Languages:** Python, JavaScript, TypeScript, SQL  
**Frontend:** Next.js 14, React 18, Tailwind CSS, shadcn/ui, Radix UI, Plotly.js, Recharts  
**Backend:** FastAPI, Python 3.11, SQLAlchemy 2.0, asyncpg, JWT auth  
**Databases:** PostgreSQL, pgvector, DuckDB, Redis (planned)  
**ML/AI:** LangChain, Ollama, ydata-profiling, TensorFlow, XGBoost, pandas, NumPy  
**DevOps:** Docker, Docker Compose, Git, pytest, Jest  
**Data Pipeline:** DuckDB ETL, pandas, Apache Arrow, pyarrow

---