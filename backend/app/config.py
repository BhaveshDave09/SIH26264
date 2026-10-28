import os
from typing import List

class Settings:
    APP_NAME: str = "NivaranX"
    APP_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "aicte_sentinel_super_secret_jwt_key_sih2026_demo_only")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours for demo ease
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./aicte_sentinel.db")
    
    # Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx", ".jpg", ".jpeg", ".png", ".txt"]
    
    # Cross-Bureau Intelligence Engine Thresholds
    MATCH_THRESHOLD_DUPLICATE: float = 0.85
    MATCH_THRESHOLD_RELATED: float = 0.65
    MATCH_THRESHOLD_COORDINATION: float = 0.45
    
    # SLA Thresholds (in days)
    SLA_WARNING_DAYS: int = 7
    SLA_ESCALATION_DAYS: int = 15
    
    # CORS
    cors_env = os.getenv("CORS_ORIGINS", "")
    if cors_env == "*":
        CORS_ORIGINS: List[str] = ["*"]
    elif cors_env:
        CORS_ORIGINS: List[str] = [origin.strip() for origin in cors_env.split(",") if origin.strip()]
    else:
        CORS_ORIGINS: List[str] = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "*"
        ]


settings = Settings()
