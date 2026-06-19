"""
Scan routes: upload image, trigger AI prediction, list, detail, delete.
"""
import math
import os
import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_active_user, require_engineer_or_admin
from app.models.defect import Defect
from app.models.notification import Notification
from app.models.scan import Scan
from app.models.user import User
from app.schemas.defect import DefectUpdate
from app.schemas.scan import PaginatedScans, ScanListResponse, ScanResponse
from app.services.prediction_service import run_prediction
from app.services.email_service import send_critical_defect_email
from app.utils.helpers import generate_scan_code

router = APIRouter(prefix="/scans", tags=["Scans"])


# ── Upload & predict ──────────────────────────────────────────────────────────
@router.post("/upload", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def upload_and_predict(
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_admin),
):
    # --- Validate file type ---
    if file.content_type not in settings.allowed_image_types_list:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. "
                   f"Allowed: {', '.join(settings.allowed_image_types_list)}",
        )

    # --- Validate file size ---
    contents = await file.read()
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # --- Save file to disk ---
    ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(contents)

    # --- Create scan record ---
    scan = Scan(
        user_id=current_user.id,
        scan_code=generate_scan_code(),
        image_filename=file.filename or unique_name,
        image_path=save_path,
        image_size_kb=round(len(contents) / 1024, 2),
        status="processing",
        notes=notes,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # --- Run AI prediction ---
    try:
        prediction_result = await run_prediction(save_path, scan.id)
        scan.image_width = prediction_result.get("width")
        scan.image_height = prediction_result.get("height")
        scan.processing_time_ms = prediction_result.get("processing_time_ms")
        scan.status = "completed"

        defects_created = []
        for det in prediction_result.get("detections", []):
            defect = Defect(
                scan_id=scan.id,
                defect_type=det["defect_type"],
                confidence=det["confidence"],
                severity=det["severity"],
                bbox_x=det.get("bbox_x"),
                bbox_y=det.get("bbox_y"),
                bbox_width=det.get("bbox_width"),
                bbox_height=det.get("bbox_height"),
                annotated_image_path=det.get("annotated_image_path"),
                recommendation=det.get("recommendation"),
            )
            db.add(defect)
            defects_created.append(defect)

        db.commit()
        db.refresh(scan)

        # --- Notify on critical defects ---
        for defect in defects_created:
            if defect.severity in ("critical", "high"):
                notif = Notification(
                    user_id=current_user.id,
                    scan_id=scan.id,
                    type="critical_defect",
                    subject=f"[{defect.severity.upper()}] Defect in {scan.scan_code}",
                    message=(
                        f"A {defect.severity} {defect.defect_type.replace('_', ' ')} defect "
                        f"was detected with {float(defect.confidence)*100:.1f}% confidence."
                    ),
                    channel="both",
                )
                db.add(notif)
                db.commit()
                # Send email asynchronously (fire-and-forget pattern)
                try:
                    await send_critical_defect_email(
                        email=current_user.email,
                        name=current_user.full_name,
                        scan_code=scan.scan_code,
                        defect_type=defect.defect_type,
                        confidence=float(defect.confidence),
                        severity=defect.severity,
                        recommendation=defect.recommendation or "",
                    )
                    notif.email_sent = True
                    notif.email_sent_at = datetime.now(timezone.utc)
                    db.commit()
                except Exception:
                    pass  # Email failure should not break the scan flow

    except Exception as exc:
        scan.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(exc)}")

    db.refresh(scan)
    return scan


# ── List scans (paginated + filterable) ───────────────────────────────────────
@router.get("/", response_model=PaginatedScans)
def list_scans(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    from sqlalchemy import func, desc, asc

    query = db.query(Scan)

    # Non-admins see only their own scans
    if current_user.role != "admin":
        query = query.filter(Scan.user_id == current_user.id)

    if status_filter:
        query = query.filter(Scan.status == status_filter)
    if search:
        query = query.filter(
            Scan.scan_code.ilike(f"%{search}%") |
            Scan.image_filename.ilike(f"%{search}%")
        )

    # Sorting
    sort_col = getattr(Scan, sort_by, Scan.created_at)
    query = query.order_by(desc(sort_col) if sort_dir == "desc" else asc(sort_col))

    total = query.count()
    scans = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for s in scans:
        defect_list = db.query(Defect).filter(Defect.scan_id == s.id).all()
        items.append(
            ScanListResponse(
                id=s.id,
                scan_code=s.scan_code,
                image_filename=s.image_filename,
                status=s.status,
                defect_count=len(defect_list),
                has_critical=any(d.severity == "critical" for d in defect_list),
                created_at=s.created_at,
            )
        )

    return PaginatedScans(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total else 1,
    )


# ── Get single scan detail ────────────────────────────────────────────────────
@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")
    if current_user.role != "admin" and scan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return scan


# ── Delete scan ───────────────────────────────────────────────────────────────
@router.delete("/{scan_id}", status_code=204)
def delete_scan(
    scan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_admin),
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")
    if current_user.role != "admin" and scan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Remove image file from disk
    if os.path.exists(scan.image_path):
        os.remove(scan.image_path)

    db.delete(scan)
    db.commit()


# ── Update defect (mark false positive / update recommendation) ───────────────
@router.patch("/{scan_id}/defects/{defect_id}", response_model=dict)
def update_defect(
    scan_id: int,
    defect_id: int,
    payload: DefectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_engineer_or_admin),
):
    defect = db.query(Defect).filter(Defect.id == defect_id, Defect.scan_id == scan_id).first()
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found.")

    if payload.is_false_positive is not None:
        defect.is_false_positive = payload.is_false_positive
        defect.reviewed_by = current_user.id
        defect.reviewed_at = datetime.now(timezone.utc)
    if payload.recommendation is not None:
        defect.recommendation = payload.recommendation

    db.commit()
    return {"message": "Defect updated successfully."}
