"""
Analytics & dashboard routes.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.defect import Defect
from app.models.scan import Scan
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ── Dashboard summary ─────────────────────────────────────────────────────────
@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    base_scan_q = db.query(Scan)
    base_defect_q = db.query(Defect)

    if current_user.role != "admin":
        base_scan_q = base_scan_q.filter(Scan.user_id == current_user.id)
        base_defect_q = base_defect_q.join(Scan).filter(Scan.user_id == current_user.id)

    total_scans = base_scan_q.count()
    completed_scans = base_scan_q.filter(Scan.status == "completed").count()
    failed_scans = base_scan_q.filter(Scan.status == "failed").count()

    total_defects = base_defect_q.filter(Defect.is_false_positive == False).count()
    critical_defects = base_defect_q.filter(
        Defect.severity == "critical", Defect.is_false_positive == False
    ).count()
    high_defects = base_defect_q.filter(
        Defect.severity == "high", Defect.is_false_positive == False
    ).count()

    # Scans with at least one defect = "defective chips"
    defective_scans = (
        base_scan_q.filter(Scan.status == "completed")
        .join(Defect, Scan.id == Defect.scan_id)
        .filter(Defect.is_false_positive == False)
        .distinct()
        .count()
    )
    healthy_scans = completed_scans - defective_scans
    defect_rate = round((defective_scans / completed_scans * 100), 2) if completed_scans else 0.0

    # Average confidence
    avg_conf_row = base_defect_q.filter(Defect.is_false_positive == False).with_entities(
        func.avg(Defect.confidence)
    ).scalar()
    avg_confidence = round(float(avg_conf_row) * 100, 1) if avg_conf_row else 0.0

    # Quality score = 100 - defect_rate (clamped 0-100)
    quality_score = max(0.0, round(100.0 - defect_rate, 1))

    # Recent scans (last 5)
    recent_scans = (
        base_scan_q.order_by(Scan.created_at.desc()).limit(5).all()
    )
    recent = []
    for s in recent_scans:
        defects = db.query(Defect).filter(
            Defect.scan_id == s.id, Defect.is_false_positive == False
        ).all()
        recent.append(
            {
                "scan_code": s.scan_code,
                "image_filename": s.image_filename,
                "status": s.status,
                "defect_count": len(defects),
                "has_critical": any(d.severity == "critical" for d in defects),
                "created_at": s.created_at.isoformat(),
            }
        )

    return {
        "total_scans": total_scans,
        "completed_scans": completed_scans,
        "failed_scans": failed_scans,
        "total_defects": total_defects,
        "defective_chips": defective_scans,
        "healthy_chips": healthy_scans,
        "defect_rate": defect_rate,
        "critical_defects": critical_defects,
        "high_defects": high_defects,
        "avg_confidence_pct": avg_confidence,
        "quality_score": quality_score,
        "recent_scans": recent,
    }


# ── Defect type distribution (Pie chart) ─────────────────────────────────────
@router.get("/defect-types")
def get_defect_type_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Defect.defect_type, func.count(Defect.id).label("count"))
    if current_user.role != "admin":
        q = q.join(Scan).filter(Scan.user_id == current_user.id)
    q = q.filter(Defect.is_false_positive == False).group_by(Defect.defect_type).all()

    return [{"defect_type": row.defect_type, "count": row.count} for row in q]


# ── Severity distribution ─────────────────────────────────────────────────────
@router.get("/severity-distribution")
def get_severity_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = db.query(Defect.severity, func.count(Defect.id).label("count"))
    if current_user.role != "admin":
        q = q.join(Scan).filter(Scan.user_id == current_user.id)
    q = q.filter(Defect.is_false_positive == False).group_by(Defect.severity).all()

    return [{"severity": row.severity, "count": row.count} for row in q]


# ── Monthly scan trends ───────────────────────────────────────────────────────
@router.get("/monthly-trends")
def get_monthly_trends(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=months * 30)

    scan_q = (
        db.query(
            extract("year", Scan.created_at).label("year"),
            extract("month", Scan.created_at).label("month"),
            func.count(Scan.id).label("total"),
        )
        .filter(Scan.created_at >= cutoff, Scan.status == "completed")
    )
    if current_user.role != "admin":
        scan_q = scan_q.filter(Scan.user_id == current_user.id)
    scan_rows = scan_q.group_by("year", "month").order_by("year", "month").all()

    defect_q = (
        db.query(
            extract("year", Defect.created_at).label("year"),
            extract("month", Defect.created_at).label("month"),
            func.count(Defect.id).label("total"),
        )
        .filter(Defect.created_at >= cutoff, Defect.is_false_positive == False)
    )
    if current_user.role != "admin":
        defect_q = defect_q.join(Scan).filter(Scan.user_id == current_user.id)
    defect_rows = defect_q.group_by("year", "month").order_by("year", "month").all()

    # Build month label map
    months_map: dict[str, dict] = {}
    for row in scan_rows:
        key = f"{int(row.year):04d}-{int(row.month):02d}"
        months_map.setdefault(key, {"month": key, "scans": 0, "defects": 0})
        months_map[key]["scans"] = row.total
    for row in defect_rows:
        key = f"{int(row.year):04d}-{int(row.month):02d}"
        months_map.setdefault(key, {"month": key, "scans": 0, "defects": 0})
        months_map[key]["defects"] = row.total

    return sorted(months_map.values(), key=lambda x: x["month"])


# ── Defect frequency analysis ─────────────────────────────────────────────────
@router.get("/defect-frequency")
def get_defect_frequency(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    q = (
        db.query(
            func.date(Defect.created_at).label("date"),
            func.count(Defect.id).label("count"),
        )
        .filter(Defect.created_at >= cutoff, Defect.is_false_positive == False)
    )
    if current_user.role != "admin":
        q = q.join(Scan).filter(Scan.user_id == current_user.id)
    rows = q.group_by("date").order_by("date").all()

    return [{"date": str(row.date), "count": row.count} for row in rows]


# ── Quality score over time ───────────────────────────────────────────────────
@router.get("/quality-score")
def get_quality_score_trend(
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=months * 30)

    scan_q = (
        db.query(
            extract("year", Scan.created_at).label("year"),
            extract("month", Scan.created_at).label("month"),
            func.count(Scan.id).label("total"),
        )
        .filter(Scan.created_at >= cutoff, Scan.status == "completed")
    )
    if current_user.role != "admin":
        scan_q = scan_q.filter(Scan.user_id == current_user.id)
    scan_rows = {
        f"{int(r.year):04d}-{int(r.month):02d}": r.total
        for r in scan_q.group_by("year", "month").all()
    }

    defect_q = (
        db.query(
            extract("year", Defect.created_at).label("year"),
            extract("month", Defect.created_at).label("month"),
            func.count(Defect.id).label("total"),
        )
        .filter(Defect.created_at >= cutoff, Defect.is_false_positive == False)
    )
    if current_user.role != "admin":
        defect_q = defect_q.join(Scan).filter(Scan.user_id == current_user.id)
    defect_rows = {
        f"{int(r.year):04d}-{int(r.month):02d}": r.total
        for r in defect_q.group_by("year", "month").all()
    }

    result = []
    for key, scans in scan_rows.items():
        defects = defect_rows.get(key, 0)
        defect_rate = (defects / scans * 100) if scans else 0
        quality_score = max(0.0, round(100.0 - defect_rate, 1))
        result.append({"month": key, "quality_score": quality_score, "defect_rate": round(defect_rate, 2)})

    return sorted(result, key=lambda x: x["month"])
