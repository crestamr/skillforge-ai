# 🏗️ SkillForge AI - Technical Documentation

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Database Schema](#database-schema)
4. [API Design Principles](#api-design-principles)
5. [Authentication & Authorization](#authentication--authorization)
6. [Caching Strategy](#caching-strategy)
7. [Background Job Processing](#background-job-processing)
8. [AI Model Architecture](#ai-model-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [Monitoring & Observability](#monitoring--observability)
11. [Security Controls](#security-controls)
12. [Performance Optimization](#performance-optimization)
13. [Development Setup](#development-setup)
14. [Contribution Guidelines](#contribution-guidelines)

## System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        API_CLIENT[API Clients]
    end
    
    subgraph "API Gateway"
        GATEWAY[Kong/Nginx Gateway]
        RATE_LIMIT[Rate Limiting]
        AUTH_MIDDLEWARE[Auth Middleware]
    end
    
    subgraph "Application Layer"
        BACKEND[FastAPI Backend]
        AI_SERVICES[AI Services]
        JOB_QUEUE[Celery Workers]
    end
    
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis Cache)]
        VECTOR_DB[(Pinecone Vector DB)]
        S3[(AWS S3)]
    end
    
    subgraph "External Services"
        HUGGINGFACE[HuggingFace Models]
        JOB_APIS[Job Board APIs]
        LEARNING_APIS[Learning Platform APIs]
    end
    
    WEB --> GATEWAY
    MOBILE --> GATEWAY
    API_CLIENT --> GATEWAY
    
    GATEWAY --> BACKEND
    BACKEND --> AI_SERVICES
    BACKEND --> JOB_QUEUE
    
    BACKEND --> POSTGRES
    BACKEND --> REDIS
    AI_SERVICES --> VECTOR_DB
    BACKEND --> S3
    
    AI_SERVICES --> HUGGINGFACE
    BACKEND --> JOB_APIS
    BACKEND --> LEARNING_APIS
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Web Application** | React-based frontend for user interactions |
| **Mobile App** | React Native mobile application |
| **API Gateway** | Request routing, rate limiting, authentication |
| **FastAPI Backend** | Core business logic, API endpoints |
| **AI Services** | Machine learning models and AI processing |
| **Celery Workers** | Background job processing |
| **PostgreSQL** | Primary data storage |
| **Redis** | Caching and session storage |
| **Vector DB** | Embeddings and similarity search |
| **AWS S3** | File storage and static assets |

## Data Flow Diagrams

### User Assessment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant AI as AI Service
    participant DB as Database
    
    U->>F: Start Assessment
    F->>B: POST /assessments/{id}/start
    B->>DB: Create Assessment Session
    B->>F: Return Session ID
    
    loop For Each Question
        F->>B: GET /assessments/sessions/{id}/questions
        B->>DB: Get Next Question
        B->>F: Return Question
        U->>F: Submit Answer
        F->>B: POST /assessments/sessions/{id}/answers
        B->>DB: Store Answer
    end
    
    B->>AI: Analyze Assessment Results
    AI->>B: Return Skill Levels
    B->>DB: Update User Skills
    B->>F: Assessment Complete
```

### Learning Path Generation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant AI as AI Service
    participant EXT as External APIs
    
    U->>F: Request Learning Path
    F->>B: POST /ai/learning-paths/generate
    B->>AI: Analyze User Profile
    AI->>AI: Identify Skill Gaps
    AI->>AI: Prioritize Skills
    AI->>EXT: Fetch Learning Resources
    AI->>AI: Generate Optimal Sequence
    AI->>B: Return Learning Path
    B->>F: Return Personalized Path
    F->>U: Display Learning Path
```

## Database Schema

### Core Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    profile_image_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skills table
CREATE TABLE skills (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 10),
    market_demand DECIMAL(3,2) CHECK (market_demand >= 0 AND market_demand <= 1),
    salary_impact DECIMAL(5,2),
    learning_time_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Skills table
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_id VARCHAR(50) REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 10),
    verified BOOLEAN DEFAULT FALSE,
    last_assessed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, skill_id)
);

-- Assessments table
CREATE TABLE assessments (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    skill_id VARCHAR(50) REFERENCES skills(id),
    difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 10),
    duration_minutes INTEGER NOT NULL,
    question_count INTEGER NOT NULL,
    passing_score INTEGER CHECK (passing_score >= 0 AND passing_score <= 100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment Sessions table
CREATE TABLE assessment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assessment_id VARCHAR(100) REFERENCES assessments(id),
    status VARCHAR(20) DEFAULT 'in_progress',
    score INTEGER,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Learning Paths table
CREATE TABLE learning_paths (
    id VARCHAR(100) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_role VARCHAR(100),
    total_duration_weeks INTEGER,
    estimated_salary_increase DECIMAL(5,2),
    confidence_score DECIMAL(3,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    company VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    salary_min INTEGER,
    salary_max INTEGER,
    description TEXT,
    requirements JSONB,
    posted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    source VARCHAR(50),
    external_id VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes for Performance

```sql
-- User skills lookup
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);

-- Assessment sessions
CREATE INDEX idx_assessment_sessions_user_id ON assessment_sessions(user_id);
CREATE INDEX idx_assessment_sessions_status ON assessment_sessions(status);

-- Jobs search
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_salary_range ON jobs(salary_min, salary_max);

-- Full-text search
CREATE INDEX idx_jobs_search ON jobs USING gin(to_tsvector('english', title || ' ' || description));
```

## API Design Principles

### RESTful Design
- **Resource-based URLs**: `/users/{id}/skills` not `/getUserSkills`
- **HTTP methods**: GET (read), POST (create), PUT (update), DELETE (remove)
- **Status codes**: Meaningful HTTP status codes for all responses
- **Consistent naming**: snake_case for JSON fields, kebab-case for URLs

### Versioning Strategy
- **URL versioning**: `/api/v1/`, `/api/v2/`
- **Backward compatibility**: Maintain previous versions for 12 months
- **Deprecation headers**: `Sunset` header for deprecated endpoints

### Response Format
```json
{
  "data": { /* actual response data */ },
  "meta": {
    "pagination": { /* pagination info */ },
    "request_id": "req_123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Handling
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": { /* specific error details */ },
    "request_id": "req_123"
  }
}
```

## Authentication & Authorization

### JWT Token Structure
```json
{
  "sub": "user_123",
  "email": "user@example.com",
  "role": "user",
  "permissions": ["read:profile", "write:assessments"],
  "exp": 1642694400,
  "iat": 1642608000
}
```

### Permission System
- **Role-based access control (RBAC)**
- **Granular permissions**: `read:profile`, `write:assessments`, `admin:users`
- **Resource-level authorization**: Users can only access their own data

### Security Headers
```http
Authorization: Bearer <jwt_token>
X-API-Key: <api_key>  # For server-to-server
X-Request-ID: <unique_request_id>
```

## Caching Strategy

### Redis Cache Layers

| Cache Type | TTL | Use Case |
|------------|-----|----------|
| **User Sessions** | 24 hours | Authentication tokens |
| **User Profiles** | 5 minutes | Frequently accessed user data |
| **Assessment Questions** | 1 hour | Static assessment content |
| **Job Listings** | 15 minutes | External job data |
| **Skill Data** | 1 day | Skill taxonomy and metadata |
| **Learning Resources** | 4 hours | External learning content |

### Cache Invalidation
- **Time-based**: Automatic expiration with TTL
- **Event-based**: Invalidate on data updates
- **Manual**: Admin tools for cache management

### Cache Keys Pattern
```
skillforge:{service}:{resource}:{id}:{version}

Examples:
skillforge:api:user:123:v1
skillforge:ai:assessment:python_basic:v2
skillforge:jobs:matches:user_123:v1
```

## Background Job Processing

### Celery Task Architecture

```python
# Task categories and priorities
CELERY_ROUTES = {
    'ai.generate_learning_path': {'queue': 'ai_high'},
    'ai.analyze_sentiment': {'queue': 'ai_medium'},
    'jobs.sync_external_jobs': {'queue': 'jobs_low'},
    'notifications.send_email': {'queue': 'notifications'},
    'analytics.process_events': {'queue': 'analytics'}
}
```

### Task Types

| Task | Queue | Priority | Retry Policy |
|------|-------|----------|--------------|
| **Learning Path Generation** | ai_high | High | 3 retries, exponential backoff |
| **Sentiment Analysis** | ai_medium | Medium | 2 retries, linear backoff |
| **Job Synchronization** | jobs_low | Low | 5 retries, exponential backoff |
| **Email Notifications** | notifications | High | 3 retries, immediate retry |
| **Analytics Processing** | analytics | Low | No retries |

### Monitoring Tasks
```python
from celery import Celery
from celery.signals import task_failure, task_success

@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, einfo=None):
    logger.error(f"Task {task_id} failed: {exception}")
    # Send alert to monitoring system

@task_success.connect
def task_success_handler(sender=None, task_id=None, result=None, **kwargs):
    logger.info(f"Task {task_id} completed successfully")
```

## AI Model Architecture

### Model Selection Rationale

| Model | Use Case | Rationale |
|-------|----------|-----------|
| **RoBERTa** | Sentiment Analysis | Superior performance on social media text |
| **BERT** | Skill Extraction | Strong entity recognition capabilities |
| **GPT-3.5** | Content Generation | High-quality text generation |
| **Sentence-BERT** | Similarity Search | Efficient semantic similarity |
| **Random Forest** | Job Matching | Interpretable feature importance |

### Model Performance Metrics

```python
# Model evaluation metrics
PERFORMANCE_THRESHOLDS = {
    'sentiment_analysis': {
        'accuracy': 0.85,
        'f1_score': 0.83,
        'latency_ms': 200
    },
    'skill_extraction': {
        'precision': 0.90,
        'recall': 0.85,
        'latency_ms': 150
    },
    'job_matching': {
        'ndcg_at_10': 0.75,
        'map_score': 0.70,
        'latency_ms': 500
    }
}
```

### Model Deployment Strategy
- **A/B Testing**: Compare model versions with traffic splitting
- **Canary Releases**: Gradual rollout of new models
- **Fallback Models**: Simpler models for high-load scenarios
- **Model Versioning**: Track model performance over time

## Deployment Architecture

### Infrastructure Components

```yaml
# Kubernetes deployment structure
apiVersion: apps/v1
kind: Deployment
metadata:
  name: skillforge-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: skillforge-backend
  template:
    metadata:
      labels:
        app: skillforge-backend
    spec:
      containers:
      - name: backend
        image: skillforge/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
```

### Environment Configuration

| Environment | Purpose | Resources |
|-------------|---------|-----------|
| **Development** | Local development | 1 CPU, 2GB RAM |
| **Staging** | Testing and QA | 2 CPU, 4GB RAM |
| **Production** | Live system | 4 CPU, 8GB RAM |

### Scaling Strategy
- **Horizontal Pod Autoscaler**: Scale based on CPU/memory usage
- **Vertical Pod Autoscaler**: Adjust resource requests automatically
- **Database Read Replicas**: Scale read operations
- **CDN**: Cache static assets globally

## Monitoring & Observability

### Metrics Collection

```python
# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge

# API metrics
api_requests_total = Counter('api_requests_total', 'Total API requests', ['method', 'endpoint', 'status'])
api_request_duration = Histogram('api_request_duration_seconds', 'API request duration')

# Business metrics
user_registrations = Counter('user_registrations_total', 'Total user registrations')
assessments_completed = Counter('assessments_completed_total', 'Total assessments completed')
learning_paths_generated = Counter('learning_paths_generated_total', 'Learning paths generated')

# System metrics
database_connections = Gauge('database_connections_active', 'Active database connections')
cache_hit_rate = Gauge('cache_hit_rate', 'Cache hit rate percentage')
```

### Logging Strategy

```python
import structlog

# Structured logging configuration
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Usage example
logger = structlog.get_logger()
logger.info("User assessment completed", 
           user_id="user_123", 
           assessment_id="python_basic", 
           score=85,
           duration_seconds=1800)
```

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
- name: skillforge.rules
  rules:
  - alert: HighErrorRate
    expr: rate(api_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      
  - alert: DatabaseConnectionsHigh
    expr: database_connections_active > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Database connections approaching limit"
```

## Security Controls

### Data Protection
- **Encryption at rest**: AES-256 for database and file storage
- **Encryption in transit**: TLS 1.3 for all communications
- **PII handling**: Separate encryption keys for sensitive data
- **Data retention**: Automated deletion of expired data

### Access Controls
- **Multi-factor authentication**: Required for admin accounts
- **API rate limiting**: Prevent abuse and DoS attacks
- **IP whitelisting**: Restrict admin access to known IPs
- **Audit logging**: Track all administrative actions

### Vulnerability Management
- **Dependency scanning**: Automated security vulnerability checks
- **Container scanning**: Security analysis of Docker images
- **Penetration testing**: Quarterly security assessments
- **Bug bounty program**: Community-driven security testing

## Performance Optimization

### Database Optimization
```sql
-- Query optimization examples
EXPLAIN ANALYZE SELECT u.*, us.proficiency_level 
FROM users u 
JOIN user_skills us ON u.id = us.user_id 
WHERE us.skill_id = 'python' 
AND us.proficiency_level >= 7;

-- Index usage
CREATE INDEX CONCURRENTLY idx_user_skills_skill_proficiency 
ON user_skills(skill_id, proficiency_level) 
WHERE proficiency_level >= 7;
```

### API Performance
- **Response compression**: Gzip compression for API responses
- **Pagination**: Limit large result sets with cursor-based pagination
- **Field selection**: Allow clients to specify required fields
- **Batch operations**: Reduce API calls with batch endpoints

### Caching Optimization
- **Cache warming**: Pre-populate frequently accessed data
- **Cache hierarchies**: Multiple cache layers for different data types
- **Cache monitoring**: Track hit rates and performance metrics

## Development Setup

### Prerequisites
```bash
# Required software
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose
```

### Local Development
```bash
# Clone repository
git clone https://github.com/skillforge/skillforge-ai.git
cd skillforge-ai

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Database setup
createdb skillforge_dev
alembic upgrade head

# Frontend setup
cd ../frontend
npm install
npm run dev

# Start services
docker-compose up -d postgres redis
python -m uvicorn app.main:app --reload
```

### Environment Variables
```bash
# .env file
DATABASE_URL=postgresql://user:pass@localhost/skillforge_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=your-secret-key
HUGGINGFACE_API_KEY=your-hf-key
OPENAI_API_KEY=your-openai-key
```

## Contribution Guidelines

### Code Standards
- **Python**: Follow PEP 8, use Black formatter
- **TypeScript**: Follow Airbnb style guide, use Prettier
- **Commit messages**: Conventional Commits format
- **Documentation**: Update docs for all public APIs

### Testing Requirements
- **Unit tests**: Minimum 80% code coverage
- **Integration tests**: Test API endpoints and database interactions
- **E2E tests**: Critical user journeys
- **Performance tests**: Load testing for key endpoints

### Pull Request Process
1. **Feature branch**: Create from `develop` branch
2. **Tests**: Ensure all tests pass
3. **Code review**: Minimum 2 approvals required
4. **Documentation**: Update relevant documentation
5. **Deployment**: Automatic deployment to staging

### Release Process
```bash
# Version bumping
npm version patch  # or minor, major
git tag v1.2.3
git push origin v1.2.3

# Automated deployment
# GitHub Actions will deploy to production
```

---

This technical documentation provides a comprehensive overview of SkillForge AI's architecture, implementation details, and operational procedures. For specific implementation questions, please refer to the code comments and inline documentation.
