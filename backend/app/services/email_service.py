"""
Email sending service using aiosmtplib / fastapi-mail.
Falls back gracefully when SMTP credentials are not configured.
"""
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


async def _send(to_email: str, subject: str, html_body: str) -> bool:
    """Low-level SMTP send. Returns True on success."""
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        logger.warning("SMTP not configured — email not sent to %s", to_email)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.MAIL_FROM_NAME} <{settings.MAIL_FROM}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.MAIL_SERVER,
            port=settings.MAIL_PORT,
            username=settings.MAIL_USERNAME,
            password=settings.MAIL_PASSWORD,
            use_tls=settings.MAIL_SSL,
            start_tls=settings.MAIL_TLS,
        )
        logger.info("Email sent to %s: %s", to_email, subject)
        return True
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False


async def send_reset_password_email(email: str, name: str, token: str) -> None:
    reset_url = f"http://localhost:3000/reset-password?token={token}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#1e40af">Password Reset Request</h2>
      <p>Hello <strong>{name}</strong>,</p>
      <p>We received a request to reset your password. Click the button below within 1 hour:</p>
      <a href="{reset_url}"
         style="display:inline-block;padding:12px 24px;background:#1e40af;color:#fff;
                text-decoration:none;border-radius:6px;margin:16px 0">
        Reset Password
      </a>
      <p>If you did not request this, please ignore this email.</p>
      <hr><p style="color:#6b7280;font-size:12px">Semiconductor AI Defect Detection System</p>
    </div>
    """
    await _send(email, "Reset Your Password — Semiconductor AI", html)


async def send_critical_defect_email(
    email: str,
    name: str,
    scan_code: str,
    defect_type: str,
    confidence: float,
    severity: str,
    recommendation: str,
) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="background:#dc2626;color:#fff;padding:16px;border-radius:8px 8px 0 0">
        <h2 style="margin:0">⚠️ CRITICAL Defect Detected</h2>
      </div>
      <div style="background:#fff1f2;padding:24px;border:1px solid #fecaca;border-radius:0 0 8px 8px">
        <p>Hello <strong>{name}</strong>,</p>
        <p>A <strong>{severity.upper()}</strong> defect has been detected in scan
           <code>{scan_code}</code>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb"><strong>Defect Type</strong></td>
              <td style="padding:8px;border:1px solid #e5e7eb">{defect_type.replace("_"," ").title()}</td></tr>
          <tr><td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb"><strong>Confidence</strong></td>
              <td style="padding:8px;border:1px solid #e5e7eb">{confidence*100:.1f}%</td></tr>
          <tr><td style="padding:8px;background:#f9fafb;border:1px solid #e5e7eb"><strong>Severity</strong></td>
              <td style="padding:8px;border:1px solid #e5e7eb;color:#dc2626"><strong>{severity.upper()}</strong></td></tr>
        </table>
        <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px;margin:16px 0">
          <strong>Recommendation:</strong><br>{recommendation}
        </div>
        <p>Please log in to the dashboard to review and take action immediately.</p>
      </div>
      <p style="color:#6b7280;font-size:12px;text-align:center">
        Semiconductor AI Defect Detection System
      </p>
    </div>
    """
    await _send(
        email,
        f"[{severity.upper()}] Defect Detected in {scan_code} — Semiconductor AI",
        html,
    )


async def send_report_ready_email(
    email: str, name: str, report_code: str, scan_code: str
) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#1e40af">📄 Inspection Report Ready</h2>
      <p>Hello <strong>{name}</strong>,</p>
      <p>Your inspection report <strong>{report_code}</strong> for scan
         <code>{scan_code}</code> has been generated and is ready for download.</p>
      <a href="http://localhost:3000/reports"
         style="display:inline-block;padding:12px 24px;background:#1e40af;color:#fff;
                text-decoration:none;border-radius:6px;margin:16px 0">
        View Report
      </a>
      <hr>
      <p style="color:#6b7280;font-size:12px">Semiconductor AI Defect Detection System</p>
    </div>
    """
    await _send(email, f"Report {report_code} is Ready — Semiconductor AI", html)
