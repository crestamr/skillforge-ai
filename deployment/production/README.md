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
