"""
Authentication routes: register, login, refresh, forgot/reset password.
"""
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_reset_token,
    decode_token,
    hash_password,
    verify_password,
    verify_reset_token,
)
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    LoginRequest,
    PasswordChange,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.services.email_service import send_reset_password_email

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _log(db: Session, user_id: int | None, action: str, request: Request, details: dict | None = None):
    log = AuditLog(
        user_id=user_id,
        action=action,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details=details,
    )
    db.add(log)


# ── Register ─────────────────────────────────────────────────────────────────
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        company=payload.company,
        department=payload.department,
        phone=payload.phone,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _log(db, user.id, "REGISTER", request)
    db.commit()
    return user


# ── Login ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled.")

    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    _log(db, user.id, "LOGIN", request)
    db.commit()

    return TokenResponse(
        access_token=create_access_token(user.id, {"role": user.role, "email": user.email}),
        refresh_token=create_refresh_token(user.id),
        user=user,
    )


# ── Refresh token ─────────────────────────────────────────────────────────────
@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    from jose import JWTError

    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token.")
        user_id = int(data["sub"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive.")

    return TokenResponse(
        access_token=create_access_token(user.id, {"role": user.role, "email": user.email}),
        refresh_token=create_refresh_token(user.id),
        user=user,
    )


# ── Forgot password ───────────────────────────────────────────────────────────
@router.post("/forgot-password", status_code=200)
async def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return success to prevent email enumeration
    if user:
        token = create_reset_token(user.email)
        user.reset_token = token
        user.reset_token_exp = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        await send_reset_password_email(user.email, user.full_name, token)
    return {"message": "If that email is registered, a reset link has been sent."}


# ── Reset password ────────────────────────────────────────────────────────────
@router.post("/reset-password", status_code=200)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = verify_reset_token(payload.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user = db.query(User).filter(User.email == email, User.reset_token == payload.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_exp = None
    db.commit()
    return {"message": "Password reset successfully."}


# ── Get current user (me) ─────────────────────────────────────────────────────
@router.get("/me", response_model=UserResponse)
def get_me(current_user: Annotated[User, Depends(get_current_active_user)]):
    return current_user


# ── Update profile ────────────────────────────────────────────────────────────
@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Change password ───────────────────────────────────────────────────────────
@router.post("/change-password", status_code=200)
def change_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully."}
