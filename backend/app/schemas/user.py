"""
User-related Pydantic schemas for SkillForge AI
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, validator, Field
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration"""
    USER = "user"
    ADMIN = "admin"
    ENTERPRISE = "enterprise"
    COACH = "coach"


class AccountStatus(str, Enum):
    """Account status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class ProviderType(str, Enum):
    """OAuth provider enumeration"""
    GITHUB = "github"
    LINKEDIN = "linkedin"
    GOOGLE = "google"


# Base schemas
class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=1000)
    profile_image_url: Optional[str] = None
    
    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty or whitespace only')
        return v.strip()


class UserCreate(UserBase):
    """Schema for user creation"""
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('password')
    def validate_password_strength(cls, v):
        # Basic password validation
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        
        if not (has_upper and has_lower and has_digit):
            raise ValueError('Password must contain uppercase, lowercase, and digit')
        
        return v


class UserUpdate(BaseModel):
    """Schema for user updates"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=1000)
    profile_image_url: Optional[str] = None
    
    @validator('first_name', 'last_name')
    def validate_names(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Name cannot be empty or whitespace only')
        return v.strip() if v else v


class UserInDB(UserBase):
    """Schema for user in database"""
    id: str
    role: UserRole = UserRole.USER
    account_status: AccountStatus = AccountStatus.PENDING_VERIFICATION
    email_verified: bool = False
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    login_attempts: int = 0
    locked_until: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class UserResponse(UserInDB):
    """Schema for user response (excludes sensitive data)"""
    pass


class UserProfile(UserResponse):
    """Extended user profile with additional information"""
    total_skills: int = 0
    expert_skills: int = 0
    assessments_taken: int = 0
    assessments_passed: int = 0
    avg_assessment_score: Optional[float] = None
    learning_paths_enrolled: int = 0
    learning_paths_completed: int = 0


# Authentication schemas
class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str = Field(..., min_length=1)
    remember_me: bool = False


class UserRegister(UserCreate):
    """Schema for user registration"""
    terms_accepted: bool = Field(..., description="User must accept terms and conditions")
    
    @validator('terms_accepted')
    def terms_must_be_accepted(cls, v):
        if not v:
            raise ValueError('Terms and conditions must be accepted')
        return v


class PasswordChange(BaseModel):
    """Schema for password change"""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_new_password: str = Field(..., min_length=8, max_length=128)
    
    @validator('confirm_new_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('New passwords do not match')
        return v


class PasswordReset(BaseModel):
    """Schema for password reset"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_new_password: str = Field(..., min_length=8, max_length=128)
    
    @validator('confirm_new_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class EmailVerification(BaseModel):
    """Schema for email verification"""
    token: str = Field(..., min_length=1)


# OAuth schemas
class OAuthUserInfo(BaseModel):
    """Schema for OAuth user information"""
    provider: ProviderType
    provider_user_id: str
    email: EmailStr
    first_name: str
    last_name: str
    profile_image_url: Optional[str] = None
    access_token: str
    refresh_token: Optional[str] = None


class UserSocialAuth(BaseModel):
    """Schema for user social authentication"""
    id: str
    user_id: str
    provider: ProviderType
    provider_user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


# Token schemas
class Token(BaseModel):
    """Schema for authentication tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefresh(BaseModel):
    """Schema for token refresh"""
    refresh_token: str


class TokenData(BaseModel):
    """Schema for token data"""
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None


# Admin schemas
class UserAdminUpdate(BaseModel):
    """Schema for admin user updates"""
    role: Optional[UserRole] = None
    account_status: Optional[AccountStatus] = None
    email_verified: Optional[bool] = None


class UserList(BaseModel):
    """Schema for user list response"""
    users: List[UserResponse]
    total: int
    page: int
    size: int
    pages: int


# User statistics
class UserStats(BaseModel):
    """Schema for user statistics"""
    total_users: int
    active_users: int
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int
    users_by_role: Dict[str, int]
    users_by_status: Dict[str, int]


# User activity
class UserActivity(BaseModel):
    """Schema for user activity"""
    user_id: str
    activity_type: str
    activity_data: Dict[str, Any]
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    class Config:
        orm_mode = True


class UserActivityList(BaseModel):
    """Schema for user activity list"""
    activities: List[UserActivity]
    total: int
    page: int
    size: int
