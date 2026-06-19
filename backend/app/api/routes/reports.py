"""
Report routes: generate PDF, list, download, delete.
"""
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.defect import Defect
from app.models.notification import Notification
from app.models.report import Report
from app.models.scan import Scan
from app.models.user import User
from app.schemas.report import ReportResponse
from app.services.email_service import send_report_ready_email
from app.services.report_service import generate_scan_report
from app.utils.helpers import generate_report_code

router = APIRouter(prefix="/reports", tags=["Reports"])


def _generate_report_task(
    report_id: int,
    scan_id: int,
    user_id: int,
    db_factory,
):
    """Background task: generate PDF and update report record."""
    db: Session = db_factory()
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        defects = db.query(Defect).filter(
            Defect.scan_id == scan_id, Defect.is_false_positive == False
        ).all()

        if not report or not scan or not user:
            return

        pdf_path = generate_scan_report(scan, defects, user)
        file_size = os.path.getsize(pdf_path) / 1024 if os.path.exists(pdf_path) else 0

        report.file_path = pdf_path
        report.file_size_kb = round(file_size, 2)
        report.status = "ready"
        report.generated_at = datetime.now(timezone.utc)
        db.commit()

        # In-app notification
        notif = Notification(
            user_id=user_id,
            report_id=report_id,
            type="report_ready",
            subject=f"Report {report.report_code} is Ready",
            message=f"Your inspection report for scan {scan.scan_code} has been generated.",
            channel="both",
        )
        db.add(notif)
        db.commit()

        # Email notification (synchronous in background thread — acceptable for reports)
        import asyncio
        try:
            loop = asyncio.new_event_loop()
            loop.run_until_complete(
                send_report_ready_email(user.email, user.full_name, report.report_code, scan.scan_code)
            )
            notif.email_sent = True
            notif.email_sent_at = datetime.now(timezone.utc)
            db.commit()
        except Exception:
            pass
        finally:
            loop.close()

    except Exception as exc:
        report = db.query(Report).filter(Report.id == report_id).first()
        if report:
            report.status = "failed"
            db.commit()
    finally:
        db.close()


# ── Generate report ───────────────────────────────────────────────────────────
@router.post("/{scan_id}/generate", response_model=ReportResponse, status_code=202)
def generate_report(
    scan_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found.")
    if current_user.role != "admin" and scan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if scan.status != "completed":
        raise HTTPException(status_code=400, detail="Cannot generate report for an incomplete scan.")

    # Create report record immediately
    report = Report(
        scan_id=scan_id,
        user_id=current_user.id,
        report_code=generate_report_code(),
        report_type="scan",
        status="generating",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    from app.core.database import SessionLocal
    background_tasks.add_task(
        _generate_report_task,
        report.id,
        scan_id,
        current_user.id,
        SessionLocal,
    )

    return report


# ── List reports ──────────────────────────────────────────────────────────────
@router.get("/", response_model=list[ReportResponse])
def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Report)
    if current_user.role != "admin":
        q = q.filter(Report.user_id == current_user.id)
    reports = q.order_by(Report.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return reports


# ── Download report PDF ───────────────────────────────────────────────────────
@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    if current_user.role != "admin" and report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if report.status != "ready" or not report.file_path:
        raise HTTPException(status_code=400, detail="Report is not ready yet.")
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found on disk.")

    return FileResponse(
        path=report.file_path,
        media_type="application/pdf",
        filename=f"{report.report_code}.pdf",
    )


# ── Get report status ─────────────────────────────────────────────────────────
@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    if current_user.role != "admin" and report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return report


# ── Delete report ─────────────────────────────────────────────────────────────
@router.delete("/{report_id}", status_code=204)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    if current_user.role != "admin" and report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    if report.file_path and os.path.exists(report.file_path):
        os.remove(report.file_path)
    db.delete(report)
    db.commit()
