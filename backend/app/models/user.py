"""
User SQLAlchemy models for SkillForge AI
"""

from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class UserRole(enum.Enum):
    """User role enumeration"""
    USER = "user"
    ADMIN = "admin"
    ENTERPRISE = "enterprise"
    COACH = "coach"


class AccountStatus(enum.Enum):
    """Account status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class ProviderType(enum.Enum):
    """OAuth provider enumeration"""
    GITHUB = "github"
    LINKEDIN = "linkedin"
    GOOGLE = "google"


class User(Base):
    """User model for authentication and profile management"""
    
    __tablename__ = "users"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Authentication fields
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile fields
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    profile_image_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    
    # Account management
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    account_status = Column(Enum(AccountStatus), default=AccountStatus.PENDING_VERIFICATION, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Security fields
    login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    social_auth = relationship("UserSocialAuth", back_populates="user", cascade="all, delete-orphan")
    skills = relationship("UserSkill", back_populates="user", cascade="all, delete-orphan")
    assessments = relationship("UserAssessment", back_populates="user", cascade="all, delete-orphan")
    learning_paths = relationship("UserLearningPath", back_populates="user", cascade="all, delete-orphan")
    job_interactions = relationship("UserJobInteraction", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role.value})>"
    
    @property
    def full_name(self) -> str:
        """Get user's full name"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def is_active(self) -> bool:
        """Check if user account is active"""
        return self.account_status == AccountStatus.ACTIVE
    
    @property
    def is_admin(self) -> bool:
        """Check if user is an admin"""
        return self.role == UserRole.ADMIN
    
    @property
    def is_enterprise(self) -> bool:
        """Check if user has enterprise privileges"""
        return self.role in [UserRole.ADMIN, UserRole.ENTERPRISE]


class UserSocialAuth(Base):
    """User social authentication model for OAuth providers"""
    
    __tablename__ = "user_social_auth"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to user
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # OAuth provider information
    provider = Column(Enum(ProviderType), nullable=False)
    provider_user_id = Column(String(255), nullable=False)
    
    # OAuth tokens
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="social_auth")
    
    # Constraints
    __table_args__ = (
        # Ensure one account per provider per user
        # Ensure unique provider + provider_user_id combination
    )
    
    def __repr__(self):
        return f"<UserSocialAuth(user_id={self.user_id}, provider={self.provider.value})>"


class UserActivity(Base):
    """User activity tracking model"""
    
    __tablename__ = "user_activities"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to user
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Activity information
    activity_type = Column(String(100), nullable=False, index=True)
    activity_data = Column(JSONB, nullable=True)
    
    # Request information
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(Text, nullable=True)
    request_id = Column(String(100), nullable=True)
    
    # Timestamp
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<UserActivity(user_id={self.user_id}, type={self.activity_type}, timestamp={self.timestamp})>"


class UserSession(Base):
    """User session tracking model"""
    
    __tablename__ = "user_sessions"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to user
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Session information
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    refresh_token = Column(String(255), unique=True, nullable=True, index=True)
    
    # Session metadata
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    device_info = Column(JSONB, nullable=True)
    
    # Session status
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_accessed = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<UserSession(user_id={self.user_id}, active={self.is_active}, expires={self.expires_at})>"
    
    @property
    def is_expired(self) -> bool:
        """Check if session is expired"""
        from datetime import datetime
        return datetime.utcnow() > self.expires_at


class UserPreferences(Base):
    """User preferences and settings model"""
    
    __tablename__ = "user_preferences"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Foreign key to user (one-to-one relationship)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Notification preferences
    email_notifications = Column(Boolean, default=True, nullable=False)
    push_notifications = Column(Boolean, default=True, nullable=False)
    marketing_emails = Column(Boolean, default=False, nullable=False)
    
    # Privacy preferences
    profile_visibility = Column(String(20), default="public", nullable=False)  # public, private, connections
    show_email = Column(Boolean, default=False, nullable=False)
    show_activity = Column(Boolean, default=True, nullable=False)
    
    # Application preferences
    theme = Column(String(20), default="light", nullable=False)  # light, dark, auto
    language = Column(String(10), default="en", nullable=False)
    timezone = Column(String(50), default="UTC", nullable=False)
    
    # Feature preferences
    ai_recommendations = Column(Boolean, default=True, nullable=False)
    job_alerts = Column(Boolean, default=True, nullable=False)
    skill_reminders = Column(Boolean, default=True, nullable=False)
    
    # Custom preferences (JSON)
    custom_settings = Column(JSONB, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<UserPreferences(user_id={self.user_id}, theme={self.theme})>"
