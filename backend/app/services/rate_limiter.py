"""
Rate limiting service for SkillForge AI Backend
Implements sliding window rate limiting using Redis
"""

from typing import Optional
from redis import Redis
import time
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter using Redis sliding window"""
    
    def __init__(self, redis_client: Redis, identifier: str):
        self.redis = redis_client
        self.identifier = identifier
    
    async def is_allowed(
        self, 
        action: str, 
        limit: int, 
        window: int,
        cost: int = 1
    ) -> bool:
        """
        Check if action is allowed within rate limit
        
        Args:
            action: Action identifier (e.g., "login", "api_call")
            limit: Maximum number of actions allowed
            window: Time window in seconds
            cost: Cost of this action (default 1)
        
        Returns:
            True if action is allowed, False otherwise
        """
        try:
            key = f"rate_limit:{self.identifier}:{action}"
            current_time = int(time.time())
            window_start = current_time - window
            
            # Use Redis pipeline for atomic operations
            pipe = self.redis.pipeline()
            
            # Remove expired entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Execute pipeline
            results = pipe.execute()
            current_count = results[1]
            
            # Check if adding this request would exceed limit
            if current_count + cost > limit:
                return False
            
            # Add current request(s)
            for _ in range(cost):
                score = current_time + (time.time() % 1)  # Add microseconds for uniqueness
                self.redis.zadd(key, {str(score): score})
            
            # Set expiration for cleanup
            self.redis.expire(key, window + 60)  # Extra 60 seconds for safety
            
            return True
            
        except Exception as e:
            logger.error(f"Rate limiter error for {self.identifier}:{action}: {e}")
            # Fail open - allow request if rate limiter fails
            return True
    
    async def get_remaining(self, action: str, limit: int, window: int) -> int:
        """
        Get remaining requests in current window
        
        Args:
            action: Action identifier
            limit: Maximum number of actions allowed
            window: Time window in seconds
        
        Returns:
            Number of remaining requests
        """
        try:
            key = f"rate_limit:{self.identifier}:{action}"
            current_time = int(time.time())
            window_start = current_time - window
            
            # Remove expired entries and count current
            pipe = self.redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            
            results = pipe.execute()
            current_count = results[1]
            
            return max(0, limit - current_count)
            
        except Exception as e:
            logger.error(f"Error getting remaining requests for {self.identifier}:{action}: {e}")
            return limit
    
    async def get_reset_time(self, action: str, window: int) -> Optional[int]:
        """
        Get timestamp when rate limit resets
        
        Args:
            action: Action identifier
            window: Time window in seconds
        
        Returns:
            Unix timestamp when limit resets, or None if no requests
        """
        try:
            key = f"rate_limit:{self.identifier}:{action}"
            
            # Get oldest request in current window
            oldest = self.redis.zrange(key, 0, 0, withscores=True)
            
            if not oldest:
                return None
            
            oldest_time = int(oldest[0][1])
            return oldest_time + window
            
        except Exception as e:
            logger.error(f"Error getting reset time for {self.identifier}:{action}: {e}")
            return None
    
    async def reset(self, action: str) -> bool:
        """
        Reset rate limit for specific action
        
        Args:
            action: Action identifier
        
        Returns:
            True if reset successful
        """
        try:
            key = f"rate_limit:{self.identifier}:{action}"
            return bool(self.redis.delete(key))
            
        except Exception as e:
            logger.error(f"Error resetting rate limit for {self.identifier}:{action}: {e}")
            return False
    
    async def reset_all(self) -> int:
        """
        Reset all rate limits for this identifier
        
        Returns:
            Number of keys deleted
        """
        try:
            pattern = f"rate_limit:{self.identifier}:*"
            keys = self.redis.keys(pattern)
            
            if keys:
                return self.redis.delete(*keys)
            return 0
            
        except Exception as e:
            logger.error(f"Error resetting all rate limits for {self.identifier}: {e}")
            return 0
    
    async def get_status(self, action: str, limit: int, window: int) -> dict:
        """
        Get comprehensive rate limit status
        
        Args:
            action: Action identifier
            limit: Maximum number of actions allowed
            window: Time window in seconds
        
        Returns:
            Dictionary with rate limit status
        """
        try:
            remaining = await self.get_remaining(action, limit, window)
            reset_time = await self.get_reset_time(action, window)
            current_time = int(time.time())
            
            return {
                "limit": limit,
                "remaining": remaining,
                "used": limit - remaining,
                "window": window,
                "reset_time": reset_time,
                "reset_in": max(0, reset_time - current_time) if reset_time else 0,
                "allowed": remaining > 0
            }
            
        except Exception as e:
            logger.error(f"Error getting rate limit status for {self.identifier}:{action}: {e}")
            return {
                "limit": limit,
                "remaining": limit,
                "used": 0,
                "window": window,
                "reset_time": None,
                "reset_in": 0,
                "allowed": True
            }


class GlobalRateLimiter:
    """Global rate limiter for system-wide limits"""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
    
    async def is_allowed(
        self, 
        action: str, 
        limit: int, 
        window: int,
        cost: int = 1
    ) -> bool:
        """
        Check global rate limit
        
        Args:
            action: Global action identifier
            limit: Maximum number of actions allowed globally
            window: Time window in seconds
            cost: Cost of this action
        
        Returns:
            True if action is allowed globally
        """
        try:
            key = f"global_rate_limit:{action}"
            current_time = int(time.time())
            window_start = current_time - window
            
            # Use Redis pipeline for atomic operations
            pipe = self.redis.pipeline()
            
            # Remove expired entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            pipe.zcard(key)
            
            results = pipe.execute()
            current_count = results[1]
            
            # Check if adding this request would exceed limit
            if current_count + cost > limit:
                return False
            
            # Add current request(s)
            for _ in range(cost):
                score = current_time + (time.time() % 1)
                self.redis.zadd(key, {str(score): score})
            
            # Set expiration
            self.redis.expire(key, window + 60)
            
            return True
            
        except Exception as e:
            logger.error(f"Global rate limiter error for {action}: {e}")
            return True
    
    async def get_global_status(self, action: str, limit: int, window: int) -> dict:
        """Get global rate limit status"""
        try:
            key = f"global_rate_limit:{action}"
            current_time = int(time.time())
            window_start = current_time - window
            
            # Clean and count
            pipe = self.redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            
            results = pipe.execute()
            current_count = results[1]
            
            return {
                "limit": limit,
                "used": current_count,
                "remaining": max(0, limit - current_count),
                "window": window,
                "allowed": current_count < limit
            }
            
        except Exception as e:
            logger.error(f"Error getting global rate limit status for {action}: {e}")
            return {
                "limit": limit,
                "used": 0,
                "remaining": limit,
                "window": window,
                "allowed": True
            }
