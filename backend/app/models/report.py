from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Numeric as SADecimal, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.scan import Scan
    from app.models.user import User


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    scan_id: Mapped[int] = mapped_column(ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    report_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    report_type: Mapped[str] = mapped_column(
        Enum("scan", "weekly", "monthly", "custom", name="report_type_enum"),
        nullable=False,
        default="scan",
    )
    file_path: Mapped[Optional[str]] = mapped_column(String(1000))
    file_size_kb: Mapped[Optional[Decimal]] = mapped_column(SADecimal(10, 2))
    status: Mapped[str] = mapped_column(
        Enum("generating", "ready", "failed", name="report_status_enum"),
        nullable=False,
        default="generating",
        index=True,
    )
    generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    scan: Mapped["Scan"] = relationship("Scan", back_populates="reports")
    user: Mapped["User"] = relationship("User", back_populates="reports")

    def __repr__(self) -> str:
        return f"<Report id={self.id} code={self.report_code} status={self.status}>"
