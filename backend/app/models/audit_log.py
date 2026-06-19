from datetime import datetime
from typing import Optional, Any, TYPE_CHECKING

from sqlalchemy import String, Integer, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entity: Mapped[Optional[str]] = mapped_column(String(100))
    entity_id: Mapped[Optional[int]] = mapped_column(Integer)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    details: Mapped[Optional[Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action}>"
