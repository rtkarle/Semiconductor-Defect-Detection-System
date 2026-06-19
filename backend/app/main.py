"""
FastAPI application entry point.
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.database import init_db
from app.utils.helpers import ensure_dirs

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up %s v%s …", settings.APP_NAME, settings.APP_VERSION)
    ensure_dirs()
    init_db()
    yield
    logger.info("Shutting down …")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered semiconductor wafer / chip defect detection API",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow all in dev, explicit list in production
if settings.ENVIRONMENT == "development":
    cors_origins_list = ["*"]
    allow_creds = False
else:
    cors_origins_list = [
        "https://semiconductor-defect-detection-system-5u68uygkl.vercel.app",
        "https://semiconductor-defect-detection-system.vercel.app",
        "https://semiconductor-defect-detection-rtkarle.vercel.app",
        "https://semiconductor-defect-detection.vercel.app",
        "https://semiconductor-defect-api1.onrender.com",
    ] + settings.cors_origins
    allow_creds = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (uploaded images & generated reports)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/reports", StaticFiles(directory=settings.REPORTS_DIR), name="reports")

# ── Routers ───────────────────────────────────────────────────────────────────
from app.api.routes.auth import router as auth_router
from app.api.routes.scans import router as scans_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.reports import router as reports_router
from app.api.routes.notifications import router as notifications_router
from app.api.routes.users import router as users_router

PREFIX = settings.API_V1_PREFIX

app.include_router(auth_router,          prefix=PREFIX)
app.include_router(users_router,         prefix=PREFIX)
app.include_router(scans_router,         prefix=PREFIX)
app.include_router(analytics_router,     prefix=PREFIX)
app.include_router(reports_router,       prefix=PREFIX)
app.include_router(notifications_router, prefix=PREFIX)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "version": settings.APP_VERSION, "app": settings.APP_NAME}


# ── Global error handler ─────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s: %s", request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )
