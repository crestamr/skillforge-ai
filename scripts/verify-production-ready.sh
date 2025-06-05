#!/bin/bash

# SkillForge AI Production Readiness Verification Script
# Verifies that the codebase is clean and production-ready

echo "🔍 SkillForge AI Production Readiness Verification"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to print colored output
print_pass() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

echo ""
echo "🧹 Checking for development artifacts..."

# Check for test files
if [ ! -f "test_job_match_request.json" ] && [ ! -f "test_job_recommendations_request.json" ] && [ ! -f "test_market_trends_request.json" ]; then
    print_pass "No test JSON files found"
else
    print_fail "Test JSON files still present"
fi

# Check for development Docker files
if [ ! -f "docker-compose.minimal.yml" ] && [ ! -f "backend/Dockerfile.dev" ] && [ ! -f "frontend/Dockerfile.dev" ]; then
    print_pass "No development Docker files found"
else
    print_fail "Development Docker files still present"
fi

# Check for Python cache files
PYCACHE_COUNT=$(find . -name "__pycache__" -type d | wc -l)
if [ "$PYCACHE_COUNT" -eq 0 ]; then
    print_pass "No Python cache directories found"
else
    print_warning "$PYCACHE_COUNT Python cache directories found"
fi

# Check for .pyc files
PYC_COUNT=$(find . -name "*.pyc" | wc -l)
if [ "$PYC_COUNT" -eq 0 ]; then
    print_pass "No .pyc files found"
else
    print_warning "$PYC_COUNT .pyc files found"
fi

echo ""
echo "📁 Checking production structure..."

# Check for production deployment structure
if [ -d "deployment/production" ] && [ -f "deployment/production/.env.template" ]; then
    print_pass "Production deployment structure exists"
else
    print_fail "Production deployment structure missing"
fi

# Check for production Docker Compose
if [ -f "deployment/docker-compose.prod.yml" ]; then
    print_pass "Production Docker Compose file exists"
else
    print_fail "Production Docker Compose file missing"
fi

# Check for production scripts
if [ -f "scripts/backup-production.sh" ] && [ -f "scripts/health-check.sh" ]; then
    print_pass "Production scripts exist"
else
    print_fail "Production scripts missing"
fi

# Check for monitoring configuration
if [ -d "monitoring/prometheus" ] && [ -f "monitoring/prometheus/prometheus.yml" ]; then
    print_pass "Monitoring configuration exists"
else
    print_fail "Monitoring configuration missing"
fi

echo ""
echo "📚 Checking documentation..."

# Check for essential documentation
REQUIRED_DOCS=(
    "README.md"
    "PROJECT_STRUCTURE.md"
    "DEPLOYMENT_GUIDE.md"
    "docs/TECHNICAL_DOCUMENTATION.md"
    "docs/api/API_DOCUMENTATION.md"
    "docs/PRODUCTION_READY_SUMMARY.md"
)

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        print_pass "Documentation exists: $doc"
    else
        print_fail "Documentation missing: $doc"
    fi
done

echo ""
echo "🔒 Checking security configuration..."

# Check for .gitignore
if [ -f ".gitignore" ]; then
    if grep -q ".env" .gitignore && grep -q "*.log" .gitignore; then
        print_pass ".gitignore properly configured"
    else
        print_warning ".gitignore may need security updates"
    fi
else
    print_fail ".gitignore missing"
fi

# Check for environment template
if [ -f "deployment/production/.env.template" ]; then
    if grep -q "your-" deployment/production/.env.template; then
        print_pass "Environment template has placeholder values"
    else
        print_warning "Environment template may have real values"
    fi
else
    print_fail "Environment template missing"
fi

echo ""
echo "🐳 Checking Docker configuration..."

# Check for production Dockerfiles
DOCKER_FILES=(
    "backend/Dockerfile.prod"
    "frontend/Dockerfile.prod"
    "ai-services/Dockerfile.prod"
)

for dockerfile in "${DOCKER_FILES[@]}"; do
    if [ -f "$dockerfile" ]; then
        print_pass "Production Dockerfile exists: $dockerfile"
    else
        print_warning "Production Dockerfile missing: $dockerfile"
    fi
done

echo ""
echo "📊 Checking application structure..."

# Check for main application directories
REQUIRED_DIRS=(
    "frontend/src"
    "backend/app"
    "ai-services/app"
    "monitoring"
    "deployment"
    "docs"
    "scripts"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_pass "Required directory exists: $dir"
    else
        print_fail "Required directory missing: $dir"
    fi
done

# Check for package files
if [ -f "frontend/package.json" ] && [ -f "backend/requirements.txt" ] && [ -f "ai-services/requirements.txt" ]; then
    print_pass "Package dependency files exist"
else
    print_fail "Package dependency files missing"
fi

echo ""
echo "🧪 Checking for test infrastructure..."

# Check for test directories
if [ -d "backend/tests" ] && [ -d "frontend/src/__tests__" -o -d "tests" ]; then
    print_pass "Test infrastructure exists"
else
    print_warning "Test infrastructure may be incomplete"
fi

echo ""
echo "🔧 Checking script permissions..."

# Check script permissions
SCRIPTS=(
    "scripts/cleanup-production.sh"
    "scripts/backup-production.sh"
    "scripts/health-check.sh"
    "scripts/verify-production-ready.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            print_pass "Script is executable: $script"
        else
            print_warning "Script not executable: $script"
        fi
    fi
done

echo ""
echo "📈 Final verification..."

# Check for any remaining development files
DEV_PATTERNS=(
    "*.tmp"
    "*.log"
    "*.cache"
    "node_modules"
    "celerybeat-schedule"
)

for pattern in "${DEV_PATTERNS[@]}"; do
    COUNT=$(find . -name "$pattern" 2>/dev/null | wc -l)
    if [ "$COUNT" -eq 0 ]; then
        print_pass "No $pattern files found"
    else
        print_warning "$COUNT $pattern files found"
    fi
done

echo ""
echo "=================================================="
echo "🎯 PRODUCTION READINESS SUMMARY"
echo "=================================================="
echo -e "${GREEN}✅ PASSED: $PASSED${NC}"
echo -e "${YELLOW}⚠️  WARNINGS: $WARNINGS${NC}"
echo -e "${RED}❌ FAILED: $FAILED${NC}"

echo ""
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}🎉 PRODUCTION READY!${NC}"
    echo "SkillForge AI is ready for production deployment."
    echo ""
    echo "Next steps:"
    echo "1. Configure deployment/production/.env"
    echo "2. Run: docker-compose -f deployment/docker-compose.prod.yml up -d"
    echo "3. Verify: ./scripts/health-check.sh"
else
    echo -e "${RED}❌ NOT PRODUCTION READY${NC}"
    echo "Please fix the failed checks before deploying to production."
fi

echo ""
echo "For deployment instructions, see: DEPLOYMENT_GUIDE.md"
echo "For technical details, see: docs/TECHNICAL_DOCUMENTATION.md"
