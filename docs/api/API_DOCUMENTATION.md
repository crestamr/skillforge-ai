# 🚀 SkillForge AI - Comprehensive API Documentation

## Overview

SkillForge AI provides a comprehensive RESTful API for intelligent career development. Our API enables developers to integrate advanced AI-powered features including skill assessment, job matching, learning path generation, and market intelligence into their applications.

## Base URLs

- **Production**: `https://api.skillforge.ai/v1`
- **Staging**: `https://staging-api.skillforge.ai/v1`
- **Development**: `http://localhost:8000/api/v1`

## Authentication

### JWT Bearer Token Authentication

All API endpoints require authentication using JWT Bearer tokens.

```http
Authorization: Bearer <your_jwt_token>
```

### OAuth2 Integration

SkillForge AI supports OAuth2 authentication with the following providers:
- GitHub
- LinkedIn
- Google

### API Key Authentication (Enterprise)

Enterprise customers can use API keys for server-to-server communication:

```http
X-API-Key: <your_api_key>
```

## Rate Limiting

| Tier | Requests per minute | Requests per hour | Requests per day |
|------|-------------------|------------------|------------------|
| Free | 60 | 1,000 | 10,000 |
| Pro | 300 | 10,000 | 100,000 |
| Enterprise | 1,000 | 50,000 | 1,000,000 |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the rate limit resets

## Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    },
    "request_id": "req_1234567890",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## API Endpoints

### 🔐 Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "terms_accepted": true
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires_in": 3600
}
```

#### POST /auth/login
Authenticate user and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### 👤 User Management Endpoints

#### GET /users/profile
Get current user's profile information.

**Response (200):**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "profile_image_url": "https://cdn.skillforge.ai/profiles/user_123.jpg",
  "bio": "Software engineer passionate about AI and career development",
  "skills": [
    {
      "skill_id": "python",
      "skill_name": "Python",
      "proficiency_level": 8,
      "verified": true,
      "last_assessed": "2024-01-10T15:30:00Z"
    }
  ],
  "career_goals": ["Senior Software Engineer", "Tech Lead"],
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

#### PUT /users/profile
Update user profile information.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "bio": "Updated bio",
  "career_goals": ["Senior Software Engineer", "Tech Lead"]
}
```

### 🎯 Skill Assessment Endpoints

#### GET /assessments
List available skill assessments.

**Query Parameters:**
- `category` (optional): Filter by skill category
- `difficulty` (optional): Filter by difficulty level (1-10)
- `limit` (optional): Number of results per page (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200):**
```json
{
  "assessments": [
    {
      "id": "assessment_python_basic",
      "title": "Python Fundamentals Assessment",
      "description": "Test your knowledge of Python basics",
      "skill_id": "python",
      "difficulty": 3,
      "duration_minutes": 30,
      "question_count": 25,
      "passing_score": 70,
      "tags": ["programming", "python", "fundamentals"]
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

#### POST /assessments/{assessment_id}/start
Start a skill assessment.

**Response (201):**
```json
{
  "session_id": "session_abc123",
  "assessment": {
    "id": "assessment_python_basic",
    "title": "Python Fundamentals Assessment",
    "duration_minutes": 30,
    "question_count": 25
  },
  "started_at": "2024-01-15T10:30:00Z",
  "expires_at": "2024-01-15T11:00:00Z"
}
```

#### GET /assessments/sessions/{session_id}/questions
Get next question in assessment session.

**Response (200):**
```json
{
  "question": {
    "id": "q_123",
    "type": "multiple_choice",
    "question_text": "What is the output of print(type([]))?",
    "options": [
      {"id": "a", "text": "<class 'list'>"},
      {"id": "b", "text": "<class 'array'>"},
      {"id": "c", "text": "list"},
      {"id": "d", "text": "array"}
    ],
    "time_limit_seconds": 60
  },
  "progress": {
    "current_question": 5,
    "total_questions": 25,
    "time_remaining_seconds": 1200
  }
}
```

#### POST /assessments/sessions/{session_id}/answers
Submit answer for current question.

**Request Body:**
```json
{
  "question_id": "q_123",
  "answer": "a",
  "time_taken_seconds": 15
}
```

### 🤖 AI Services Endpoints

#### POST /ai/learning-paths/generate
Generate personalized learning path.

**Request Body:**
```json
{
  "user_id": "user_123",
  "current_skills": {
    "python": 6,
    "javascript": 4,
    "react": 3
  },
  "target_role": "Full Stack Developer",
  "career_goals": ["Senior Developer", "Tech Lead"],
  "learning_pace": "medium",
  "time_commitment_hours_week": 10,
  "preferred_formats": ["video", "interactive"],
  "budget_monthly": 100.0
}
```

**Response (200):**
```json
{
  "path_id": "path_user123_20240115",
  "title": "Path to Full Stack Developer",
  "description": "Personalized learning journey to advance your career",
  "steps": [
    {
      "skill_id": "react",
      "skill_name": "React",
      "skill_category": "Frontend",
      "resources": [
        {
          "id": "course_react_advanced",
          "title": "Advanced React Patterns",
          "provider": "udemy",
          "duration_hours": 40,
          "rating": 4.8,
          "cost": 89.99
        }
      ],
      "estimated_weeks": 4,
      "priority_score": 85.5,
      "prerequisites_met": true,
      "milestone_description": "Master React fundamentals and advanced patterns"
    }
  ],
  "total_duration_weeks": 16,
  "estimated_salary_increase": 25.0,
  "confidence_score": 0.87
}
```

#### GET /ai/sentiment/technology-trends
Get technology sentiment trends.

**Query Parameters:**
- `technologies`: Comma-separated list of technologies (e.g., "React,Python,AWS")

**Response (200):**
```json
[
  {
    "technology": "React",
    "current_sentiment": 0.75,
    "sentiment_change_7d": 0.12,
    "sentiment_change_30d": 0.08,
    "volume_change_7d": 25.5,
    "volume_change_30d": 45.2,
    "trend_direction": "rising",
    "risk_level": "low",
    "confidence_score": 0.89,
    "opportunities": [
      "Growing demand for React skills",
      "New React features driving adoption"
    ],
    "warnings": []
  }
]
```

### 💼 Job Matching Endpoints

#### POST /jobs/match
Find matching jobs based on user profile.

**Request Body:**
```json
{
  "user_skills": {
    "python": 8,
    "javascript": 6,
    "react": 7
  },
  "preferences": {
    "locations": ["San Francisco", "Remote"],
    "salary_min": 120000,
    "job_types": ["full-time"],
    "company_sizes": ["startup", "medium"]
  },
  "limit": 20
}
```

**Response (200):**
```json
{
  "matches": [
    {
      "job_id": "job_123",
      "title": "Senior Full Stack Developer",
      "company": "TechCorp Inc.",
      "location": "San Francisco, CA",
      "salary_range": {
        "min": 140000,
        "max": 180000,
        "currency": "USD"
      },
      "match_score": 0.92,
      "skill_match": {
        "matched_skills": ["python", "javascript", "react"],
        "missing_skills": ["aws", "docker"],
        "skill_gaps": [
          {
            "skill": "aws",
            "required_level": 6,
            "current_level": 0,
            "gap_size": 6
          }
        ]
      },
      "posted_at": "2024-01-10T09:00:00Z",
      "application_deadline": "2024-02-10T23:59:59Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

## Webhooks

SkillForge AI supports webhooks for real-time event notifications.

### Webhook Events

| Event | Description |
|-------|-------------|
| `assessment.completed` | User completed a skill assessment |
| `learning_path.milestone_reached` | User reached a learning milestone |
| `job.new_match` | New job match found for user |
| `skill.level_updated` | User's skill level was updated |

### Webhook Payload Example

```json
{
  "event": "assessment.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "user_id": "user_123",
    "assessment_id": "assessment_python_basic",
    "score": 85,
    "passed": true,
    "skill_level_before": 6,
    "skill_level_after": 7
  }
}
```

## SDKs and Code Examples

### Python SDK

```python
from skillforge import SkillForgeClient

client = SkillForgeClient(api_key="your_api_key")

# Generate learning path
learning_path = client.learning_paths.generate(
    user_id="user_123",
    current_skills={"python": 6, "javascript": 4},
    target_role="Full Stack Developer"
)

print(f"Generated path: {learning_path.title}")
```

### JavaScript SDK

```javascript
import { SkillForgeClient } from '@skillforge/sdk';

const client = new SkillForgeClient({
  apiKey: 'your_api_key'
});

// Get job matches
const matches = await client.jobs.findMatches({
  userSkills: { python: 8, javascript: 6 },
  preferences: { locations: ['Remote'] }
});

console.log(`Found ${matches.length} job matches`);
```

### cURL Examples

```bash
# Get user profile
curl -X GET "https://api.skillforge.ai/v1/users/profile" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json"

# Start assessment
curl -X POST "https://api.skillforge.ai/v1/assessments/python_basic/start" \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json"
```

## Performance Considerations

### Caching
- User profiles are cached for 5 minutes
- Assessment questions are cached for 1 hour
- Job listings are cached for 15 minutes

### Batch Operations
For bulk operations, use batch endpoints:
- `POST /users/batch` - Create multiple users
- `POST /assessments/batch` - Submit multiple assessment answers

### Pagination
All list endpoints support cursor-based pagination for optimal performance:

```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIzfQ==",
    "has_more": true
  }
}
```

## Postman Collection

Download our comprehensive Postman collection:
[SkillForge AI API Collection](https://api.skillforge.ai/postman/collection.json)

## Support

- **Documentation**: [https://docs.skillforge.ai](https://docs.skillforge.ai)
- **API Status**: [https://status.skillforge.ai](https://status.skillforge.ai)
- **Support Email**: api-support@skillforge.ai
- **Developer Discord**: [https://discord.gg/skillforge](https://discord.gg/skillforge)
