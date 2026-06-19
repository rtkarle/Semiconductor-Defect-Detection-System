from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class DefectResponse(BaseModel):
    id: int
    scan_id: int
    defect_type: str
    confidence: Decimal
    severity: str
    bbox_x: Optional[int] = None
    bbox_y: Optional[int] = None
    bbox_width: Optional[int] = None
    bbox_height: Optional[int] = None
    annotated_image_path: Optional[str] = None
    recommendation: Optional[str] = None
    is_false_positive: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DefectUpdate(BaseModel):
    is_false_positive: Optional[bool] = None
    recommendation: Optional[str] = None
