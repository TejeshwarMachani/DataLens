from fastapi import APIRouter

from app.api.api_v1.endpoints import upload, datasets, profile, query, nl_query, charts, auth, dashboards

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(upload.router, prefix="/datasets", tags=["upload"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
api_router.include_router(profile.router, prefix="/datasets", tags=["profiling"])
api_router.include_router(query.router, prefix="/query", tags=["query"])
api_router.include_router(nl_query.router, prefix="/query", tags=["nl-query"])
api_router.include_router(charts.router, prefix="/charts", tags=["charts"])
api_router.include_router(dashboards.router, tags=["dashboards"])