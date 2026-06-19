"""
Shared utility functions used across the backend.
"""
import os
import uuid
from datetime import datetime, timezone

from app.core.config import settings


def generate_scan_code() -> str:
    """Generate a unique scan code like SCAN-20240617-XXXX."""
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    uid = uuid.uuid4().hex[:6].upper()
    return f"SCAN-{today}-{uid}"


def generate_report_code() -> str:
    """Generate a unique report code like RPT-20240617-XXXX."""
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    uid = uuid.uuid4().hex[:6].upper()
    return f"RPT-{today}-{uid}"


def ensure_dirs() -> None:
    """Create upload and report directories if they don't exist."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.REPORTS_DIR, exist_ok=True)


def get_severity_from_confidence(confidence: float, defect_type: str) -> str:
    """
    Derive severity level from confidence score and defect type.
    Business rules:
        crack / missing_pattern       → always at least high
        contamination                 → high/critical at ≥ 0.85
        All others                    → scale with confidence
    """
    base: str
    if defect_type in ("crack", "missing_pattern"):
        base = "critical" if confidence >= 0.85 else "high"
    elif defect_type == "contamination":
        if confidence >= 0.90:
            base = "critical"
        elif confidence >= 0.75:
            base = "high"
        else:
            base = "medium"
    else:
        if confidence >= 0.90:
            base = "high"
        elif confidence >= 0.70:
            base = "medium"
        else:
            base = "low"
    return base


RECOMMENDATIONS: dict[str, str] = {
    "scratch": (
        "Inspect stylus pressure and reduce contact force on wafer surface. "
        "Check handler robot calibration to prevent mechanical scratching."
    ),
    "crack": (
        "Remove wafer from production immediately. "
        "Schedule full equipment maintenance and structural integrity check."
    ),
    "contamination": (
        "Clean inspection chamber and production line immediately. "
        "Review air-filtration systems and personnel entry protocols."
    ),
    "missing_pattern": (
        "Halt batch processing. Perform lithography mask alignment check. "
        "Review photoresist exposure parameters."
    ),
    "surface_defect": (
        "Inspect surface preparation process. "
        "Review chemical-mechanical polishing (CMP) parameters and slurry quality."
    ),
    "other": (
        "Unclassified defect detected. Escalate to quality engineering team for manual review. "
        "Quarantine affected wafer batch."
    ),
}


def get_recommendation(defect_type: str) -> str:
    return RECOMMENDATIONS.get(defect_type, RECOMMENDATIONS["other"])
