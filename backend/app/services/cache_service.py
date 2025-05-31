"""
Cache service for SkillForge AI Backend
Handles Redis caching operations
"""

from typing import Optional, Any, Dict, List
from redis import Redis
import json
import pickle
import logging
from datetime import timedelta

from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Service class for caching operations"""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.default_ttl = settings.CACHE_TTL
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            value = self.redis.get(key)
            if value is None:
                return None
            
            # Try to deserialize as JSON first, then pickle
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                try:
                    return pickle.loads(value)
                except (pickle.PickleError, TypeError):
                    return value.decode('utf-8') if isinstance(value, bytes) else value
                    
        except Exception as e:
            logger.error(f"Error getting cache key {key}: {e}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None,
        serialize_json: bool = True
    ) -> bool:
        """Set value in cache"""
        try:
            if ttl is None:
                ttl = self.default_ttl
            
            # Serialize value
            if serialize_json:
                try:
                    serialized_value = json.dumps(value)
                except (TypeError, ValueError):
                    # Fall back to pickle for complex objects
                    serialized_value = pickle.dumps(value)
            else:
                serialized_value = pickle.dumps(value)
            
            return self.redis.setex(key, ttl, serialized_value)
            
        except Exception as e:
            logger.error(f"Error setting cache key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            return bool(self.redis.delete(key))
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            return bool(self.redis.exists(key))
        except Exception as e:
            logger.error(f"Error checking cache key {key}: {e}")
            return False
    
    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration time for key"""
        try:
            return bool(self.redis.expire(key, ttl))
        except Exception as e:
            logger.error(f"Error setting expiration for cache key {key}: {e}")
            return False
    
    async def get_ttl(self, key: str) -> int:
        """Get time to live for key"""
        try:
            return self.redis.ttl(key)
        except Exception as e:
            logger.error(f"Error getting TTL for cache key {key}: {e}")
            return -1
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment numeric value"""
        try:
            return self.redis.incrby(key, amount)
        except Exception as e:
            logger.error(f"Error incrementing cache key {key}: {e}")
            return None
    
    async def decrement(self, key: str, amount: int = 1) -> Optional[int]:
        """Decrement numeric value"""
        try:
            return self.redis.decrby(key, amount)
        except Exception as e:
            logger.error(f"Error decrementing cache key {key}: {e}")
            return None
    
    async def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple values from cache"""
        try:
            values = self.redis.mget(keys)
            result = {}
            
            for key, value in zip(keys, values):
                if value is not None:
                    try:
                        result[key] = json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        try:
                            result[key] = pickle.loads(value)
                        except (pickle.PickleError, TypeError):
                            result[key] = value.decode('utf-8') if isinstance(value, bytes) else value
                else:
                    result[key] = None
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting multiple cache keys: {e}")
            return {}
    
    async def set_many(self, mapping: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Set multiple values in cache"""
        try:
            if ttl is None:
                ttl = self.default_ttl
            
            pipe = self.redis.pipeline()
            
            for key, value in mapping.items():
                try:
                    serialized_value = json.dumps(value)
                except (TypeError, ValueError):
                    serialized_value = pickle.dumps(value)
                
                pipe.setex(key, ttl, serialized_value)
            
            results = pipe.execute()
            return all(results)
            
        except Exception as e:
            logger.error(f"Error setting multiple cache keys: {e}")
            return False
    
    async def delete_many(self, keys: List[str]) -> int:
        """Delete multiple keys from cache"""
        try:
            return self.redis.delete(*keys)
        except Exception as e:
            logger.error(f"Error deleting multiple cache keys: {e}")
            return 0
    
    async def clear_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            keys = self.redis.keys(pattern)
            if keys:
                return self.redis.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Error clearing cache pattern {pattern}: {e}")
            return 0
    
    async def get_info(self) -> Dict[str, Any]:
        """Get Redis server information"""
        try:
            return self.redis.info()
        except Exception as e:
            logger.error(f"Error getting cache info: {e}")
            return {}
    
    # Specialized caching methods
    
    async def cache_user(self, user_id: str, user_data: Dict[str, Any], ttl: int = 3600):
        """Cache user data"""
        key = f"user:{user_id}"
        return await self.set(key, user_data, ttl)
    
    async def get_cached_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached user data"""
        key = f"user:{user_id}"
        return await self.get(key)
    
    async def invalidate_user_cache(self, user_id: str) -> bool:
        """Invalidate user cache"""
        pattern = f"user:{user_id}*"
        return await self.clear_pattern(pattern) > 0
    
    async def cache_skill_data(self, skill_id: str, skill_data: Dict[str, Any], ttl: int = 7200):
        """Cache skill data"""
        key = f"skill:{skill_id}"
        return await self.set(key, skill_data, ttl)
    
    async def get_cached_skill_data(self, skill_id: str) -> Optional[Dict[str, Any]]:
        """Get cached skill data"""
        key = f"skill:{skill_id}"
        return await self.get(key)
    
    async def cache_assessment_results(self, user_id: str, assessment_id: str, results: Dict[str, Any], ttl: int = 86400):
        """Cache assessment results"""
        key = f"assessment:{user_id}:{assessment_id}"
        return await self.set(key, results, ttl)
    
    async def get_cached_assessment_results(self, user_id: str, assessment_id: str) -> Optional[Dict[str, Any]]:
        """Get cached assessment results"""
        key = f"assessment:{user_id}:{assessment_id}"
        return await self.get(key)
    
    async def cache_job_matches(self, user_id: str, matches: List[Dict[str, Any]], ttl: int = 3600):
        """Cache job matches for user"""
        key = f"job_matches:{user_id}"
        return await self.set(key, matches, ttl)
    
    async def get_cached_job_matches(self, user_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached job matches for user"""
        key = f"job_matches:{user_id}"
        return await self.get(key)
    
    async def cache_learning_path(self, path_id: str, path_data: Dict[str, Any], ttl: int = 7200):
        """Cache learning path data"""
        key = f"learning_path:{path_id}"
        return await self.set(key, path_data, ttl)
    
    async def get_cached_learning_path(self, path_id: str) -> Optional[Dict[str, Any]]:
        """Get cached learning path data"""
        key = f"learning_path:{path_id}"
        return await self.get(key)
