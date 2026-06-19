from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class ReportResponse(BaseModel):
    id: int
    scan_id: int
    user_id: int
    report_code: str
    report_type: str
    file_path: Optional[str] = None
    file_size_kb: Optional[Decimal] = None
    status: str
    generated_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
