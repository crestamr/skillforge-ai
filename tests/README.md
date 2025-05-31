# Tests - SkillForge AI

## Overview
This directory contains the comprehensive test suite for SkillForge AI, covering unit tests, integration tests, end-to-end tests, performance tests, and security tests across all components of the application.

## Testing Strategy
Our testing approach follows the testing pyramid with emphasis on:
- **Unit Tests (70%)**: Fast, isolated tests for individual components
- **Integration Tests (20%)**: Service interaction and API testing
- **End-to-End Tests (10%)**: Complete user journey validation

## Test Structure
```
tests/
├── unit/                  # Unit tests for individual components
│   ├── frontend/          # React component and utility tests
│   │   ├── components/    # Component-specific tests
│   │   ├── hooks/         # Custom hook tests
│   │   ├── utils/         # Utility function tests
│   │   └── stores/        # State management tests
│   ├── backend/           # FastAPI service tests
│   │   ├── api/           # API endpoint tests
│   │   ├── services/      # Business logic tests
│   │   ├── models/        # Database model tests
│   │   └── utils/         # Utility function tests
│   └── ai-services/       # AI/ML service tests
│       ├── models/        # AI model tests
│       ├── services/      # AI service logic tests
│       └── utils/         # AI utility tests
├── integration/           # Integration tests
│   ├── api/               # API integration tests
│   ├── database/          # Database integration tests
│   ├── ai-services/       # AI service integration tests
│   └── external/          # Third-party service tests
├── e2e/                   # End-to-end tests
│   ├── user-flows/        # Complete user journey tests
│   ├── admin-flows/       # Admin functionality tests
│   └── mobile/            # Mobile-specific E2E tests
├── performance/           # Performance and load tests
│   ├── api/               # API performance tests
│   ├── database/          # Database performance tests
│   └── ai-models/         # AI model performance tests
├── security/              # Security tests
│   ├── authentication/    # Auth security tests
│   ├── authorization/     # Access control tests
│   ├── input-validation/  # Input sanitization tests
│   └── vulnerability/     # Security vulnerability tests
├── accessibility/         # Accessibility tests
│   ├── wcag/              # WCAG compliance tests
│   ├── screen-reader/     # Screen reader compatibility
│   └── keyboard/          # Keyboard navigation tests
├── fixtures/              # Test data and fixtures
│   ├── users/             # User test data
│   ├── skills/            # Skill test data
│   ├── assessments/       # Assessment test data
│   └── jobs/              # Job posting test data
├── utils/                 # Test utilities and helpers
│   ├── factories/         # Test data factories
│   ├── mocks/             # Mock implementations
│   └── helpers/           # Test helper functions
└── config/                # Test configuration
    ├── jest.config.js     # Jest configuration
    ├── playwright.config.ts # Playwright configuration
    └── pytest.ini         # Pytest configuration
```

## Testing Technologies

### Frontend Testing
- **Jest**: JavaScript testing framework
- **React Testing Library**: React component testing
- **Playwright**: End-to-end browser testing
- **MSW (Mock Service Worker)**: API mocking
- **Testing Library User Events**: User interaction simulation

### Backend Testing
- **pytest**: Python testing framework
- **pytest-asyncio**: Async testing support
- **httpx**: HTTP client for API testing
- **factory-boy**: Test data generation
- **pytest-mock**: Mocking and patching

### AI Services Testing
- **pytest**: Python testing framework
- **torch**: PyTorch model testing
- **transformers**: HuggingFace model testing
- **numpy**: Numerical computation testing
- **scikit-learn**: ML evaluation metrics

### Performance Testing
- **Locust**: Load testing framework
- **Artillery**: API performance testing
- **Lighthouse**: Frontend performance testing
- **pytest-benchmark**: Python performance testing

## Test Configuration

### Jest Configuration (Frontend)
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/config/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testMatch: [
    '<rootDir>/tests/unit/frontend/**/*.test.{js,jsx,ts,tsx}',
  ],
};
```

### Pytest Configuration (Backend)
```ini
# pytest.ini
[tool:pytest]
testpaths = tests/unit/backend tests/integration
python_files = test_*.py *_test.py
python_classes = Test*
python_functions = test_*
addopts = 
    --strict-markers
    --strict-config
    --cov=app
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=90
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow running tests
    ai: AI model tests
```

### Playwright Configuration (E2E)
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Data Management

### Test Fixtures
Organized test data for consistent testing:
```python
# fixtures/users.py
import pytest
from app.models import User

@pytest.fixture
def sample_user():
    return {
        "email": "test@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "password": "SecurePassword123!",
    }

@pytest.fixture
def authenticated_user(client, sample_user):
    # Create user and return authentication token
    response = client.post("/api/v1/auth/register", json=sample_user)
    return response.json()["access_token"]
```

### Data Factories
Automated test data generation:
```python
# utils/factories.py
import factory
from app.models import User, Skill, Assessment

class UserFactory(factory.Factory):
    class Meta:
        model = User
    
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_active = True

class SkillFactory(factory.Factory):
    class Meta:
        model = Skill
    
    name = factory.Faker("word")
    category = factory.Faker("random_element", elements=["technical", "soft", "business"])
    level = factory.Faker("random_element", elements=["beginner", "intermediate", "advanced"])
```

## Test Categories

### Unit Tests
**Frontend Component Tests**
```typescript
// tests/unit/frontend/components/SkillCard.test.tsx
import { render, screen } from '@testing-library/react';
import { SkillCard } from '@/components/SkillCard';

describe('SkillCard', () => {
  const mockSkill = {
    id: '1',
    name: 'React',
    level: 'intermediate',
    progress: 75,
  };

  it('renders skill information correctly', () => {
    render(<SkillCard skill={mockSkill} />);
    
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('intermediate')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  });

  it('handles click events', async () => {
    const onClickMock = jest.fn();
    render(<SkillCard skill={mockSkill} onClick={onClickMock} />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(onClickMock).toHaveBeenCalledWith(mockSkill.id);
  });
});
```

**Backend API Tests**
```python
# tests/unit/backend/api/test_users.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_user():
    user_data = {
        "email": "test@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "password": "SecurePassword123!"
    }
    
    response = client.post("/api/v1/users/", json=user_data)
    
    assert response.status_code == 201
    assert response.json()["email"] == user_data["email"]
    assert "password" not in response.json()

def test_get_user_profile(authenticated_user):
    headers = {"Authorization": f"Bearer {authenticated_user}"}
    response = client.get("/api/v1/users/me", headers=headers)
    
    assert response.status_code == 200
    assert "email" in response.json()
```

### Integration Tests
**API Integration Tests**
```python
# tests/integration/api/test_skill_assessment.py
import pytest
from fastapi.testclient import TestClient

@pytest.mark.integration
def test_complete_skill_assessment_flow(client, authenticated_user, sample_assessment):
    headers = {"Authorization": f"Bearer {authenticated_user}"}
    
    # Start assessment
    start_response = client.post(
        f"/api/v1/assessments/{sample_assessment.id}/start",
        headers=headers
    )
    assert start_response.status_code == 200
    
    # Submit answers
    answers = {"question_1": "A", "question_2": "B"}
    submit_response = client.post(
        f"/api/v1/assessments/{sample_assessment.id}/submit",
        json=answers,
        headers=headers
    )
    assert submit_response.status_code == 200
    
    # Get results
    results_response = client.get(
        f"/api/v1/assessments/{sample_assessment.id}/results",
        headers=headers
    )
    assert results_response.status_code == 200
    assert "score" in results_response.json()
```

### End-to-End Tests
**User Journey Tests**
```typescript
// tests/e2e/user-flows/onboarding.spec.ts
import { test, expect } from '@playwright/test';

test('complete user onboarding flow', async ({ page }) => {
  // Navigate to registration
  await page.goto('/register');
  
  // Fill registration form
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'SecurePassword123!');
  await page.fill('[data-testid="first-name"]', 'John');
  await page.fill('[data-testid="last-name"]', 'Doe');
  
  // Submit registration
  await page.click('[data-testid="register-button"]');
  
  // Verify redirect to onboarding
  await expect(page).toHaveURL('/onboarding');
  
  // Complete skill selection
  await page.click('[data-testid="skill-react"]');
  await page.click('[data-testid="skill-typescript"]');
  await page.click('[data-testid="continue-button"]');
  
  // Complete career goals
  await page.selectOption('[data-testid="career-goal"]', 'senior-developer');
  await page.click('[data-testid="finish-onboarding"]');
  
  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
});
```

### Performance Tests
**API Load Testing**
```python
# tests/performance/api/test_load.py
from locust import HttpUser, task, between

class SkillForgeUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login and get token
        response = self.client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def get_user_profile(self):
        self.client.get("/api/v1/users/me", headers=self.headers)
    
    @task(2)
    def get_skill_recommendations(self):
        self.client.get("/api/v1/skills/recommendations", headers=self.headers)
    
    @task(1)
    def start_assessment(self):
        self.client.post("/api/v1/assessments/1/start", headers=self.headers)
```

### Security Tests
**Authentication Security**
```python
# tests/security/authentication/test_auth_security.py
import pytest

def test_password_requirements():
    """Test password strength requirements"""
    weak_passwords = ["123", "password", "abc123"]
    
    for password in weak_passwords:
        response = client.post("/api/v1/auth/register", json={
            "email": "test@example.com",
            "password": password,
            "first_name": "Test",
            "last_name": "User"
        })
        assert response.status_code == 422
        assert "password" in response.json()["detail"][0]["loc"]

def test_rate_limiting():
    """Test API rate limiting"""
    for _ in range(10):
        response = client.post("/api/v1/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
    
    # Should be rate limited after multiple failed attempts
    assert response.status_code == 429
```

## Running Tests

### Local Development
```bash
# Frontend tests
cd frontend
npm test                    # Run unit tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm run test:e2e          # End-to-end tests

# Backend tests
cd backend
pytest                     # Run all tests
pytest tests/unit/         # Unit tests only
pytest tests/integration/  # Integration tests only
pytest --cov=app          # With coverage
pytest -m "not slow"      # Skip slow tests

# AI Services tests
cd ai-services
pytest tests/unit/ai-services/
pytest tests/performance/ai-models/
```

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run test:e2e

  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r requirements/test.txt
      - run: pytest --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v3
```

## Test Quality Standards

### Coverage Requirements
- **Unit Tests**: Minimum 90% code coverage
- **Integration Tests**: Critical path coverage
- **E2E Tests**: Key user journey coverage
- **Security Tests**: All authentication and authorization flows

### Test Quality Metrics
- **Test Reliability**: <1% flaky test rate
- **Test Performance**: Unit tests <5s, Integration tests <30s
- **Test Maintenance**: Regular review and updates
- **Documentation**: All test scenarios documented

## Contributing to Tests

### Writing New Tests
1. **Identify Test Type**: Determine appropriate test level
2. **Follow Patterns**: Use existing test patterns and utilities
3. **Test Data**: Use factories and fixtures for consistent data
4. **Assertions**: Write clear, specific assertions
5. **Documentation**: Document complex test scenarios

### Test Review Process
1. **Code Review**: Peer review of test code
2. **Coverage Check**: Ensure adequate coverage
3. **Performance Review**: Check test execution time
4. **Maintenance**: Consider long-term maintainability

---

This comprehensive test suite ensures the reliability, performance, and security of SkillForge AI across all components and user interactions.
