"""
Database configuration and session management for SkillForge AI
"""

from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from motor.motor_asyncio import AsyncIOMotorClient
from redis import Redis
from typing import Generator, Optional
import logging

from .config import settings

logger = logging.getLogger(__name__)

# PostgreSQL Database Setup
engine = create_engine(
    settings.database_url_sync,
    poolclass=QueuePool,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# SQLAlchemy Base
Base = declarative_base()

# Naming convention for constraints
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

Base.metadata = MetaData(naming_convention=convention)


def get_db() -> Generator[Session, None, None]:
    """
    Database dependency for FastAPI
    Provides a database session for each request
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_tables():
    """Create all database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


def drop_tables():
    """Drop all database tables (use with caution!)"""
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("Database tables dropped successfully")
    except Exception as e:
        logger.error(f"Error dropping database tables: {e}")
        raise


# MongoDB Setup
class MongoDB:
    """MongoDB connection manager"""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database = None
    
    async def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = AsyncIOMotorClient(settings.MONGODB_URL)
            # Test connection
            await self.client.admin.command('ping')
            
            # Get database name from URL
            db_name = settings.MONGODB_URL.split('/')[-1]
            if '?' in db_name:
                db_name = db_name.split('?')[0]
            
            self.database = self.client[db_name]
            logger.info(f"Connected to MongoDB database: {db_name}")
            
        except Exception as e:
            logger.error(f"Error connecting to MongoDB: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")
    
    def get_collection(self, collection_name: str):
        """Get a MongoDB collection"""
        if not self.database:
            raise RuntimeError("MongoDB not connected")
        return self.database[collection_name]


# Global MongoDB instance
mongodb = MongoDB()


async def get_mongodb():
    """MongoDB dependency for FastAPI"""
    if not mongodb.database:
        await mongodb.connect()
    return mongodb.database


# Redis Setup
class RedisManager:
    """Redis connection manager"""
    
    def __init__(self):
        self.redis: Optional[Redis] = None
    
    def connect(self):
        """Connect to Redis"""
        try:
            self.redis = Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test connection
            self.redis.ping()
            logger.info("Connected to Redis")
            
        except Exception as e:
            logger.error(f"Error connecting to Redis: {e}")
            raise
    
    def disconnect(self):
        """Disconnect from Redis"""
        if self.redis:
            self.redis.close()
            logger.info("Disconnected from Redis")
    
    def get_client(self) -> Redis:
        """Get Redis client"""
        if not self.redis:
            self.connect()
        return self.redis


# Global Redis instance
redis_manager = RedisManager()


def get_redis() -> Redis:
    """Redis dependency for FastAPI"""
    return redis_manager.get_client()


# Database Health Check
async def check_database_health() -> dict:
    """Check health of all database connections"""
    health_status = {
        "postgresql": {"status": "unknown", "error": None},
        "mongodb": {"status": "unknown", "error": None},
        "redis": {"status": "unknown", "error": None}
    }
    
    # Check PostgreSQL
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        health_status["postgresql"]["status"] = "healthy"
    except Exception as e:
        health_status["postgresql"]["status"] = "unhealthy"
        health_status["postgresql"]["error"] = str(e)
    
    # Check MongoDB
    try:
        if not mongodb.database:
            await mongodb.connect()
        await mongodb.client.admin.command('ping')
        health_status["mongodb"]["status"] = "healthy"
    except Exception as e:
        health_status["mongodb"]["status"] = "unhealthy"
        health_status["mongodb"]["error"] = str(e)
    
    # Check Redis
    try:
        redis_client = get_redis()
        redis_client.ping()
        health_status["redis"]["status"] = "healthy"
    except Exception as e:
        health_status["redis"]["status"] = "unhealthy"
        health_status["redis"]["error"] = str(e)
    
    return health_status


# Database Initialization
async def init_databases():
    """Initialize all database connections"""
    logger.info("Initializing database connections...")
    
    try:
        # Initialize Redis
        redis_manager.connect()
        
        # Initialize MongoDB
        await mongodb.connect()
        
        # PostgreSQL is initialized with engine creation
        logger.info("All database connections initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing databases: {e}")
        raise


async def close_databases():
    """Close all database connections"""
    logger.info("Closing database connections...")
    
    try:
        # Close Redis
        redis_manager.disconnect()
        
        # Close MongoDB
        await mongodb.disconnect()
        
        # Close PostgreSQL
        engine.dispose()
        
        logger.info("All database connections closed successfully")
        
    except Exception as e:
        logger.error(f"Error closing databases: {e}")


# Transaction Management
class DatabaseTransaction:
    """Context manager for database transactions"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def __enter__(self):
        return self.db
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.db.rollback()
        else:
            self.db.commit()


def get_transaction(db: Session) -> DatabaseTransaction:
    """Get a database transaction context manager"""
    return DatabaseTransaction(db)
