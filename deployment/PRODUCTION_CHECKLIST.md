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
