from datetime import datetime
from decimal import Decimal
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Integer, Numeric as SADecimal, DateTime, Enum, Text, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.scan import Scan
    from app.models.user import User


class Defect(Base):
    __tablename__ = "defects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    scan_id: Mapped[int] = mapped_column(ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    defect_type: Mapped[str] = mapped_column(
        Enum(
            "scratch", "crack", "contamination",
            "missing_pattern", "surface_defect", "other",
            name="defect_type_enum",
        ),
        nullable=False,
        index=True,
    )
    confidence: Mapped[Decimal] = mapped_column(SADecimal(5, 4), nullable=False)
    severity: Mapped[str] = mapped_column(
        Enum("low", "medium", "high", "critical", name="severity_enum"),
        nullable=False,
        index=True,
    )
    bbox_x: Mapped[Optional[int]] = mapped_column(Integer)
    bbox_y: Mapped[Optional[int]] = mapped_column(Integer)
    bbox_width: Mapped[Optional[int]] = mapped_column(Integer)
    bbox_height: Mapped[Optional[int]] = mapped_column(Integer)
    annotated_image_path: Mapped[Optional[str]] = mapped_column(String(1000))
    recommendation: Mapped[Optional[str]] = mapped_column(Text)
    is_false_positive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reviewed_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    # Relationships
    scan: Mapped["Scan"] = relationship("Scan", back_populates="defects")
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewed_by])

    def __repr__(self) -> str:
        return f"<Defect id={self.id} type={self.defect_type} severity={self.severity}>"
