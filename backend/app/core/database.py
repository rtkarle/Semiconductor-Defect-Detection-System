"""
SQLAlchemy database engine, session factory, and base model.
"""
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from typing import Generator

from app.core.config import settings


# ── Engine ────────────────────────────────────────────────────────────────────
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,          # reconnect on stale connections
    pool_recycle=3600,           # recycle connections every hour
    pool_size=10,
    max_overflow=20,
    echo=settings.DEBUG,
)


# ── Session factory ───────────────────────────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# ── Declarative base ──────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── Dependency ────────────────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables (used during startup / testing)."""
    # Import all models so SQLAlchemy registers them before create_all
    from app.models import user, scan, defect, report, notification, audit_log  # noqa: F401
    Base.metadata.create_all(bind=engine)
