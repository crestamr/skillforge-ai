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
