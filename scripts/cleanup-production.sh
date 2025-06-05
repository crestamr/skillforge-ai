#!/bin/bash

# SkillForge AI Production Cleanup Script
# Removes development files, test data, and organizes structure for production

set -e

echo "🧹 Starting SkillForge AI Production Cleanup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Create backup directory
BACKUP_DIR="cleanup-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
print_info "Created backup directory: $BACKUP_DIR"

# Function to safely remove files/directories
safe_remove() {
    local path="$1"
    local description="$2"
    
    if [ -e "$path" ]; then
        print_info "Removing $description: $path"
        # Create backup if it's important
        if [[ "$path" == *"config"* ]] || [[ "$path" == *"env"* ]]; then
            cp -r "$path" "$BACKUP_DIR/" 2>/dev/null || true
        fi
        rm -rf "$path"
        print_status "Removed $description"
    fi
}

# Function to clean directory but keep structure
clean_directory() {
    local dir="$1"
    local description="$2"
    
    if [ -d "$dir" ]; then
        print_info "Cleaning $description: $dir"
        find "$dir" -type f -name "*.tmp" -delete 2>/dev/null || true
        find "$dir" -type f -name "*.log" -delete 2>/dev/null || true
        find "$dir" -type f -name "*.cache" -delete 2>/dev/null || true
        find "$dir" -empty -type d -delete 2>/dev/null || true
        print_status "Cleaned $description"
    fi
}

echo ""
echo "🗑️  Removing test and development files..."

# Remove test JSON files
safe_remove "test_job_match_request.json" "test job match request file"
safe_remove "test_job_recommendations_request.json" "test job recommendations file"
safe_remove "test_market_trends_request.json" "test market trends file"

# Remove development Docker files
safe_remove "docker-compose.minimal.yml" "minimal Docker Compose file"
safe_remove "backend/Dockerfile.dev" "backend development Dockerfile"
safe_remove "frontend/Dockerfile.dev" "frontend development Dockerfile"
safe_remove "ai-services/Dockerfile.dev" "AI services development Dockerfile"

# Remove Celery beat schedule file
safe_remove "backend/celerybeat-schedule" "Celery beat schedule file"

echo ""
echo "📁 Cleaning up documentation structure..."

# Remove redundant documentation files
safe_remove "docs/PROJECT_README.md" "redundant project README"
safe_remove "docs/SETUP_SUCCESS.md" "setup success documentation"
safe_remove "docs/NEXT_STEPS.md" "next steps documentation"
safe_remove "docs/README.md" "redundant docs README"

# Remove development progress files
safe_remove "docs/progress" "development progress directory"
safe_remove "docs/development" "development documentation directory"
safe_remove "docs/analysis" "analysis documentation directory"

# Remove redundant technical docs
safe_remove "docs/technical/API_DOCUMENTATION.md" "redundant API documentation"

# Remove deployment progress files
safe_remove "docs/deployment" "deployment progress directory"

echo ""
echo "🧹 Cleaning up temporary and cache files..."

# Clean node_modules and package locks (will be regenerated)
safe_remove "frontend/node_modules" "frontend node_modules"
safe_remove "frontend/package-lock.json" "frontend package lock"

# Clean Python cache files
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
find . -type f -name "*.pyd" -delete 2>/dev/null || true

# Clean logs directory
clean_directory "logs" "logs directory"

# Clean data directory
clean_directory "data/uploads" "uploads directory"
clean_directory "data/backups" "backups directory"

echo ""
echo "📦 Organizing production structure..."

# Create production directories if they don't exist
mkdir -p deployment/production
mkdir -p deployment/staging
mkdir -p deployment/development

# Move Docker Compose files to appropriate locations
if [ -f "docker-compose.yml" ]; then
    mv docker-compose.yml deployment/development/
    print_status "Moved development Docker Compose to deployment/development/"
fi

# Create production environment template
cat > deployment/production/.env.template << 'EOF'
# SkillForge AI Production Environment Configuration

# Application
ENVIRONMENT=production
DEBUG=false
SECRET_KEY=your-super-secret-key-here

# Database
POSTGRES_DB=skillforge_prod
POSTGRES_USER=skillforge
POSTGRES_PASSWORD=your-secure-password
DATABASE_URL=postgresql://skillforge:your-secure-password@postgres:5432/skillforge_prod

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# External APIs
OPENAI_API_KEY=your-openai-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
PINECONE_API_KEY=your-pinecone-api-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
GRAFANA_ADMIN_PASSWORD=your-grafana-password

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-email-password

# AWS (if using AWS services)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-west-2
AWS_S3_BUCKET=skillforge-ai-prod

# Security
ALLOWED_HOSTS=api.skillforge.ai,skillforge.ai
CORS_ORIGINS=https://skillforge.ai,https://app.skillforge.ai
EOF

print_status "Created production environment template"

# Create production README
cat > deployment/production/README.md << 'EOF'
# SkillForge AI Production Deployment

## Quick Start

1. Copy environment template:
   ```bash
   cp .env.template .env
   ```

2. Edit `.env` with your production values

3. Deploy with Docker Compose:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. Verify deployment:
   ```bash
   curl https://api.skillforge.ai/health
   ```

## Monitoring

- Grafana: http://your-domain:3001
- Prometheus: http://your-domain:9090
- Alertmanager: http://your-domain:9093

## Backup

Run daily backups:
```bash
./scripts/backup-production.sh
```

## Scaling

For high traffic, consider:
- Kubernetes deployment
- Load balancer configuration
- Database read replicas
- CDN setup
EOF

print_status "Created production deployment README"

echo ""
echo "🔧 Creating production scripts..."

# Create production backup script
cat > scripts/backup-production.sh << 'EOF'
#!/bin/bash

# SkillForge AI Production Backup Script

BACKUP_DIR="/backups/skillforge-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "🗄️  Starting production backup..."

# Database backup
docker exec skillforge-postgres pg_dump -U skillforge skillforge_prod > "$BACKUP_DIR/database.sql"

# Redis backup
docker exec skillforge-redis redis-cli BGSAVE
docker cp skillforge-redis:/data/dump.rdb "$BACKUP_DIR/redis.rdb"

# Application data backup
docker cp skillforge-backend:/app/uploads "$BACKUP_DIR/uploads"

# Configuration backup
cp -r deployment/production/.env "$BACKUP_DIR/"

echo "✅ Backup completed: $BACKUP_DIR"
EOF

chmod +x scripts/backup-production.sh
print_status "Created production backup script"

# Create health check script
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# SkillForge AI Health Check Script

echo "🏥 Running SkillForge AI health checks..."

# Check API health
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
if [ "$API_HEALTH" = "200" ]; then
    echo "✅ API: Healthy"
else
    echo "❌ API: Unhealthy (HTTP $API_HEALTH)"
fi

# Check database
DB_HEALTH=$(docker exec skillforge-postgres pg_isready -U skillforge -d skillforge_prod)
if [[ $DB_HEALTH == *"accepting connections"* ]]; then
    echo "✅ Database: Healthy"
else
    echo "❌ Database: Unhealthy"
fi

# Check Redis
REDIS_HEALTH=$(docker exec skillforge-redis redis-cli ping)
if [ "$REDIS_HEALTH" = "PONG" ]; then
    echo "✅ Redis: Healthy"
else
    echo "❌ Redis: Unhealthy"
fi

# Check frontend
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_HEALTH" = "200" ]; then
    echo "✅ Frontend: Healthy"
else
    echo "❌ Frontend: Unhealthy (HTTP $FRONTEND_HEALTH)"
fi

echo "🏥 Health check completed"
EOF

chmod +x scripts/health-check.sh
print_status "Created health check script"

echo ""
echo "📋 Creating production checklist..."

cat > deployment/PRODUCTION_CHECKLIST.md << 'EOF'
# SkillForge AI Production Deployment Checklist

## Pre-Deployment

- [ ] Environment variables configured in `.env`
- [ ] SSL certificates obtained and configured
- [ ] Domain DNS configured
- [ ] Database credentials secured
- [ ] API keys configured
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented

## Security

- [ ] JWT secret keys generated
- [ ] Database passwords changed from defaults
- [ ] CORS origins configured
- [ ] Rate limiting enabled
- [ ] SSL/TLS certificates valid
- [ ] Security headers configured

## Performance

- [ ] Database indexes optimized
- [ ] Redis caching configured
- [ ] CDN configured for static assets
- [ ] Image optimization enabled
- [ ] Gzip compression enabled

## Monitoring

- [ ] Prometheus metrics collecting
- [ ] Grafana dashboards configured
- [ ] Alertmanager rules configured
- [ ] Log aggregation working
- [ ] Error tracking (Sentry) configured

## Testing

- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Security scanning completed
- [ ] Backup/restore tested
- [ ] Disaster recovery tested

## Go-Live

- [ ] DNS cutover completed
- [ ] SSL certificates active
- [ ] Monitoring alerts active
- [ ] Team notified of go-live
- [ ] Rollback plan ready
EOF

print_status "Created production checklist"

echo ""
echo "🔍 Final cleanup and validation..."

# Remove empty directories
find . -type d -empty -delete 2>/dev/null || true

# Create .gitignore for production
cat > .gitignore << 'EOF'
# Environment files
.env
.env.local
.env.production
.env.staging

# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd

# Logs
logs/
*.log

# Database
*.db
*.sqlite

# Cache
.cache/
*.cache

# Build outputs
dist/
build/
.next/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Backup files
cleanup-backup-*/
*.backup

# Temporary files
*.tmp
*.temp

# Coverage reports
coverage/
.coverage
.nyc_output

# Docker
.dockerignore

# Secrets
secrets/
private/
EOF

print_status "Updated .gitignore for production"

echo ""
echo "📊 Cleanup Summary:"
echo "==================="
print_status "Removed development and test files"
print_status "Cleaned up documentation structure"
print_status "Organized production deployment structure"
print_status "Created production scripts and templates"
print_status "Updated .gitignore for production"

echo ""
print_info "Backup created in: $BACKUP_DIR"
print_info "Production files ready in: deployment/production/"

echo ""
echo "🎉 Production cleanup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Review deployment/PRODUCTION_CHECKLIST.md"
echo "2. Configure deployment/production/.env"
echo "3. Deploy using deployment/production/docker-compose.prod.yml"
echo "4. Run scripts/health-check.sh to verify deployment"
EOF

print_status "Production cleanup script completed"
