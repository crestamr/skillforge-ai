"""
SkillForge AI - Test Configuration and Fixtures
Comprehensive test setup with fixtures, factories, and utilities
"""

import pytest
import asyncio
import tempfile
import os
from typing import Generator, AsyncGenerator
from unittest.mock import Mock, patch
import redis
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from httpx import AsyncClient
import factory
from factory.alchemy import SQLAlchemyModelFactory
from faker import Faker

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User, UserProfile
from app.models.skill import Skill, SkillAssessment
from app.models.job import Job, JobApplication
from app.security.authentication import AuthenticationService
from app.security.encryption import FieldEncryption

fake = Faker()

# Test database setup
TEST_DATABASE_URL = "sqlite:///./test.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
async def async_client(db_session):
    """Create an async test client."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as async_test_client:
        yield async_test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def mock_redis():
    """Mock Redis client for testing."""
    with patch('redis.Redis') as mock_redis_class:
        mock_redis_instance = Mock()
        mock_redis_class.return_value = mock_redis_instance
        yield mock_redis_instance

@pytest.fixture(scope="function")
def mock_s3():
    """Mock AWS S3 client for testing."""
    with patch('boto3.client') as mock_boto3:
        mock_s3_client = Mock()
        mock_boto3.return_value = mock_s3_client
        yield mock_s3_client

@pytest.fixture(scope="function")
def mock_kms():
    """Mock AWS KMS client for testing."""
    with patch('app.security.encryption.KMSManager') as mock_kms_class:
        mock_kms_instance = Mock()
        mock_kms_class.return_value = mock_kms_instance
        
        # Mock KMS responses
        mock_kms_instance.generate_data_key.return_value = {
            'plaintext_key': b'test_key_32_bytes_long_for_aes256',
            'encrypted_key': 'encrypted_test_key',
            'key_id': 'test-key-id'
        }
        mock_kms_instance.decrypt_data_key.return_value = b'test_key_32_bytes_long_for_aes256'
        
        yield mock_kms_instance

@pytest.fixture(scope="function")
def mock_huggingface():
    """Mock HuggingFace model responses."""
    with patch('transformers.pipeline') as mock_pipeline:
        mock_model = Mock()
        mock_model.return_value = [{'label': 'Python', 'score': 0.95}]
        mock_pipeline.return_value = mock_model
        yield mock_model

# Factory classes for test data generation
class UserFactory(SQLAlchemyModelFactory):
    """Factory for creating test users."""
    class Meta:
        model = User
        sqlalchemy_session_persistence = "commit"
    
    email = factory.LazyAttribute(lambda obj: fake.email())
    first_name = factory.LazyAttribute(lambda obj: fake.first_name())
    last_name = factory.LazyAttribute(lambda obj: fake.last_name())
    password_hash = factory.LazyAttribute(lambda obj: "$argon2id$v=19$m=65536,t=3,p=4$test_hash")
    is_active = True
    email_verified = True
    created_at = factory.LazyAttribute(lambda obj: fake.date_time_this_year())

class UserProfileFactory(SQLAlchemyModelFactory):
    """Factory for creating test user profiles."""
    class Meta:
        model = UserProfile
        sqlalchemy_session_persistence = "commit"
    
    user = factory.SubFactory(UserFactory)
    bio = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=500))
    location = factory.LazyAttribute(lambda obj: fake.city())
    website = factory.LazyAttribute(lambda obj: fake.url())
    linkedin_url = factory.LazyAttribute(lambda obj: f"https://linkedin.com/in/{fake.user_name()}")
    github_url = factory.LazyAttribute(lambda obj: f"https://github.com/{fake.user_name()}")
    years_experience = factory.LazyAttribute(lambda obj: fake.random_int(min=0, max=20))
    current_role = factory.LazyAttribute(lambda obj: fake.job())
    current_company = factory.LazyAttribute(lambda obj: fake.company())

class SkillFactory(SQLAlchemyModelFactory):
    """Factory for creating test skills."""
    class Meta:
        model = Skill
        sqlalchemy_session_persistence = "commit"
    
    name = factory.LazyAttribute(lambda obj: fake.word().title())
    category = factory.LazyAttribute(lambda obj: fake.random_element(elements=[
        'Programming Languages', 'Frameworks', 'Databases', 'Cloud Platforms',
        'DevOps Tools', 'Data Science', 'Machine Learning', 'Soft Skills'
    ]))
    description = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=200))
    difficulty_level = factory.LazyAttribute(lambda obj: fake.random_element(elements=[
        'Beginner', 'Intermediate', 'Advanced', 'Expert'
    ]))
    is_active = True

class SkillAssessmentFactory(SQLAlchemyModelFactory):
    """Factory for creating test skill assessments."""
    class Meta:
        model = SkillAssessment
        sqlalchemy_session_persistence = "commit"
    
    user = factory.SubFactory(UserFactory)
    skill = factory.SubFactory(SkillFactory)
    score = factory.LazyAttribute(lambda obj: fake.random_int(min=0, max=100))
    confidence_level = factory.LazyAttribute(lambda obj: fake.pyfloat(min_value=0.0, max_value=1.0))
    assessment_type = factory.LazyAttribute(lambda obj: fake.random_element(elements=[
        'self_assessment', 'ai_evaluation', 'peer_review', 'certification'
    ]))
    evidence_text = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=1000))
    created_at = factory.LazyAttribute(lambda obj: fake.date_time_this_year())

class JobFactory(SQLAlchemyModelFactory):
    """Factory for creating test jobs."""
    class Meta:
        model = Job
        sqlalchemy_session_persistence = "commit"
    
    title = factory.LazyAttribute(lambda obj: fake.job())
    company = factory.LazyAttribute(lambda obj: fake.company())
    location = factory.LazyAttribute(lambda obj: fake.city())
    description = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=2000))
    requirements = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=1000))
    salary_min = factory.LazyAttribute(lambda obj: fake.random_int(min=40000, max=80000))
    salary_max = factory.LazyAttribute(lambda obj: fake.random_int(min=80000, max=150000))
    employment_type = factory.LazyAttribute(lambda obj: fake.random_element(elements=[
        'full_time', 'part_time', 'contract', 'freelance', 'internship'
    ]))
    remote_allowed = factory.LazyAttribute(lambda obj: fake.boolean())
    is_active = True
    posted_at = factory.LazyAttribute(lambda obj: fake.date_time_this_month())

class JobApplicationFactory(SQLAlchemyModelFactory):
    """Factory for creating test job applications."""
    class Meta:
        model = JobApplication
        sqlalchemy_session_persistence = "commit"
    
    user = factory.SubFactory(UserFactory)
    job = factory.SubFactory(JobFactory)
    status = factory.LazyAttribute(lambda obj: fake.random_element(elements=[
        'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'
    ]))
    cover_letter = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=1500))
    match_score = factory.LazyAttribute(lambda obj: fake.pyfloat(min_value=0.0, max_value=1.0))
    applied_at = factory.LazyAttribute(lambda obj: fake.date_time_this_month())

# Utility fixtures
@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "email": "test@skillforge.ai",
        "password": "SecurePassword123!",
        "first_name": "Test",
        "last_name": "User",
        "confirm_password": "SecurePassword123!"
    }

@pytest.fixture
def sample_skill_data():
    """Sample skill data for testing."""
    return {
        "name": "Python",
        "category": "Programming Languages",
        "description": "A high-level programming language",
        "difficulty_level": "Intermediate"
    }

@pytest.fixture
def sample_job_data():
    """Sample job data for testing."""
    return {
        "title": "Senior Python Developer",
        "company": "Tech Corp",
        "location": "San Francisco, CA",
        "description": "We are looking for a senior Python developer...",
        "requirements": "5+ years of Python experience...",
        "salary_min": 120000,
        "salary_max": 180000,
        "employment_type": "full_time",
        "remote_allowed": True
    }

@pytest.fixture
def authenticated_user(client, db_session, sample_user_data):
    """Create an authenticated user and return auth token."""
    # Create user
    auth_service = AuthenticationService(db_session)
    user_result = auth_service.register_user(**sample_user_data)
    
    # Login to get token
    login_data = {
        "email": sample_user_data["email"],
        "password": sample_user_data["password"]
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    
    token_data = response.json()
    return {
        "user_id": user_result["user_id"],
        "token": token_data["access_token"],
        "headers": {"Authorization": f"Bearer {token_data['access_token']}"}
    }

@pytest.fixture
def admin_user(client, db_session):
    """Create an admin user for testing admin endpoints."""
    admin_data = {
        "email": "admin@skillforge.ai",
        "password": "AdminPassword123!",
        "first_name": "Admin",
        "last_name": "User",
        "is_admin": True
    }
    
    # Create admin user directly in database
    user = User(**admin_data)
    user.password_hash = "$argon2id$v=19$m=65536,t=3,p=4$admin_hash"
    db_session.add(user)
    db_session.commit()
    
    # Login to get token
    login_data = {
        "email": admin_data["email"],
        "password": admin_data["password"]
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    
    token_data = response.json()
    return {
        "user_id": user.id,
        "token": token_data["access_token"],
        "headers": {"Authorization": f"Bearer {token_data['access_token']}"}
    }

@pytest.fixture
def temp_file():
    """Create a temporary file for testing file uploads."""
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.txt') as f:
        f.write("This is a test file for upload testing.")
        temp_path = f.name
    
    yield temp_path
    
    # Cleanup
    if os.path.exists(temp_path):
        os.unlink(temp_path)

@pytest.fixture
def mock_email_service():
    """Mock email service for testing."""
    with patch('app.utils.email.send_email') as mock_send:
        mock_send.return_value = True
        yield mock_send

@pytest.fixture
def mock_ai_service():
    """Mock AI service responses for testing."""
    mock_responses = {
        'skill_extraction': {
            'skills': [
                {'name': 'Python', 'confidence': 0.95, 'category': 'Programming Languages'},
                {'name': 'Machine Learning', 'confidence': 0.88, 'category': 'Data Science'},
                {'name': 'FastAPI', 'confidence': 0.82, 'category': 'Frameworks'}
            ]
        },
        'job_matching': {
            'matches': [
                {'job_id': 1, 'score': 0.92, 'reasons': ['Python expertise', 'ML experience']},
                {'job_id': 2, 'score': 0.85, 'reasons': ['FastAPI knowledge', 'API development']}
            ]
        },
        'content_generation': {
            'content': 'Generated learning content for the specified skill...',
            'metadata': {'word_count': 250, 'reading_time': 2}
        }
    }
    
    with patch('app.services.ai_service.AIService') as mock_ai:
        mock_ai_instance = Mock()
        for method, response in mock_responses.items():
            setattr(mock_ai_instance, method, Mock(return_value=response))
        mock_ai.return_value = mock_ai_instance
        yield mock_ai_instance

# Performance testing utilities
@pytest.fixture
def performance_timer():
    """Timer utility for performance testing."""
    import time
    
    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
            return self.elapsed
        
        @property
        def elapsed(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None
    
    return Timer()

# Database factory setup
@pytest.fixture(autouse=True)
def setup_factories(db_session):
    """Setup factory sessions for all factories."""
    UserFactory._meta.sqlalchemy_session = db_session
    UserProfileFactory._meta.sqlalchemy_session = db_session
    SkillFactory._meta.sqlalchemy_session = db_session
    SkillAssessmentFactory._meta.sqlalchemy_session = db_session
    JobFactory._meta.sqlalchemy_session = db_session
    JobApplicationFactory._meta.sqlalchemy_session = db_session
