from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Base ─────────────────────────────────────────────────────────────────────
class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    role: str = Field(default="engineer", pattern="^(admin|engineer|viewer)$")
    company: Optional[str] = Field(None, max_length=200)
    department: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=30)


# ── Register request ─────────────────────────────────────────────────────────
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        return v


# ── Update request ───────────────────────────────────────────────────────────
class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    company: Optional[str] = Field(None, max_length=200)
    department: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=30)
    avatar_url: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        return v


# ── Response ─────────────────────────────────────────────────────────────────
class UserResponse(UserBase):
    id: int
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Auth ─────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
