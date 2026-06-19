"""
JWT creation/verification and password hashing helpers.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ── Password hashing ──────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ───────────────────────────────────────────────────────────────────────
def _create_token(data: dict[str, Any], expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(subject: str | int, extra: dict | None = None) -> str:
    data: dict[str, Any] = {"sub": str(subject), "type": "access"}
    if extra:
        data.update(extra)
    return _create_token(data, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(subject: str | int) -> str:
    data: dict[str, Any] = {"sub": str(subject), "type": "refresh"}
    return _create_token(data, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT.  Raises JWTError on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def create_reset_token(email: str) -> str:
    data: dict[str, Any] = {"sub": email, "type": "reset"}
    return _create_token(data, timedelta(hours=1))


def verify_reset_token(token: str) -> Optional[str]:
    """Returns the email if the reset token is valid, else None."""
    try:
        payload = decode_token(token)
        if payload.get("type") != "reset":
            return None
        return payload.get("sub")
    except JWTError:
        return None
