"""
SkillForge AI - API Integration Tests
Comprehensive integration tests for all API endpoints
"""

import pytest
import json
from unittest.mock import patch, Mock
from fastapi import status

from tests.conftest import UserFactory, SkillFactory, JobFactory

class TestAuthenticationAPI:
    """Test authentication API endpoints."""
    
    def test_register_endpoint(self, client, sample_user_data):
        """Test user registration endpoint."""
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "user_id" in data
        assert "email_verification_sent" in data
        assert data["email_verification_sent"] is True
    
    def test_register_invalid_email(self, client, sample_user_data):
        """Test registration with invalid email format."""
        sample_user_data["email"] = "invalid-email"
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_register_password_mismatch(self, client, sample_user_data):
        """Test registration with password confirmation mismatch."""
        sample_user_data["confirm_password"] = "different_password"
        response = client.post("/api/v1/auth/register", json=sample_user_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_endpoint(self, client, sample_user_data):
        """Test user login endpoint."""
        # Register user first
        client.post("/api/v1/auth/register", json=sample_user_data)
        
        # Login
        login_data = {
            "email": sample_user_data["email"],
            "password": sample_user_data["password"]
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
    
    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "wrong_password"
        }
        response = client.post("/api/v1/auth/login", json=login_data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_logout_endpoint(self, client, authenticated_user):
        """Test user logout endpoint."""
        response = client.post(
            "/api/v1/auth/logout",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_refresh_token_endpoint(self, client, authenticated_user):
        """Test token refresh endpoint."""
        response = client.post(
            "/api/v1/auth/refresh",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data

class TestUserAPI:
    """Test user management API endpoints."""
    
    def test_get_user_profile(self, client, authenticated_user):
        """Test getting user profile."""
        response = client.get(
            "/api/v1/users/profile",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "first_name" in data
        assert "last_name" in data
    
    def test_update_user_profile(self, client, authenticated_user):
        """Test updating user profile."""
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "bio": "Updated bio"
        }
        response = client.put(
            "/api/v1/users/profile",
            json=update_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"
    
    def test_change_password(self, client, authenticated_user):
        """Test password change endpoint."""
        password_data = {
            "current_password": "SecurePassword123!",
            "new_password": "NewSecurePassword123!",
            "confirm_password": "NewSecurePassword123!"
        }
        response = client.post(
            "/api/v1/users/change-password",
            json=password_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_delete_user_account(self, client, authenticated_user):
        """Test account deletion endpoint."""
        delete_data = {
            "password": "SecurePassword123!",
            "confirmation": "DELETE"
        }
        response = client.delete(
            "/api/v1/users/account",
            json=delete_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK

class TestSkillsAPI:
    """Test skills management API endpoints."""
    
    def test_get_skills_list(self, client, db_session):
        """Test getting list of skills."""
        # Create test skills
        SkillFactory.create_batch(5, sqlalchemy_session=db_session)
        
        response = client.get("/api/v1/skills/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 5
    
    def test_get_skills_with_pagination(self, client, db_session):
        """Test skills list with pagination."""
        # Create test skills
        SkillFactory.create_batch(15, sqlalchemy_session=db_session)
        
        response = client.get("/api/v1/skills/?page=1&size=10")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 10
        assert data["total"] == 15
        assert data["page"] == 1
        assert data["size"] == 10
    
    def test_get_skills_with_category_filter(self, client, db_session):
        """Test skills list with category filtering."""
        # Create skills with specific categories
        SkillFactory.create_batch(3, category="Programming Languages", sqlalchemy_session=db_session)
        SkillFactory.create_batch(2, category="Frameworks", sqlalchemy_session=db_session)
        
        response = client.get("/api/v1/skills/?category=Programming Languages")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 3
        assert all(item["category"] == "Programming Languages" for item in data["items"])
    
    def test_get_skill_by_id(self, client, db_session):
        """Test getting specific skill by ID."""
        skill = SkillFactory(sqlalchemy_session=db_session)
        
        response = client.get(f"/api/v1/skills/{skill.id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == skill.id
        assert data["name"] == skill.name
    
    def test_get_nonexistent_skill(self, client):
        """Test getting non-existent skill."""
        response = client.get("/api/v1/skills/99999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @patch('app.services.ai_service.AIService')
    def test_extract_skills_from_text(self, mock_ai_service, client, authenticated_user):
        """Test skill extraction from text."""
        mock_ai_service.return_value.extract_skills.return_value = {
            'skills': [
                {'name': 'Python', 'confidence': 0.95, 'category': 'Programming Languages'},
                {'name': 'Machine Learning', 'confidence': 0.88, 'category': 'Data Science'}
            ]
        }
        
        extract_data = {
            "text": "I have 5 years of experience with Python and machine learning projects."
        }
        response = client.post(
            "/api/v1/skills/extract",
            json=extract_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "skills" in data
        assert len(data["skills"]) == 2
    
    def test_add_user_skill(self, client, authenticated_user, db_session):
        """Test adding skill to user profile."""
        skill = SkillFactory(sqlalchemy_session=db_session)
        
        skill_data = {
            "skill_id": skill.id,
            "proficiency_level": "intermediate",
            "years_experience": 3,
            "evidence": "Worked on multiple Python projects"
        }
        response = client.post(
            "/api/v1/skills/user-skills",
            json=skill_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_get_user_skills(self, client, authenticated_user):
        """Test getting user's skills."""
        response = client.get(
            "/api/v1/skills/user-skills",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

class TestJobsAPI:
    """Test job management API endpoints."""
    
    def test_get_jobs_list(self, client, db_session):
        """Test getting list of jobs."""
        JobFactory.create_batch(5, sqlalchemy_session=db_session)
        
        response = client.get("/api/v1/jobs/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 5
    
    def test_get_jobs_with_location_filter(self, client, db_session):
        """Test jobs list with location filtering."""
        JobFactory.create_batch(3, location="San Francisco, CA", sqlalchemy_session=db_session)
        JobFactory.create_batch(2, location="New York, NY", sqlalchemy_session=db_session)
        
        response = client.get("/api/v1/jobs/?location=San Francisco")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["items"]) == 3
    
    def test_get_jobs_with_salary_filter(self, client, db_session):
        """Test jobs list with salary filtering."""
        JobFactory.create_batch(3, salary_min=80000, salary_max=120000, sqlalchemy_session=db_session)
        JobFactory.create_batch(2, salary_min=120000, salary_max=180000, sqlalchemy_session=db_session)
        
        response = client.get("/api/v1/jobs/?min_salary=100000")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Should return jobs with salary_max >= 100000
        assert len(data["items"]) >= 2
    
    def test_get_job_by_id(self, client, db_session):
        """Test getting specific job by ID."""
        job = JobFactory(sqlalchemy_session=db_session)
        
        response = client.get(f"/api/v1/jobs/{job.id}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == job.id
        assert data["title"] == job.title
    
    @patch('app.services.ai_service.AIService')
    def test_job_matching(self, mock_ai_service, client, authenticated_user, db_session):
        """Test job matching for user."""
        # Create test jobs
        jobs = JobFactory.create_batch(3, sqlalchemy_session=db_session)
        
        mock_ai_service.return_value.match_jobs.return_value = {
            'matches': [
                {'job_id': jobs[0].id, 'score': 0.92, 'reasons': ['Python expertise']},
                {'job_id': jobs[1].id, 'score': 0.85, 'reasons': ['ML experience']}
            ]
        }
        
        response = client.get(
            "/api/v1/jobs/match",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "matches" in data
        assert len(data["matches"]) == 2
    
    def test_apply_to_job(self, client, authenticated_user, db_session):
        """Test applying to a job."""
        job = JobFactory(sqlalchemy_session=db_session)
        
        application_data = {
            "cover_letter": "I am very interested in this position...",
            "resume_url": "https://example.com/resume.pdf"
        }
        response = client.post(
            f"/api/v1/jobs/{job.id}/apply",
            json=application_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_get_user_applications(self, client, authenticated_user):
        """Test getting user's job applications."""
        response = client.get(
            "/api/v1/jobs/applications",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)

class TestAIServicesAPI:
    """Test AI services API endpoints."""
    
    @patch('app.services.ai_service.AIService')
    def test_skill_assessment(self, mock_ai_service, client, authenticated_user):
        """Test AI-powered skill assessment."""
        mock_ai_service.return_value.assess_skill.return_value = {
            'score': 85,
            'confidence': 0.92,
            'feedback': 'Strong understanding of Python fundamentals',
            'recommendations': ['Practice advanced OOP concepts', 'Learn async programming']
        }
        
        assessment_data = {
            "skill_name": "Python",
            "evidence_text": "I have been programming in Python for 3 years...",
            "code_samples": ["def fibonacci(n): ..."]
        }
        response = client.post(
            "/api/v1/ai/assess-skill",
            json=assessment_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "score" in data
        assert "confidence" in data
        assert "feedback" in data
    
    @patch('app.services.ai_service.AIService')
    def test_generate_learning_content(self, mock_ai_service, client, authenticated_user):
        """Test AI-powered learning content generation."""
        mock_ai_service.return_value.generate_content.return_value = {
            'content': 'Here is a comprehensive guide to Python...',
            'metadata': {
                'word_count': 500,
                'reading_time': 4,
                'difficulty': 'intermediate'
            }
        }
        
        content_data = {
            "skill_name": "Python",
            "current_level": "beginner",
            "target_level": "intermediate",
            "learning_style": "hands-on"
        }
        response = client.post(
            "/api/v1/ai/generate-content",
            json=content_data,
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "content" in data
        assert "metadata" in data
    
    @patch('app.services.ai_service.AIService')
    def test_career_path_recommendation(self, mock_ai_service, client, authenticated_user):
        """Test AI-powered career path recommendations."""
        mock_ai_service.return_value.recommend_career_path.return_value = {
            'paths': [
                {
                    'title': 'Senior Python Developer',
                    'probability': 0.85,
                    'timeline': '2-3 years',
                    'required_skills': ['Advanced Python', 'System Design'],
                    'salary_range': {'min': 120000, 'max': 180000}
                }
            ]
        }
        
        response = client.get(
            "/api/v1/ai/career-paths",
            headers=authenticated_user["headers"]
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "paths" in data
        assert len(data["paths"]) > 0

class TestRateLimiting:
    """Test API rate limiting functionality."""
    
    def test_rate_limit_exceeded(self, client):
        """Test rate limiting on authentication endpoint."""
        login_data = {
            "email": "test@example.com",
            "password": "wrong_password"
        }
        
        # Make multiple requests to trigger rate limit
        responses = []
        for _ in range(12):  # Exceed the 10 requests per 15 minutes limit
            response = client.post("/api/v1/auth/login", json=login_data)
            responses.append(response)
        
        # Last request should be rate limited
        assert responses[-1].status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "rate limit" in responses[-1].json()["error"].lower()

class TestErrorHandling:
    """Test API error handling."""
    
    def test_validation_error(self, client):
        """Test validation error handling."""
        invalid_data = {
            "email": "not-an-email",
            "password": "short"
        }
        response = client.post("/api/v1/auth/register", json=invalid_data)
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        data = response.json()
        assert "detail" in data
    
    def test_internal_server_error(self, client):
        """Test internal server error handling."""
        with patch('app.services.user_service.UserService.get_profile') as mock_service:
            mock_service.side_effect = Exception("Database connection failed")
            
            response = client.get("/api/v1/users/profile", headers={"Authorization": "Bearer fake_token"})
            
            assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    
    def test_not_found_error(self, client):
        """Test 404 error handling."""
        response = client.get("/api/v1/nonexistent-endpoint")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
