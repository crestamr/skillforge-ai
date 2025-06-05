# 🚀 SkillForge AI - Production Deployment Guide

## 🎯 **Quick Production Deployment**

### **Prerequisites**
- Docker and Docker Compose installed
- Domain name configured (optional)
- SSL certificates (for HTTPS)
- Minimum 4GB RAM, 2 CPU cores

### **Step 1: Environment Configuration**
```bash
# Copy environment template
cp deployment/production/.env.template deployment/production/.env

# Edit with your production values
nano deployment/production/.env
```

### **Step 2: Configure Required Variables**
```bash
# Essential variables to configure:
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key
POSTGRES_PASSWORD=your-secure-database-password
GRAFANA_ADMIN_PASSWORD=your-grafana-password

# API Keys (get from respective providers)
OPENAI_API_KEY=sk-your-openai-key
HUGGINGFACE_API_KEY=hf_your-huggingface-key
PINECONE_API_KEY=your-pinecone-key

# Optional: Monitoring
SENTRY_DSN=your-sentry-dsn-for-error-tracking
```

### **Step 3: Deploy Services**
```bash
# Deploy all services
docker-compose -f deployment/docker-compose.prod.yml up -d

# Check deployment status
docker-compose -f deployment/docker-compose.prod.yml ps
```

### **Step 4: Verify Deployment**
```bash
# Run health checks
./scripts/health-check.sh

# Check individual services
curl http://localhost:8000/health    # Backend API
curl http://localhost:3000           # Frontend
curl http://localhost:9090           # Prometheus
curl http://localhost:3001           # Grafana
```

## 🔧 **Advanced Configuration**

### **SSL/HTTPS Setup**
1. **Obtain SSL certificates** (Let's Encrypt recommended)
2. **Configure Nginx** with SSL termination
3. **Update environment variables** with HTTPS URLs

### **Domain Configuration**
```bash
# Update environment variables
ALLOWED_HOSTS=api.yourdomain.com,yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### **Database Scaling**
```bash
# For high traffic, consider:
# - Read replicas
# - Connection pooling
# - Database optimization
```

## 📊 **Monitoring Setup**

### **Access Monitoring Dashboards**
- **Grafana**: http://localhost:3001 (admin/your-grafana-password)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

### **Configure Alerts**
1. **Edit alert rules**: `monitoring/prometheus/alert_rules.yml`
2. **Configure notifications**: `monitoring/alertmanager/alertmanager.yml`
3. **Restart services**: `docker-compose restart prometheus alertmanager`

## 🔒 **Security Checklist**

### **Essential Security Steps**
- [ ] Change all default passwords
- [ ] Configure firewall rules
- [ ] Enable SSL/TLS encryption
- [ ] Set up regular backups
- [ ] Configure monitoring alerts
- [ ] Review access logs regularly

### **Production Security**
```bash
# Generate secure secrets
openssl rand -hex 32  # For SECRET_KEY
openssl rand -hex 32  # For JWT_SECRET_KEY

# Set proper file permissions
chmod 600 deployment/production/.env
chmod +x scripts/*.sh
```

## 💾 **Backup and Recovery**

### **Automated Backups**
```bash
# Run backup script
./scripts/backup-production.sh

# Schedule daily backups (crontab)
0 2 * * * /path/to/skillforge-ai/scripts/backup-production.sh
```

### **Manual Backup**
```bash
# Database backup
docker exec skillforge-postgres pg_dump -U skillforge skillforge_prod > backup.sql

# Redis backup
docker exec skillforge-redis redis-cli BGSAVE
docker cp skillforge-redis:/data/dump.rdb ./redis-backup.rdb

# Application data
docker cp skillforge-backend:/app/uploads ./uploads-backup
```

### **Restore Process**
```bash
# Restore database
docker exec -i skillforge-postgres psql -U skillforge skillforge_prod < backup.sql

# Restore Redis
docker cp ./redis-backup.rdb skillforge-redis:/data/dump.rdb
docker restart skillforge-redis

# Restore uploads
docker cp ./uploads-backup skillforge-backend:/app/uploads
```

## 📈 **Scaling and Performance**

### **Horizontal Scaling**
```bash
# Scale backend services
docker-compose -f deployment/docker-compose.prod.yml up -d --scale backend=3

# Scale AI services
docker-compose -f deployment/docker-compose.prod.yml up -d --scale ai-services=2

# Scale Celery workers
docker-compose -f deployment/docker-compose.prod.yml up -d --scale celery-worker=4
```

### **Performance Optimization**
- **Database**: Add indexes, optimize queries
- **Caching**: Configure Redis with appropriate TTL
- **CDN**: Use CloudFlare or AWS CloudFront
- **Load Balancer**: Configure Nginx upstream servers

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Service Won't Start**
```bash
# Check logs
docker-compose -f deployment/docker-compose.prod.yml logs [service-name]

# Check resource usage
docker stats

# Restart specific service
docker-compose -f deployment/docker-compose.prod.yml restart [service-name]
```

#### **Database Connection Issues**
```bash
# Check database status
docker exec skillforge-postgres pg_isready -U skillforge

# Check connection from backend
docker exec skillforge-backend python -c "from app.core.database import get_database; print('DB OK')"
```

#### **High Memory Usage**
```bash
# Check memory usage
docker stats --no-stream

# Restart services if needed
docker-compose -f deployment/docker-compose.prod.yml restart
```

### **Performance Issues**
```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/health

# Monitor database queries
docker exec skillforge-postgres psql -U skillforge -d skillforge_prod -c "SELECT * FROM pg_stat_activity;"

# Check Redis performance
docker exec skillforge-redis redis-cli info stats
```

## 🔄 **Updates and Maintenance**

### **Application Updates**
```bash
# Pull latest images
docker-compose -f deployment/docker-compose.prod.yml pull

# Restart with new images
docker-compose -f deployment/docker-compose.prod.yml up -d

# Clean old images
docker image prune -f
```

### **Database Migrations**
```bash
# Run migrations
docker exec skillforge-backend alembic upgrade head

# Check migration status
docker exec skillforge-backend alembic current
```

### **Regular Maintenance**
```bash
# Weekly maintenance script
#!/bin/bash
./scripts/backup-production.sh
docker system prune -f
docker volume prune -f
./scripts/health-check.sh
```

## 📞 **Support and Monitoring**

### **Health Monitoring**
- Set up automated health checks every 5 minutes
- Configure alerts for service failures
- Monitor resource usage trends

### **Log Management**
```bash
# View application logs
docker-compose -f deployment/docker-compose.prod.yml logs -f --tail=100

# Rotate logs to prevent disk space issues
docker run --rm -v /var/lib/docker/containers:/var/lib/docker/containers:ro alpine find /var/lib/docker/containers -name "*.log" -exec truncate -s 0 {} \;
```

## 🎉 **Production Ready!**

Your SkillForge AI platform is now production-ready with:

✅ **Scalable architecture** supporting enterprise workloads  
✅ **Comprehensive monitoring** and alerting  
✅ **Automated backups** and disaster recovery  
✅ **Security hardening** and compliance features  
✅ **Performance optimization** for high traffic  

For additional support, refer to:
- **Technical Documentation**: `docs/TECHNICAL_DOCUMENTATION.md`
- **API Documentation**: `docs/api/API_DOCUMENTATION.md`
- **Production Checklist**: `deployment/PRODUCTION_CHECKLIST.md`
