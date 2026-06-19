from datetime import datetime
from decimal import Decimal
from typing import Optional, List

from pydantic import BaseModel, Field

from app.schemas.defect import DefectResponse


class ScanBase(BaseModel):
    notes: Optional[str] = None


class ScanCreate(ScanBase):
    pass  # image is handled as UploadFile in the route


class ScanResponse(BaseModel):
    id: int
    user_id: int
    scan_code: str
    image_filename: str
    image_path: str
    image_size_kb: Optional[Decimal] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    status: str
    processing_time_ms: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    defects: List[DefectResponse] = []

    model_config = {"from_attributes": True}


class ScanListResponse(BaseModel):
    id: int
    scan_code: str
    image_filename: str
    status: str
    defect_count: int = 0
    has_critical: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedScans(BaseModel):
    items: List[ScanListResponse]
    total: int
    page: int
    page_size: int
    pages: int
