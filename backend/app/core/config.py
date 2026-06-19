"""
Application configuration — reads from .env via pydantic-settings.
"""
from functools import lru_cache
from typing import List

from pydantic import AnyHttpUrl, EmailStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────
    APP_NAME: str = "AI Semiconductor Defect Detection"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    API_V1_PREFIX: str = "/api/v1"

    # ── CORS ─────────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ── Database ─────────────────────────────────────────────
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "semiconductor_defect_db"
    DB_USER: str = "root"
    DB_PASSWORD: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    # ── JWT ──────────────────────────────────────────────────
    SECRET_KEY: str = "change_me_in_production_use_long_random_string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── File Storage ─────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"
    REPORTS_DIR: str = "reports"
    MAX_UPLOAD_SIZE_MB: int = 20
    ALLOWED_IMAGE_TYPES: str = "image/jpeg,image/png,image/tiff,image/bmp"

    @property
    def allowed_image_types_list(self) -> List[str]:
        return [t.strip() for t in self.ALLOWED_IMAGE_TYPES.split(",")]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    # ── AI Model ─────────────────────────────────────────────
    MODEL_WEIGHTS_PATH: str = "../ai_model/weights/defect_model.h5"
    YOLO_WEIGHTS_PATH: str = "../ai_model/weights/yolov8_defect.pt"
    CONFIDENCE_THRESHOLD: float = 0.50

    # ── Email ─────────────────────────────────────────────────
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@semiconductor-ai.com"
    MAIL_FROM_NAME: str = "Semiconductor AI System"
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_TLS: bool = True
    MAIL_SSL: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
