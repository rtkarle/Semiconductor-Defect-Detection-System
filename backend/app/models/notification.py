from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, DateTime, Enum, Text, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.scan import Scan
    from app.models.report import Report


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    scan_id: Mapped[Optional[int]] = mapped_column(ForeignKey("scans.id", ondelete="SET NULL"))
    report_id: Mapped[Optional[int]] = mapped_column(ForeignKey("reports.id", ondelete="SET NULL"))
    type: Mapped[str] = mapped_column(
        Enum("critical_defect", "report_ready", "system", "info", name="notification_type_enum"),
        nullable=False,
        index=True,
    )
    subject: Mapped[str] = mapped_column(String(300), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[str] = mapped_column(
        Enum("email", "in_app", "both", name="notification_channel_enum"),
        nullable=False,
        default="both",
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    email_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False, index=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")
    scan: Mapped[Optional["Scan"]] = relationship("Scan", foreign_keys=[scan_id])
    report: Mapped[Optional["Report"]] = relationship("Report", foreign_keys=[report_id])

    def __repr__(self) -> str:
        return f"<Notification id={self.id} type={self.type} read={self.is_read}>"
