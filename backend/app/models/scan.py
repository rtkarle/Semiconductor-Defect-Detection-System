from datetime import datetime
from decimal import Decimal
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import String, Integer, Numeric as SADecimal, DateTime, Enum, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.defect import Defect
    from app.models.report import Report


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scan_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    image_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    image_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    image_size_kb: Mapped[Optional[Decimal]] = mapped_column(SADecimal(10, 2))
    image_width: Mapped[Optional[int]] = mapped_column(Integer)
    image_height: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(
        Enum("pending", "processing", "completed", "failed", name="scan_status"),
        nullable=False,
        default="pending",
        index=True,
    )
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="scans")
    defects: Mapped[List["Defect"]] = relationship("Defect", back_populates="scan", cascade="all, delete-orphan")
    reports: Mapped[List["Report"]] = relationship("Report", back_populates="scan", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Scan id={self.id} code={self.scan_code} status={self.status}>"
