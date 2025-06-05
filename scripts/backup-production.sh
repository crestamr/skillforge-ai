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
