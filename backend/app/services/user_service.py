"""
User service for SkillForge AI Backend
Handles user-related business logic
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta
import logging

from app.models.user import User, UserSocialAuth, UserActivity, UserPreferences
from app.schemas.user import UserCreate, UserUpdate, UserAdminUpdate, ProviderType
from app.core.security import get_password_hash, verify_password
from app.core.config import settings

logger = logging.getLogger(__name__)


class UserService:
    """Service class for user operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        try:
            return self.db.query(User).filter(User.id == user_id).first()
        except Exception as e:
            logger.error(f"Error getting user by ID {user_id}: {e}")
            return None
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            return self.db.query(User).filter(User.email == email.lower()).first()
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e}")
            return None
    
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user"""
        try:
            # Check if user already exists
            existing_user = await self.get_by_email(user_data.email)
            if existing_user:
                raise ValueError("User with this email already exists")
            
            # Create user
            db_user = User(
                email=user_data.email.lower(),
                hashed_password=get_password_hash(user_data.password),
                first_name=user_data.first_name,
                last_name=user_data.last_name,
                bio=user_data.bio,
                profile_image_url=user_data.profile_image_url
            )
            
            self.db.add(db_user)
            self.db.commit()
            self.db.refresh(db_user)
            
            # Create default preferences
            await self._create_default_preferences(db_user.id)
            
            # Log activity
            await self.log_activity(
                user_id=str(db_user.id),
                activity_type="user_registered",
                activity_data={"email": user_data.email}
            )
            
            logger.info(f"Created new user: {user_data.email}")
            return db_user
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating user: {e}")
            raise
    
    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[User]:
        """Update user information"""
        try:
            user = await self.get_by_id(user_id)
            if not user:
                return None
            
            # Update fields if provided
            update_data = user_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(user, field, value)
            
            user.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(user)
            
            # Log activity
            await self.log_activity(
                user_id=user_id,
                activity_type="profile_updated",
                activity_data={"updated_fields": list(update_data.keys())}
            )
            
            logger.info(f"Updated user: {user_id}")
            return user
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating user {user_id}: {e}")
            raise
    
    async def admin_update_user(self, user_id: str, admin_data: UserAdminUpdate) -> Optional[User]:
        """Admin update user (role, status, etc.)"""
        try:
            user = await self.get_by_id(user_id)
            if not user:
                return None
            
            # Update admin fields if provided
            update_data = admin_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(user, field, value)
            
            user.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(user)
            
            # Log activity
            await self.log_activity(
                user_id=user_id,
                activity_type="admin_updated_user",
                activity_data={"updated_fields": list(update_data.keys())}
            )
            
            logger.info(f"Admin updated user: {user_id}")
            return user
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error admin updating user {user_id}: {e}")
            raise
    
    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        try:
            user = await self.get_by_email(email)
            if not user:
                return None
            
            # Check if account is locked
            if user.locked_until and user.locked_until > datetime.utcnow():
                logger.warning(f"Login attempt for locked account: {email}")
                return None
            
            # Verify password
            if not verify_password(password, user.hashed_password):
                # Increment login attempts
                user.login_attempts += 1
                
                # Lock account after too many attempts
                if user.login_attempts >= 5:
                    user.locked_until = datetime.utcnow() + timedelta(minutes=30)
                    logger.warning(f"Account locked due to failed attempts: {email}")
                
                self.db.commit()
                return None
            
            # Reset login attempts on successful login
            user.login_attempts = 0
            user.locked_until = None
            user.last_login = datetime.utcnow()
            
            self.db.commit()
            
            # Log activity
            await self.log_activity(
                user_id=str(user.id),
                activity_type="user_login",
                activity_data={"email": email}
            )
            
            logger.info(f"User authenticated: {email}")
            return user
            
        except Exception as e:
            logger.error(f"Error authenticating user {email}: {e}")
            return None
    
    async def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        """Change user password"""
        try:
            user = await self.get_by_id(user_id)
            if not user:
                return False
            
            # Verify current password
            if not verify_password(current_password, user.hashed_password):
                return False
            
            # Update password
            user.hashed_password = get_password_hash(new_password)
            user.updated_at = datetime.utcnow()
            
            self.db.commit()
            
            # Log activity
            await self.log_activity(
                user_id=user_id,
                activity_type="password_changed",
                activity_data={}
            )
            
            logger.info(f"Password changed for user: {user_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error changing password for user {user_id}: {e}")
            return False
    
    async def verify_email(self, user_id: str) -> bool:
        """Mark user email as verified"""
        try:
            user = await self.get_by_id(user_id)
            if not user:
                return False
            
            user.email_verified = True
            user.updated_at = datetime.utcnow()
            
            # Activate account if it was pending verification
            if user.account_status.value == "pending_verification":
                user.account_status = "active"
            
            self.db.commit()
            
            # Log activity
            await self.log_activity(
                user_id=user_id,
                activity_type="email_verified",
                activity_data={}
            )
            
            logger.info(f"Email verified for user: {user_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error verifying email for user {user_id}: {e}")
            return False
    
    async def get_users(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[User]:
        """Get list of users with filtering"""
        try:
            query = self.db.query(User)
            
            # Apply filters
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    or_(
                        User.first_name.ilike(search_term),
                        User.last_name.ilike(search_term),
                        User.email.ilike(search_term)
                    )
                )
            
            if role:
                query = query.filter(User.role == role)
            
            if status:
                query = query.filter(User.account_status == status)
            
            # Order by creation date (newest first)
            query = query.order_by(User.created_at.desc())
            
            # Apply pagination
            users = query.offset(skip).limit(limit).all()
            
            return users
            
        except Exception as e:
            logger.error(f"Error getting users: {e}")
            return []
    
    async def get_user_count(
        self,
        search: Optional[str] = None,
        role: Optional[str] = None,
        status: Optional[str] = None
    ) -> int:
        """Get total count of users with filtering"""
        try:
            query = self.db.query(func.count(User.id))
            
            # Apply same filters as get_users
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    or_(
                        User.first_name.ilike(search_term),
                        User.last_name.ilike(search_term),
                        User.email.ilike(search_term)
                    )
                )
            
            if role:
                query = query.filter(User.role == role)
            
            if status:
                query = query.filter(User.account_status == status)
            
            return query.scalar()
            
        except Exception as e:
            logger.error(f"Error getting user count: {e}")
            return 0
    
    async def log_activity(
        self,
        user_id: str,
        activity_type: str,
        activity_data: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log user activity"""
        try:
            activity = UserActivity(
                user_id=user_id,
                activity_type=activity_type,
                activity_data=activity_data,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            self.db.add(activity)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error logging activity for user {user_id}: {e}")
    
    async def _create_default_preferences(self, user_id: str):
        """Create default preferences for a new user"""
        try:
            preferences = UserPreferences(user_id=user_id)
            self.db.add(preferences)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error creating default preferences for user {user_id}: {e}")
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete a user (soft delete by deactivating)"""
        try:
            user = await self.get_by_id(user_id)
            if not user:
                return False
            
            # Soft delete by setting status to inactive
            user.account_status = "inactive"
            user.updated_at = datetime.utcnow()
            
            self.db.commit()
            
            # Log activity
            await self.log_activity(
                user_id=user_id,
                activity_type="user_deleted",
                activity_data={}
            )
            
            logger.info(f"User deleted: {user_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting user {user_id}: {e}")
            return False
