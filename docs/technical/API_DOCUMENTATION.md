# SkillForge AI - API Documentation

## Overview

The SkillForge AI API is a RESTful service built with FastAPI that provides comprehensive endpoints for user management, skill assessment, job matching, and AI-powered career development features.

**Base URL:** `https://api.skillforge.ai/v1`

**Authentication:** Bearer Token (JWT)

**Content Type:** `application/json`

## Authentication

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "confirm_password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "user_id": 123,
  "email_verification_sent": true,
  "message": "User registered successfully"
}
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "mfa_token": "123456" // Optional, required if MFA enabled
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 123,
  "session_id": "session_abc123"
}
```

### Refresh Token
```http
POST /auth/refresh
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

## User Management

### Get User Profile
```http
GET /users/profile
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": 123,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "bio": "Software developer with 5 years experience",
  "location": "San Francisco, CA",
  "current_role": "Senior Developer",
  "current_company": "Tech Corp",
  "years_experience": 5,
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "github_url": "https://github.com/johndoe",
  "created_at": "2024-01-15T10:30:00Z",
  "last_login": "2024-01-20T14:22:00Z"
}
```

### Update User Profile
```http
PUT /users/profile
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "bio": "Updated bio text",
  "location": "New York, NY",
  "current_role": "Lead Developer",
  "current_company": "New Tech Corp",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "github_url": "https://github.com/johndoe"
}
```

### Change Password
```http
POST /users/change-password
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword123!",
  "confirm_password": "NewPassword123!"
}
```

## Skills Management

### Get Skills List
```http
GET /skills/?page=1&size=20&category=Programming%20Languages&search=python
```

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `size` (int): Items per page (default: 20, max: 100)
- `category` (string): Filter by skill category
- `search` (string): Search skills by name
- `difficulty` (string): Filter by difficulty level

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Python",
      "category": "Programming Languages",
      "description": "High-level programming language",
      "difficulty_level": "Intermediate",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "size": 20,
  "pages": 8
}
```

### Get Skill by ID
```http
GET /skills/{skill_id}
```

**Response:**
```json
{
  "id": 1,
  "name": "Python",
  "category": "Programming Languages",
  "description": "High-level programming language for general-purpose programming",
  "difficulty_level": "Intermediate",
  "prerequisites": ["Basic Programming Concepts"],
  "related_skills": ["Django", "Flask", "Data Science"],
  "learning_resources": [
    {
      "title": "Python Official Tutorial",
      "url": "https://docs.python.org/3/tutorial/",
      "type": "documentation"
    }
  ],
  "job_demand": {
    "score": 95,
    "trend": "increasing",
    "average_salary": 120000
  }
}
```

### Extract Skills from Text
```http
POST /skills/extract
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "text": "I have 5 years of experience with Python, Django, and PostgreSQL. I've worked on machine learning projects using scikit-learn and TensorFlow."
}
```

**Response:**
```json
{
  "skills": [
    {
      "name": "Python",
      "confidence": 0.95,
      "category": "Programming Languages",
      "context": "5 years of experience with Python"
    },
    {
      "name": "Django",
      "confidence": 0.92,
      "category": "Frameworks",
      "context": "Python, Django, and PostgreSQL"
    },
    {
      "name": "Machine Learning",
      "confidence": 0.88,
      "category": "Data Science",
      "context": "machine learning projects using scikit-learn"
    }
  ],
  "processing_time": 1.2,
  "model_version": "skillforge-nlp-v2.1"
}
```

### Add User Skill
```http
POST /skills/user-skills
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "skill_id": 1,
  "proficiency_level": "intermediate",
  "years_experience": 3,
  "evidence": "Worked on multiple Python projects including web applications and data analysis tools",
  "certifications": ["Python Institute PCAP"],
  "projects": [
    {
      "name": "E-commerce Platform",
      "description": "Built using Django and PostgreSQL",
      "url": "https://github.com/user/ecommerce"
    }
  ]
}
```

### Get User Skills
```http
GET /skills/user-skills
Authorization: Bearer {access_token}
```

**Response:**
```json
[
  {
    "id": 1,
    "skill": {
      "id": 1,
      "name": "Python",
      "category": "Programming Languages"
    },
    "proficiency_level": "intermediate",
    "years_experience": 3,
    "evidence": "Worked on multiple Python projects...",
    "ai_assessment_score": 85,
    "last_assessed": "2024-01-15T10:30:00Z",
    "certifications": ["Python Institute PCAP"],
    "projects": [...]
  }
]
```

## Job Management

### Get Jobs List
```http
GET /jobs/?page=1&size=20&location=San%20Francisco&min_salary=100000&remote=true
```

**Query Parameters:**
- `page` (int): Page number
- `size` (int): Items per page
- `location` (string): Job location
- `min_salary` (int): Minimum salary
- `max_salary` (int): Maximum salary
- `remote` (bool): Remote work allowed
- `employment_type` (string): full_time, part_time, contract, freelance
- `skills` (string): Comma-separated skill names

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "title": "Senior Python Developer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "salary_min": 120000,
      "salary_max": 180000,
      "employment_type": "full_time",
      "remote_allowed": true,
      "description": "We are looking for a senior Python developer...",
      "requirements": "5+ years Python experience, Django, PostgreSQL",
      "posted_at": "2024-01-20T09:00:00Z",
      "expires_at": "2024-02-20T09:00:00Z",
      "is_active": true
    }
  ],
  "total": 45,
  "page": 1,
  "size": 20,
  "pages": 3
}
```

### Get Job by ID
```http
GET /jobs/{job_id}
```

**Response:**
```json
{
  "id": 1,
  "title": "Senior Python Developer",
  "company": "Tech Corp",
  "company_logo": "https://cdn.skillforge.ai/logos/techcorp.png",
  "location": "San Francisco, CA",
  "salary_min": 120000,
  "salary_max": 180000,
  "employment_type": "full_time",
  "remote_allowed": true,
  "description": "Detailed job description...",
  "requirements": "Detailed requirements...",
  "benefits": ["Health insurance", "401k", "Flexible hours"],
  "required_skills": [
    {"name": "Python", "required": true, "years": 5},
    {"name": "Django", "required": true, "years": 3},
    {"name": "PostgreSQL", "required": false, "years": 2}
  ],
  "company_info": {
    "size": "100-500",
    "industry": "Technology",
    "website": "https://techcorp.com"
  },
  "posted_at": "2024-01-20T09:00:00Z",
  "application_deadline": "2024-02-20T09:00:00Z"
}
```

### Job Matching
```http
GET /jobs/match
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `limit` (int): Number of matches to return (default: 10)
- `min_score` (float): Minimum match score (0.0-1.0)

**Response:**
```json
{
  "matches": [
    {
      "job_id": 1,
      "job": {
        "title": "Senior Python Developer",
        "company": "Tech Corp",
        "location": "San Francisco, CA"
      },
      "match_score": 0.92,
      "skill_match": 0.95,
      "experience_match": 0.88,
      "location_match": 1.0,
      "salary_match": 0.85,
      "reasons": [
        "Strong Python expertise (5 years)",
        "Django framework experience",
        "Location preference match"
      ],
      "missing_skills": [
        {"name": "Kubernetes", "importance": "medium"},
        {"name": "AWS", "importance": "low"}
      ],
      "recommendation": "Excellent match! Consider highlighting your Python and Django experience."
    }
  ],
  "total_jobs_analyzed": 150,
  "processing_time": 2.3,
  "last_updated": "2024-01-20T14:30:00Z"
}
```

### Apply to Job
```http
POST /jobs/{job_id}/apply
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "cover_letter": "I am very interested in this position...",
  "resume_url": "https://cdn.skillforge.ai/resumes/user123.pdf",
  "additional_notes": "Available for immediate start"
}
```

**Response:**
```json
{
  "application_id": 456,
  "status": "applied",
  "applied_at": "2024-01-20T15:00:00Z",
  "message": "Application submitted successfully"
}
```

## AI Services

### Skill Assessment
```http
POST /ai/assess-skill
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "skill_name": "Python",
  "evidence_text": "I have been programming in Python for 3 years...",
  "code_samples": [
    "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)"
  ],
  "project_descriptions": [
    "Built a web scraping tool using BeautifulSoup and requests"
  ]
}
```

**Response:**
```json
{
  "skill_name": "Python",
  "overall_score": 85,
  "confidence": 0.92,
  "proficiency_level": "intermediate",
  "assessment_breakdown": {
    "syntax_knowledge": 90,
    "best_practices": 80,
    "problem_solving": 85,
    "code_quality": 82
  },
  "strengths": [
    "Good understanding of Python syntax",
    "Proper use of functions and control structures",
    "Experience with popular libraries"
  ],
  "areas_for_improvement": [
    "Error handling and exception management",
    "Code optimization and performance",
    "Advanced OOP concepts"
  ],
  "recommendations": [
    "Practice exception handling patterns",
    "Learn about Python decorators and context managers",
    "Study algorithm optimization techniques"
  ],
  "next_steps": [
    {
      "action": "Complete Python OOP course",
      "priority": "high",
      "estimated_time": "2 weeks"
    }
  ],
  "assessment_date": "2024-01-20T15:30:00Z",
  "model_version": "skillforge-assessment-v3.2"
}
```

### Generate Learning Content
```http
POST /ai/generate-content
Authorization: Bearer {access_token}
```

**Request Body:**
```json
{
  "skill_name": "Python",
  "current_level": "beginner",
  "target_level": "intermediate",
  "learning_style": "hands-on",
  "time_available": "2 hours per week",
  "specific_topics": ["object-oriented programming", "error handling"]
}
```

**Response:**
```json
{
  "content": {
    "title": "Python Intermediate Learning Path",
    "description": "Personalized learning content to advance from beginner to intermediate Python",
    "modules": [
      {
        "title": "Object-Oriented Programming in Python",
        "content": "Detailed explanation of OOP concepts...",
        "exercises": [
          {
            "title": "Create a Class",
            "description": "Build a simple class with methods",
            "code_template": "class Car:\n    def __init__(self):\n        pass"
          }
        ],
        "estimated_time": "3 hours"
      }
    ]
  },
  "metadata": {
    "word_count": 2500,
    "reading_time": 15,
    "difficulty": "intermediate",
    "prerequisites": ["Basic Python syntax", "Functions"],
    "learning_objectives": [
      "Understand class creation and instantiation",
      "Implement inheritance and polymorphism"
    ]
  },
  "personalization": {
    "adapted_for_style": "hands-on",
    "time_optimized": true,
    "skill_level_appropriate": true
  },
  "generated_at": "2024-01-20T16:00:00Z"
}
```

### Career Path Recommendations
```http
GET /ai/career-paths
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "paths": [
    {
      "title": "Senior Python Developer",
      "probability": 0.85,
      "timeline": "2-3 years",
      "current_match": 0.72,
      "salary_range": {
        "min": 120000,
        "max": 180000,
        "currency": "USD"
      },
      "required_skills": [
        {
          "name": "Advanced Python",
          "current_level": "intermediate",
          "required_level": "advanced",
          "gap_score": 0.3
        },
        {
          "name": "System Design",
          "current_level": "beginner",
          "required_level": "intermediate",
          "gap_score": 0.6
        }
      ],
      "recommended_actions": [
        {
          "action": "Complete advanced Python course",
          "priority": "high",
          "estimated_time": "3 months",
          "impact": 0.4
        },
        {
          "action": "Build a large-scale project",
          "priority": "medium",
          "estimated_time": "6 months",
          "impact": 0.3
        }
      ],
      "job_market": {
        "demand": "high",
        "growth_rate": 0.15,
        "competition": "medium"
      }
    }
  ],
  "analysis_date": "2024-01-20T16:30:00Z",
  "confidence": 0.88
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication Error",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Authorization Error",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "request_id": "req_abc123"
}
```

## Rate Limits

- **Authentication endpoints**: 10 requests per 15 minutes
- **AI endpoints**: 50 requests per minute
- **General API**: 100 requests per minute
- **File uploads**: 5 requests per minute

## Webhooks

SkillForge AI supports webhooks for real-time notifications:

### Job Application Status Update
```json
{
  "event": "application.status_changed",
  "data": {
    "application_id": 456,
    "job_id": 1,
    "user_id": 123,
    "old_status": "applied",
    "new_status": "interview",
    "changed_at": "2024-01-21T10:00:00Z"
  }
}
```

### Skill Assessment Completed
```json
{
  "event": "assessment.completed",
  "data": {
    "user_id": 123,
    "skill_name": "Python",
    "score": 85,
    "completed_at": "2024-01-21T11:00:00Z"
  }
}
```
