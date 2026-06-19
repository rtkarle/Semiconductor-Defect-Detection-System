"""
PDF report generation service using ReportLab.
"""
import logging
import os
from datetime import datetime
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Color palette ─────────────────────────────────────────────────────────────
BRAND_BLUE = colors.HexColor("#1e40af")
BRAND_LIGHT = colors.HexColor("#dbeafe")
CRITICAL_RED = colors.HexColor("#dc2626")
HIGH_ORANGE = colors.HexColor("#ea580c")
MEDIUM_YELLOW = colors.HexColor("#d97706")
LOW_GREEN = colors.HexColor("#16a34a")
GRAY = colors.HexColor("#6b7280")
LIGHT_GRAY = colors.HexColor("#f9fafb")


def _severity_color(severity: str) -> colors.Color:
    return {
        "critical": CRITICAL_RED,
        "high": HIGH_ORANGE,
        "medium": MEDIUM_YELLOW,
        "low": LOW_GREEN,
    }.get(severity, GRAY)


def generate_scan_report(
    scan: object,
    defects: list,
    user: object,
    output_dir: str = None,
) -> str:
    """
    Generate a PDF report for a scan.
    Returns the file path of the generated PDF.
    """
    output_dir = output_dir or settings.REPORTS_DIR
    os.makedirs(output_dir, exist_ok=True)

    filename = f"{getattr(scan, 'scan_code', 'report').replace('-', '_')}.pdf"
    filepath = os.path.join(output_dir, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title=f"Inspection Report – {scan.scan_code}",
        author=settings.APP_NAME,
    )

    styles = getSampleStyleSheet()
    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    header_style = ParagraphStyle(
        "Header",
        parent=styles["Title"],
        fontSize=22,
        textColor=BRAND_BLUE,
        spaceAfter=4,
    )
    sub_style = ParagraphStyle(
        "Sub",
        parent=styles["Normal"],
        fontSize=10,
        textColor=GRAY,
        spaceAfter=2,
    )

    story.append(Paragraph("🔬 Semiconductor Defect Inspection Report", header_style))
    story.append(Paragraph(settings.APP_NAME, sub_style))
    story.append(HRFlowable(width="100%", thickness=2, color=BRAND_BLUE, spaceAfter=10))

    # ── Scan metadata table ───────────────────────────────────────────────────
    meta_data = [
        ["Scan Code", scan.scan_code, "Status", scan.status.upper()],
        ["Image File", scan.image_filename, "Date", scan.created_at.strftime("%Y-%m-%d %H:%M UTC")],
        ["Inspector", user.full_name, "Company", user.company or "—"],
        ["Image Size (KB)", str(scan.image_size_kb or "—"), "Processing Time (ms)", str(scan.processing_time_ms or "—")],
    ]
    meta_table = Table(meta_data, colWidths=[45 * mm, 60 * mm, 40 * mm, 50 * mm])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), BRAND_LIGHT),
                ("BACKGROUND", (2, 0), (2, -1), BRAND_LIGHT),
                ("TEXTCOLOR", (0, 0), (0, -1), BRAND_BLUE),
                ("TEXTCOLOR", (2, 0), (2, -1), BRAND_BLUE),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, LIGHT_GRAY]),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 10 * mm))

    # ── Wafer image ───────────────────────────────────────────────────────────
    image_path = getattr(scan, "image_path", None)
    # Prefer annotated image if available
    if defects:
        annotated = getattr(defects[0], "annotated_image_path", None)
        if annotated and os.path.exists(annotated):
            image_path = annotated

    if image_path and os.path.exists(image_path):
        try:
            story.append(Paragraph("Scanned Image", styles["Heading2"]))
            img = Image(image_path, width=120 * mm, height=80 * mm, kind="proportional")
            story.append(img)
            story.append(Spacer(1, 6 * mm))
        except Exception as exc:
            logger.warning("Could not embed image in report: %s", exc)

    # ── Defect summary ────────────────────────────────────────────────────────
    story.append(Paragraph("Defect Detection Summary", styles["Heading2"]))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceAfter=6))

    if not defects:
        story.append(Paragraph("✅ No defects detected. Wafer passed quality inspection.", styles["Normal"]))
    else:
        # Summary stats
        story.append(
            Paragraph(
                f"Total defects detected: <b>{len(defects)}</b>  |  "
                f"Critical: <b>{sum(1 for d in defects if d.severity == 'critical')}</b>  |  "
                f"High: <b>{sum(1 for d in defects if d.severity == 'high')}</b>",
                styles["Normal"],
            )
        )
        story.append(Spacer(1, 4 * mm))

        # Defect table
        table_header = ["#", "Defect Type", "Confidence", "Severity", "Bounding Box", "Timestamp"]
        table_rows = [table_header]
        for i, d in enumerate(defects, 1):
            bbox = f"({d.bbox_x},{d.bbox_y}) {d.bbox_width}×{d.bbox_height}" if d.bbox_x is not None else "—"
            table_rows.append(
                [
                    str(i),
                    d.defect_type.replace("_", " ").title(),
                    f"{float(d.confidence)*100:.1f}%",
                    d.severity.upper(),
                    bbox,
                    d.created_at.strftime("%H:%M:%S"),
                ]
            )

        defect_table = Table(table_rows, colWidths=[10 * mm, 38 * mm, 26 * mm, 24 * mm, 45 * mm, 30 * mm])
        style_cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]
        # Colour-code severity cells
        for i, d in enumerate(defects, 1):
            style_cmds.append(("TEXTCOLOR", (3, i), (3, i), _severity_color(d.severity)))
            style_cmds.append(("FONTNAME", (3, i), (3, i), "Helvetica-Bold"))
        defect_table.setStyle(TableStyle(style_cmds))
        story.append(defect_table)
        story.append(Spacer(1, 6 * mm))

        # ── Recommendations ───────────────────────────────────────────────────
        story.append(Paragraph("Recommendations", styles["Heading2"]))
        story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE, spaceAfter=6))
        for i, d in enumerate(defects, 1):
            if d.recommendation:
                rec_style = ParagraphStyle(
                    f"Rec{i}",
                    parent=styles["Normal"],
                    leftIndent=10,
                    spaceAfter=4,
                    fontSize=9,
                )
                story.append(
                    Paragraph(
                        f"<b>[{i}] {d.defect_type.replace('_', ' ').title()} "
                        f"({d.severity.upper()}):</b> {d.recommendation}",
                        rec_style,
                    )
                )

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 10 * mm))
    story.append(HRFlowable(width="100%", thickness=1, color=GRAY, spaceAfter=4))
    footer_style = ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=GRAY)
    story.append(
        Paragraph(
            f"Generated by {settings.APP_NAME} v{settings.APP_VERSION}  |  "
            f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}  |  "
            "This report is for internal quality control purposes only.",
            footer_style,
        )
    )

    doc.build(story)
    logger.info("PDF report generated: %s", filepath)
    return filepath
