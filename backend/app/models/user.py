from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Boolean, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.scan import Scan
    from app.models.report import Report
    from app.models.notification import Notification
    from app.models.audit_log import AuditLog


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("admin", "engineer", "viewer", name="user_role"),
        nullable=False,
        default="engineer",
    )
    company: Mapped[Optional[str]] = mapped_column(String(200))
    department: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(30))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reset_token: Mapped[Optional[str]] = mapped_column(String(255))
    reset_token_exp: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    scans: Mapped[List["Scan"]] = relationship("Scan", back_populates="user", cascade="all, delete-orphan")
    reports: Mapped[List["Report"]] = relationship("Report", back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
