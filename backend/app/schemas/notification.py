from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    scan_id: Optional[int] = None
    report_id: Optional[int] = None
    type: str
    subject: str
    message: str
    channel: str
    is_read: bool
    email_sent: bool
    email_sent_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationMarkRead(BaseModel):
    notification_ids: list[int]
