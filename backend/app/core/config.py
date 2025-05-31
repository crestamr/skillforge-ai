"""
Configuration management for SkillForge AI Backend
"""

import os
from typing import List, Optional, Union
from functools import lru_cache


class Settings:
    """Application settings with environment variable support"""
    
    # Application
    PROJECT_NAME: str = "SkillForge AI Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Security
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://frontend:3000",
        "http://backend:8000"
    ]
    
    # Database URLs
    DATABASE_URL: str = "postgresql://skillforge_user:skillforge_pass@postgres:5432/skillforge_db"
    MONGODB_URL: str = "mongodb://skillforge_user:skillforge_pass@mongo:27017/skillforge_db"
    REDIS_URL: str = "redis://redis:6379"
    
    # Database Pool Settings
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    
    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/0"
    
    # External Services
    AI_SERVICE_URL: str = "http://ai-services:8001"
    
    # OAuth Settings
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    
    # Email Settings
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_FILE_TYPES: List[str] = ["pdf", "doc", "docx", "txt"]
    UPLOAD_DIR: str = "/tmp/uploads"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_BURST: int = 100
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    DATADOG_API_KEY: Optional[str] = None
    
    # Feature Flags
    ENABLE_REGISTRATION: bool = True
    ENABLE_OAUTH: bool = True
    ENABLE_EMAIL_VERIFICATION: bool = False
    ENABLE_RATE_LIMITING: bool = True
    ENABLE_CACHING: bool = True
    
    # Cache Settings
    CACHE_TTL: int = 300  # 5 minutes
    CACHE_MAX_SIZE: int = 1000
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # AI Service Settings
    AI_REQUEST_TIMEOUT: int = 30
    AI_MAX_RETRIES: int = 3
    AI_RETRY_DELAY: int = 1
    
    # Job Matching Settings
    JOB_MATCH_THRESHOLD: float = 0.7
    MAX_JOB_MATCHES: int = 50
    
    # Assessment Settings
    ASSESSMENT_TIME_BUFFER: int = 300  # 5 minutes buffer
    MAX_ASSESSMENT_ATTEMPTS: int = 3
    
    # Learning Path Settings
    LEARNING_PATH_CACHE_TTL: int = 3600  # 1 hour
    
    def __init__(self):
        """Initialize settings with environment variables"""
        # Override with environment variables
        self.PROJECT_NAME = os.getenv("PROJECT_NAME", self.PROJECT_NAME)
        self.VERSION = os.getenv("VERSION", self.VERSION)
        self.ENVIRONMENT = os.getenv("ENVIRONMENT", self.ENVIRONMENT)
        self.DEBUG = os.getenv("DEBUG", "true").lower() == "true" if self.ENVIRONMENT != "production" else False

        # Database URLs
        self.DATABASE_URL = os.getenv("DATABASE_URL", self.DATABASE_URL)
        self.MONGODB_URL = os.getenv("MONGODB_URL", self.MONGODB_URL)
        self.REDIS_URL = os.getenv("REDIS_URL", self.REDIS_URL)

        # Security
        self.SECRET_KEY = os.getenv("SECRET_KEY", self.SECRET_KEY)

        # Validate environment
        allowed_envs = ["development", "staging", "production", "testing"]
        if self.ENVIRONMENT not in allowed_envs:
            raise ValueError(f"Environment must be one of {allowed_envs}")
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT == "testing"
    
    @property
    def database_url_sync(self) -> str:
        """Synchronous database URL for SQLAlchemy"""
        return self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")
    
    @property
    def database_url_async(self) -> str:
        """Asynchronous database URL for SQLAlchemy"""
        return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()


# Environment-specific configurations
class DevelopmentConfig(Settings):
    DEBUG: bool = True
    LOG_LEVEL: str = "DEBUG"


class ProductionConfig(Settings):
    DEBUG: bool = False
    LOG_LEVEL: str = "WARNING"
    ENABLE_EMAIL_VERIFICATION: bool = True


class TestingConfig(Settings):
    ENVIRONMENT: str = "testing"
    DEBUG: bool = True
    DATABASE_URL: str = "postgresql://test_user:test_pass@localhost:5432/test_skillforge_db"
    MONGODB_URL: str = "mongodb://localhost:27017/test_skillforge_db"
    REDIS_URL: str = "redis://localhost:6379/1"


def get_config() -> Settings:
    """Get configuration based on environment"""
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        return ProductionConfig()
    elif env == "testing":
        return TestingConfig()
    else:
        return DevelopmentConfig()
