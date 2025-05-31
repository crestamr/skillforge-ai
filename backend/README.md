# Backend - SkillForge AI

## Overview
This directory contains the FastAPI backend services for SkillForge AI. The backend provides RESTful APIs for user management, skill assessments, job matching, learning paths, and integration with AI services.

## Technology Stack
- **Framework**: FastAPI with Python 3.11+
- **Database**: PostgreSQL (primary), MongoDB (documents)
- **Caching**: Redis for sessions and API caching
- **Task Queue**: Celery with Redis broker
- **Authentication**: JWT with OAuth2 (GitHub, LinkedIn)
- **Validation**: Pydantic models with comprehensive validation
- **Testing**: pytest with comprehensive test coverage
- **Documentation**: Auto-generated OpenAPI/Swagger docs

## Project Structure
```
backend/
├── app/
│   ├── api/                # API route definitions
│   │   ├── v1/            # API version 1 routes
│   │   │   ├── auth.py    # Authentication endpoints
│   │   │   ├── users.py   # User management
│   │   │   ├── skills.py  # Skill management
│   │   │   ├── assessments.py # Skill assessments
│   │   │   ├── jobs.py    # Job matching
│   │   │   └── learning.py # Learning paths
│   │   └── deps.py        # Dependency injection
│   ├── core/              # Core application logic
│   │   ├── config.py      # Configuration management
│   │   ├── security.py    # Security utilities
│   │   ├── database.py    # Database connections
│   │   └── celery_app.py  # Celery configuration
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── main.py           # FastAPI application entry
├── migrations/            # Alembic database migrations
├── tests/                # Test files
├── scripts/              # Utility scripts
└── requirements/         # Python dependencies
```

## Key Features
- **Modular Architecture**: Clean separation of concerns with dependency injection
- **Authentication**: Secure JWT-based auth with OAuth2 providers
- **Database**: Multi-database support with PostgreSQL and MongoDB
- **Background Tasks**: Celery integration for long-running processes
- **Caching**: Redis-based caching for performance optimization
- **Validation**: Comprehensive input validation with Pydantic
- **Documentation**: Auto-generated API documentation
- **Monitoring**: Structured logging and health check endpoints
- **Security**: OWASP best practices implementation

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/oauth/{provider}` - OAuth login

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update user profile
- `POST /api/v1/users/upload-resume` - Upload and parse resume
- `GET /api/v1/users/{user_id}/skills` - Get user skills

### Skills & Assessments
- `GET /api/v1/skills` - List available skills
- `POST /api/v1/assessments/{assessment_id}/start` - Start assessment
- `POST /api/v1/assessments/{assessment_id}/submit` - Submit assessment
- `GET /api/v1/assessments/results` - Get assessment results

### Job Matching
- `GET /api/v1/jobs/matches` - Get personalized job matches
- `POST /api/v1/jobs/search` - Search jobs with filters
- `GET /api/v1/jobs/{job_id}/analysis` - Get skill gap analysis

### Learning Paths
- `GET /api/v1/learning/paths` - Get recommended learning paths
- `POST /api/v1/learning/paths/{path_id}/enroll` - Enroll in learning path
- `PUT /api/v1/learning/progress` - Update learning progress

## Setup Instructions

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- MongoDB 6+
- Redis 7+

### Installation
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements/dev.txt
```

### Environment Variables
Create `.env` file:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/skillforge
MONGODB_URL=mongodb://localhost:27017/skillforge
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# External APIs
AI_SERVICE_URL=http://localhost:8001
EXTERNAL_JOB_API_KEY=your-job-api-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Database Setup
```bash
# Run migrations
alembic upgrade head

# Seed initial data
python scripts/seed_data.py
```

### Development
```bash
# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start Celery worker
celery -A app.core.celery_app worker --loglevel=info

# Start Celery beat (scheduler)
celery -A app.core.celery_app beat --loglevel=info

# Run tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html

# Format code
black app/
isort app/

# Lint code
flake8 app/
mypy app/
```

## Database Models

### Core Models
- **User**: User accounts and profiles
- **UserSocialAuth**: OAuth provider connections
- **Skill**: Skill definitions and categories
- **UserSkill**: User skill proficiency levels
- **Assessment**: Skill assessment definitions
- **UserAssessment**: Assessment results and scores
- **JobPosting**: Job listings and requirements
- **LearningPath**: Curated learning sequences

### Relationships
- Users have many Skills through UserSkills
- Users complete many Assessments through UserAssessments
- Skills belong to Categories and have Prerequisites
- Learning Paths contain multiple Skills in sequence

## Security Implementation
- **Password Hashing**: Argon2id for secure password storage
- **JWT Tokens**: Secure token generation with proper expiration
- **Rate Limiting**: API endpoint protection against abuse
- **Input Validation**: Comprehensive validation with Pydantic
- **SQL Injection Prevention**: SQLAlchemy ORM usage
- **CORS Configuration**: Proper cross-origin request handling
- **Security Headers**: Implementation of security best practices

## Performance Optimization
- **Database Indexing**: Optimized queries with proper indexes
- **Caching Strategy**: Redis caching for frequently accessed data
- **Connection Pooling**: Efficient database connection management
- **Background Processing**: Celery for time-intensive operations
- **Response Compression**: Gzip compression for API responses

## Monitoring & Logging
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Health Checks**: Endpoint monitoring for dependencies
- **Metrics Collection**: Custom metrics for business KPIs
- **Error Tracking**: Integration with Sentry for error monitoring
- **Performance Monitoring**: Request timing and database query analysis

## Testing Strategy
- **Unit Tests**: Individual function and method testing
- **Integration Tests**: API endpoint testing with test database
- **Performance Tests**: Load testing for critical endpoints
- **Security Tests**: Vulnerability scanning and penetration testing
- **Contract Tests**: API contract validation

## Deployment
- **Containerization**: Docker images for consistent deployment
- **CI/CD Pipeline**: GitHub Actions for automated testing and deployment
- **Environment Management**: Separate configs for dev/staging/production
- **Database Migrations**: Automated migration deployment
- **Health Monitoring**: Deployment verification and rollback procedures

## Contributing
1. Follow PEP 8 style guidelines
2. Write comprehensive tests for new features
3. Update API documentation for endpoint changes
4. Implement proper error handling and logging
5. Follow security best practices for sensitive operations
