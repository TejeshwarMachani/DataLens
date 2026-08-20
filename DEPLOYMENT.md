# DataLens — Deployment Guide

This guide explains how DataLens is put together and how to get it running on a public host.

---

## 1. TL;DR — Is This Deployable, and Where?

| Target | Works? | Pick it if… |
|--------|--------|-------------|
| **Render** | ✅ Best fit | You want it live in ~15 min with one UI |
| **Railway** | ✅ Great fit | Same as Render, slightly more automation |
| **Fly.io** | ✅ Works | You want a single provider + shell control |
| **Vercel (frontend) + Render/Railway (backend)** | ✅ Works | You already love Vercel; needs 2 accounts |
| **Docker Compose on a VPS** | ✅ Works | You have a $6/mo server and don't mind manual work |
| **GitHub Pages** | ❌ **No** | Static hosting only. DataLens needs a Node server, a Python API, and a database — Pages serves flat HTML/JS and nothing else. |

**Recommended path:** Render — two web services + one managed Postgres.

> There are **two things you must fix before any cloud deploy** (see §3). The Dockerfiles and `docker-compose.yml` as committed are **development-only** (they run `--reload` / `npm run dev`). The Dockerfile you have in the repo doesn't matter for Render/Railway if you use their native build commands, but the app itself needs `SECRET_KEY` and CORS set for production.

---

## 2. How It's Built (Architecture)

```
 Browser
    │
    │ HTTPS  (your frontend URL)
    ▼
┌─────────────────────────────┐
│  Next.js 14 (frontend)      │   Port 3000
│  └ src/lib/api.ts (axios)   │
└─────────────┬───────────────┘
              │  HTTP  /api/v1/*        JSON + Bearer <JWT>
              ▼
┌─────────────────────────────┐
│  FastAPI (backend)          │   Port 8000
│  FastAPI app: backend/app/main.py  at prefix /api/v1
│  └ 34 routes: auth, datasets, query, charts, dashboards
└────┬───────────────┬────────┘
     │               │
     ▼               ▼
┌──────────────┐  ┌────────────────────────────┐
│ PostgreSQL   │  │ DuckDB  (analytics engine) │
│ users,       │  │ registers uploaded files   │
│ datasets,    │  │ as views; executes SQL      │
│ charts,      │  │ (SELECT-only, auto-LIMIT)   │
│ dashboards…  │  └────────────────────────────┘
│ (+pgvector)  │
└──────────────┘
```

### Backend (FastAPI)
- **Entrypoint:** `backend/app/main.py`. Lifecycle: on startup `init_db()` creates the pgvector extension (best-effort) and **all tables** (`Base.metadata.create_all`) — no manual migration step needed.
- **Two storage layers.**
  1. **PostgreSQL** (async SQLAlchemy): users, datasets, profiles, charts, dashboards, dashboard items, shares, NL-query history, column embeddings.
  2. **DuckDB** (single embedded file at `DUCKDB_PATH`): the *analytics* engine. Uploaded CSV/Excel/Parquet/JSON files get registered as DuckDB views; SQL queries run against DuckDB. Uploaded files themselves live on disk under `UPLOAD_DIR`.
- **Auth:** JWT (HS256, 60-min expiry). `POST /api/v1/auth/login` → `access_token`. Every protected endpoint validates `Authorization: Bearer <token>`. Passwords hashed with bcrypt.
- **Natural-language query** (`POST /api/v1/query/nl-query`): LLM (OpenAI key, optional) converts a question to SQL — falls back to Ollama → keyword matching if no key is set. So **NL queries work without any LLM, just worse.**

### Frontend (Next.js 14, App Router)
- Talks to the backend **directly via axios** (`frontend/src/lib/api.ts`), base URL = `NEXT_PUBLIC_API_URL` + `/api/v1`. It sends `Authorization: Bearer <token>` from `localStorage`; on a 401 it clears the token and redirects to `/login`.
- Also has **NextAuth** (`[...nextauth]/route.ts`) with credentials + optional Google/GitHub providers, and a couple of **Next.js API routes** that proxy backend calls (e.g. dashboard chart data).
- `next.config.js` rewrites `/api/:path*` → `NEXT_PUBLIC_API_URL/api/v1/:path*` (used by some server-side fetches).

> **Key env for the frontend:** `NEXT_PUBLIC_API_URL` is read **at build time**, so it must point at the *public, HTTPS* backend URL during the build — not `localhost`.

---

## 3. Required Fixes Before Deployment

### 3a. Production start commands (dev-only flags)
The committed Docker images are dev images:

| File | Problem | Production fix |
|------|---------|----------------|
| `backend/Dockerfile` | `CMD ... --reload` | run `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (no `--reload`) |
| `frontend/Dockerfile` | `CMD ["npm","run","dev"]` | target the repo at `frontend/`, build with `npm run build`, start with `npm run start` |

If you deploy via **Render/Railway "native" services**, you set build/start commands in the dashboard instead of using the Dockerfile — the fix is "config not code".

### 3b. Set a real secret
- `SECRET_KEY` (backend) — any long random string. `openssl rand -hex 32`.
- `NEXTAUTH_SECRET` (frontend) — same idea, `openssl rand -base64 32`.
- **Never** use the placeholder `your-secret-key-change-in-production`.

### 3c. CORS
`backend/app/core/config.py` defaults to only `http://localhost:3000`. Set:

```
BACKEND_CORS_ORIGINS=["https://<your-frontend-domain>"]
```

(pydantic-settings parses it as a JSON array — keep the brackets and quotes.)

---

## 4. Prerequisites & Secrets Checklist

You will set these in the deployed backend:

| Variable | Backend or Frontend | Notes |
|----------|--------------------|-------|
| `DATABASE_URL` | backend | Point at your hosted Postgres, e.g. `postgresql+asyncpg://user:pass@host:5432/datalens` |
| `SECRET_KEY` | backend | Generate a random one |
| `ALGORITHM` | backend | leave as `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | backend | optional, default 60 |
| `DUCKDB_PATH` | backend | default `/data/duckdb/analytics.duckdb` is fine if you attach a disk/volume |
| `UPLOAD_DIR` | backend | default `/data/uploads` — also needs the disk/volume |
| `BACKEND_CORS_ORIGINS` | backend | `["https://<frontend>"]` |
| `OPENAI_API_KEY` | backend | optional, enables smart NL→SQL |
| `PGVECTOR_DIM` | backend | keep `1536` unless you change the embedding model |
| `NEXT_PUBLIC_API_URL` | frontend | **public HTTPS backend URL, baked at build** |
| `NEXTAUTH_SECRET` | frontend | random |
| `NEXTAUTH_URL` | frontend | **public HTTPS frontend URL** |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | frontend | optional (only if using Google login) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | frontend | optional (only if using GitHub login) |

---

## 5. Option A — Render (recommended)

**Cost:** Postgres free tier + 2 web services on free/Starter. Free instances sleep after 15 min idle (cold start on first hit; your login link should set NEXTAUTH_URL to the real domain, not `localhost`).

### Step 1 — Hosted PostgreSQL
1. Create a **New → PostgreSQL** on Render. Choose **pgvector** support if prompted (Render's Postgres ships the `vector` extension, which `init_db()` uses best-effort).
2. Copy the **Internal Database URL** from the dashboard.

### Step 2 — Backend service
1. **New → Web Service** → connect the GitHub repo.
2. **Root Directory:** `backend`
3. **Runtime:** Python 3
4. **Build Command:** `pip install -r requirements.txt`
5. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. **Environment Variables:**
   - `DATABASE_URL` → the Postgres internal URL from Step 1
   - `SECRET_KEY` → random string
   - `BACKEND_CORS_ORIGINS` → `["https://<frontend-service>.onrender.com"]`
   - `OPENAI_API_KEY` → *(optional)*
   - `DUCKDB_PATH="/data/duckdb/analytics.duckdb"`, `UPLOAD_DIR="/data/uploads"`
7. **Attach a Disk** (Render → instance → Disks) mounted at `/data` so uploads + DuckDB survive redeploys. Without it, uploaded data is wiped on every deploy.
8. Create the service. Copy its URL, e.g. `https://datalens-backend.onrender.com`. Verify: open `https://<backend>/health` → returns `{"status":"healthy",...}`.

### Step 3 — Frontend service
1. **New → Web Service** → same repo.
2. **Root Directory:** `frontend`
3. **Runtime:** Node
4. **Build Command:** `npm install && npm run build`
5. **Start Command:** `npm run start`
6. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL` → `https://<backend>.onrender.com` (the **public** URL, not the internal one — browser needs it)
   - `NEXTAUTH_SECRET` → random
   - `NEXTAUTH_URL` → `https://<frontend>.onrender.com`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GITHUB_*` → *(optional)*
7. Create it. Open the frontend URL → register a user → log in → upload a file.

> ⚠️ **Build-order gotcha:** `NEXT_PUBLIC_API_URL` is baked into the JS bundle at `npm run build` time. Set it **before** the first build (it is — Render builds after you save the service). If you change it later, redeploy.

---

## 6. Option B — Railway

1. **New Project** → **Deploy from GitHub repo**.
2. Add a **PostgreSQL** plugin. Copy its connection string.
3. Add the backend as a deployable service with:
   - **Root:** `backend`
   - **Build:** `pip install -r requirements.txt`
   - **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Variables:** `DATABASE_URL`, `SECRET_KEY`, `BACKEND_CORS_ORIGINS`, `DUCKDB_PATH`, `UPLOAD_DIR`
4. Add the frontend service:
   - **Root:** `frontend`
   - **Build:** `npm install && npm run build`
   - **Start:** `npm run start`
   - **Variables:** `NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
5. Under each service → **Settings → Volumes**, attach a volume to `/data` on the backend for persistent uploads + DuckDB.
6. Railway gives each service a `.up.railway.app` URL; use those for CORS and `NEXT_PUBLIC_API_URL`.
7. Redeploy the backend after saving variables (Railway sometimes needs `railway up` or a manual redeploy to pick up new env).

---

## 7. Option C — Fly.io

Fly runs Docker/`Dockerfile`s, so use **modified production Dockerfiles** (see §3a). You'll need `flyctl`. Rough steps:

1. `fly launch` in `backend/` — it will detect the Python Dockerfile. Edit `fly.toml`:
   ```toml
   [env]
     DATABASE_URL = "postgresql+asyncpg://..."
     SECRET_KEY = "..."
     BACKEND_CORS_ORIGINS = "[\"https://<app>.fly.dev\"]"
   [[mounts]]
     source = "data"
     destination = "/data"
   ```
   And change the `CMD` to `uvicorn app.main:app --host 0.0.0.0 --port 8080` (Fly's default port) — update `[http]`/`services` in `fly.toml` accordingly.
2. `fly postgres create` and `fly postgres attach` to get a managed Postgres URL.
3. `fly deploy`.
4. Repeat the pattern in `frontend/` for the Next.js service (as Node, `npm run build` / `npm run start`), with `NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
5. Set the frontend app's public URL as the backend's CORS origin (and vice-versa for `NEXTAUTH_URL`).

Fly is the most manual of the three — prefer Render/Railway unless you specifically want Fly's regions/volumes.

---

## 8. Option D — Vercel (frontend) + Render/Railway (backend)

Use if you already manage frontends on Vercel.

1. **Backend:** deploy via Option A or B exactly as above (you still need host + Postgres).
2. **Frontend on Vercel:** import the `frontend/` directory of the repo.
   - Set `NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (Vercel's `https://<project>.vercel.app`), and optional OAuth env vars **before** deploy.
   - The `next.config.js` rewrites for `/api/:path*` will proxy to the backend, and the axios client hits `NEXT_PUBLIC_API_URL` directly from the browser.
   - Add the Vercel domain to the backend's `BACKEND_CORS_ORIGINS`.
3. **Caveat:** Vercel serverless functions have per-request limits (10s default). The data-proxy API routes work, but you should keep chart/queries behind the backend (they are — the axios client talks to the backend directly, not through Vercel functions, for most calls).

---

## 9. Option E — Docker Compose on a VPS

The committed `docker-compose.yml` runs in dev mode (hot-reload volumes, `npm run dev`). For a server:

1. Create **production** Dockerfiles (or multistage):
   - `backend`: `CMD uvicorn app.main:app --host 0.0.0.0 --port 8000` (remove `--reload`; build the image, don't mount `./backend:/app`).
   - `frontend`: build with `npm ci && npm run build`, then `npm run start` (make the args `build:start`).
2. Update `docker-compose.yml`: replace the bind-mount volumes with named volumes only, and pass real env secrets via an `.env` file next to the compose file. Set `NEXT_PUBLIC_API_URL` and `BACKEND_CORS_ORIGINS` to whatever your domain is.
3. Put Nginx (or Caddy) in front: `example.com → frontend:3000`, and optionally proxy `/api/v1` to `backend:8000` for same-origin calls. Add TLS via Let's Encrypt.
4. `docker compose up -d --build`.

Good for a $6/mo Droplet/Hetzner box. Most control, most manual work, all your data stays on your own disk.

---

## 10. Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Frontend loads but every API call fails / 401 | `NEXT_PUBLIC_API_URL` wrong or still `localhost:8000` at build | Rebuild the frontend with the public HTTPS backend URL; check in the browser Network tab what host axios is calling |
| Browser blocks requests (CORS) | Backend `BACKEND_CORS_ORIGINS` doesn't include your frontend domain | Set `BACKEND_CORS_ORIGINS=["https://<frontend-domain>"]` and restart backend |
| Backend logs `pgvector extension not available` | Hosted Postgres lacks `vector`, or role lacks permission | Non-fatal — app continues without vector search. Render's Postgres supports it when created as pgvector-capable |
| Uploaded files vanish after redeploy | DuckDB/uploads live on ephemeral disk | Attach a disk/volume mounted at `/data` (Render Disk, Railway Volume, Fly mount) |
| NL query returns odd results or errors | No `OPENAI_API_KEY` → keyword fallback | Set a key, or accept degraded answers |
| First page load is slow | Free tier sleeps after inactivity | Click "Always-On" / use a paid instance, or add a scheduled ping |
| Auth pages redirect to `localhost` | `NEXTAUTH_URL` not set to the real domain | Set `NEXTAUTH_URL` to the public frontend URL and redeploy |
| Frontend build fails with "Invalid NEXT_PUBLIC env" or secrets error | Build-time env vars missing | All env vars must exist *before* `npm run build`, especially `NEXT_PUBLIC_API_URL` |

---

## 11. Verdict

- **GitHub Pages: no** — it serves static files only; DataLens needs a Node server + Python API + Postgres.
- **Render: yes** (easiest), **Railway: yes**, **Fly.io: yes** (manual), **Vercel frontend + hosted backend: yes**, **VPS + Docker Compose: yes**.
- Fastest path to a live URL: **Render**, following §5. Budget ~20 minutes + a GitHub repo push.