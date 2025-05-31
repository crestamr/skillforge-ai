# Infrastructure - SkillForge AI

## Overview
This directory contains all infrastructure-as-code configurations for SkillForge AI, including Docker containers, Kubernetes manifests, Terraform configurations, and deployment scripts for AWS cloud infrastructure.

## Technology Stack
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Kubernetes with Helm charts
- **Infrastructure**: Terraform for AWS resource management
- **CI/CD**: GitHub Actions with automated deployments
- **Monitoring**: Datadog, CloudWatch, and Prometheus
- **Security**: AWS IAM, Security Groups, and WAF
- **Networking**: VPC, Load Balancers, and CloudFront CDN

## Project Structure
```
infrastructure/
├── docker/                # Docker configurations
│   ├── frontend/          # Next.js application container
│   ├── backend/           # FastAPI backend container
│   ├── ai-services/       # AI/ML services container
│   ├── nginx/             # Reverse proxy configuration
│   └── docker-compose.yml # Local development setup
├── kubernetes/            # Kubernetes manifests
│   ├── base/              # Base configurations
│   ├── overlays/          # Environment-specific overlays
│   │   ├── development/   # Development environment
│   │   ├── staging/       # Staging environment
│   │   └── production/    # Production environment
│   └── helm/              # Helm charts
├── terraform/             # Infrastructure as Code
│   ├── modules/           # Reusable Terraform modules
│   │   ├── vpc/           # VPC and networking
│   │   ├── ecs/           # ECS cluster configuration
│   │   ├── rds/           # Database configuration
│   │   ├── s3/            # Storage configuration
│   │   └── monitoring/    # Monitoring setup
│   ├── environments/      # Environment-specific configs
│   │   ├── dev/           # Development environment
│   │   ├── staging/       # Staging environment
│   │   └── prod/          # Production environment
│   └── shared/            # Shared resources
├── scripts/               # Deployment and utility scripts
│   ├── deploy.sh          # Deployment automation
│   ├── backup.sh          # Database backup scripts
│   ├── monitoring.sh      # Monitoring setup
│   └── security.sh       # Security configuration
├── monitoring/            # Monitoring configurations
│   ├── datadog/           # Datadog dashboards and alerts
│   ├── prometheus/        # Prometheus configuration
│   └── grafana/           # Grafana dashboards
└── docs/                  # Infrastructure documentation
```

## Docker Configuration

### Multi-Service Architecture
The application uses a microservices architecture with the following containers:

**Frontend Container (Next.js)**
- Base image: node:18-alpine
- Multi-stage build for optimization
- Static asset optimization
- Health check endpoint

**Backend Container (FastAPI)**
- Base image: python:3.11-slim
- Optimized for production with gunicorn
- Health check and metrics endpoints
- Security hardening

**AI Services Container**
- Base image: python:3.11-slim with CUDA support
- GPU acceleration for model inference
- Model caching and optimization
- Resource monitoring

**Database Containers**
- PostgreSQL 15 with persistent volumes
- MongoDB 6 with replica set configuration
- Redis 7 for caching and sessions

### Local Development Setup
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale specific services
docker-compose up -d --scale backend=3

# Stop all services
docker-compose down
```

## Kubernetes Deployment

### Cluster Architecture
- **Namespace Isolation**: Separate namespaces for each environment
- **Resource Management**: CPU/memory limits and requests
- **Auto-scaling**: Horizontal Pod Autoscaler (HPA) configuration
- **Service Mesh**: Istio for traffic management and security
- **Ingress**: NGINX Ingress Controller with SSL termination

### Key Components
**Deployments**
- Frontend: 3 replicas with rolling updates
- Backend: 5 replicas with auto-scaling
- AI Services: 2 replicas with GPU nodes
- Worker: Celery workers for background tasks

**Services**
- ClusterIP for internal communication
- LoadBalancer for external access
- Headless services for stateful sets

**ConfigMaps & Secrets**
- Environment-specific configuration
- Database credentials and API keys
- SSL certificates and security tokens

**Persistent Volumes**
- Database storage with backup policies
- Model cache storage for AI services
- Log storage for centralized logging

### Deployment Commands
```bash
# Apply base configuration
kubectl apply -k kubernetes/base/

# Deploy to specific environment
kubectl apply -k kubernetes/overlays/production/

# Check deployment status
kubectl get pods -n skillforge-prod

# View logs
kubectl logs -f deployment/backend -n skillforge-prod

# Scale deployment
kubectl scale deployment backend --replicas=10 -n skillforge-prod
```

## AWS Infrastructure (Terraform)

### Architecture Overview
- **Multi-AZ Deployment**: High availability across availability zones
- **Auto Scaling**: ECS services with auto-scaling policies
- **Load Balancing**: Application Load Balancer with health checks
- **Database**: RDS PostgreSQL with read replicas
- **Caching**: ElastiCache Redis cluster
- **Storage**: S3 buckets with lifecycle policies
- **CDN**: CloudFront for global content delivery

### Core Resources

**Networking (VPC Module)**
```hcl
module "vpc" {
  source = "./modules/vpc"
  
  cidr_block           = "10.0.0.0/16"
  availability_zones   = ["us-west-2a", "us-west-2b", "us-west-2c"]
  public_subnets       = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets      = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  database_subnets     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
  
  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
}
```

**ECS Cluster (ECS Module)**
```hcl
module "ecs" {
  source = "./modules/ecs"
  
  cluster_name         = "skillforge-${var.environment}"
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  
  services = {
    frontend = {
      image         = "skillforge/frontend:latest"
      cpu           = 256
      memory        = 512
      desired_count = 3
      port          = 3000
    }
    backend = {
      image         = "skillforge/backend:latest"
      cpu           = 512
      memory        = 1024
      desired_count = 5
      port          = 8000
    }
    ai-services = {
      image         = "skillforge/ai-services:latest"
      cpu           = 1024
      memory        = 2048
      desired_count = 2
      port          = 8001
    }
  }
}
```

**Database (RDS Module)**
```hcl
module "rds" {
  source = "./modules/rds"
  
  identifier             = "skillforge-${var.environment}"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = "db.r6g.large"
  allocated_storage      = 100
  max_allocated_storage  = 1000
  
  db_name  = "skillforge"
  username = "skillforge_user"
  
  vpc_security_group_ids = [module.vpc.database_security_group_id]
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  create_read_replica = true
  read_replica_count  = 2
}
```

### Environment Management
```bash
# Initialize Terraform
cd terraform/environments/prod
terraform init

# Plan deployment
terraform plan -var-file="prod.tfvars"

# Apply changes
terraform apply -var-file="prod.tfvars"

# Destroy resources (use with caution)
terraform destroy -var-file="prod.tfvars"
```

## Monitoring & Observability

### Datadog Integration
- **Application Monitoring**: APM for request tracing
- **Infrastructure Monitoring**: Host and container metrics
- **Log Management**: Centralized log aggregation
- **Custom Dashboards**: Business and technical metrics
- **Alerting**: Proactive monitoring with escalation

### CloudWatch Configuration
- **Metrics**: Custom application metrics
- **Logs**: Centralized logging from all services
- **Alarms**: Threshold-based alerting
- **Dashboards**: Real-time system overview

### Prometheus & Grafana
- **Metrics Collection**: Application and infrastructure metrics
- **Visualization**: Custom Grafana dashboards
- **Alerting**: AlertManager for notification routing
- **Service Discovery**: Automatic target discovery

## Security Configuration

### Network Security
- **VPC**: Isolated network environment
- **Security Groups**: Restrictive firewall rules
- **NACLs**: Network-level access control
- **WAF**: Web application firewall protection

### Access Control
- **IAM Roles**: Least privilege access policies
- **Service Accounts**: Kubernetes service account management
- **Secrets Management**: AWS Secrets Manager integration
- **Certificate Management**: ACM for SSL/TLS certificates

### Compliance
- **Encryption**: Data encryption at rest and in transit
- **Audit Logging**: Comprehensive audit trail
- **Vulnerability Scanning**: Regular security assessments
- **Compliance Monitoring**: SOC 2 and GDPR compliance

## Backup & Disaster Recovery

### Database Backups
- **Automated Backups**: Daily RDS snapshots
- **Point-in-Time Recovery**: 7-day retention period
- **Cross-Region Replication**: Disaster recovery setup
- **Backup Testing**: Regular restore testing

### Application Backups
- **Configuration Backups**: Infrastructure state backups
- **Code Repositories**: Git-based version control
- **Container Images**: Registry backup and replication
- **Monitoring Data**: Metrics and logs backup

### Recovery Procedures
- **RTO/RPO Targets**: 4-hour RTO, 1-hour RPO
- **Failover Procedures**: Automated failover processes
- **Recovery Testing**: Quarterly disaster recovery drills
- **Documentation**: Detailed recovery procedures

## Cost Optimization

### Resource Management
- **Auto Scaling**: Dynamic resource allocation
- **Spot Instances**: Cost-effective compute resources
- **Reserved Instances**: Long-term cost savings
- **Resource Tagging**: Cost allocation and tracking

### Monitoring & Alerts
- **Cost Budgets**: AWS Budget alerts
- **Usage Monitoring**: Resource utilization tracking
- **Optimization Recommendations**: Regular cost reviews
- **Rightsizing**: Instance size optimization

## Deployment Procedures

### CI/CD Pipeline
1. **Code Commit**: Trigger automated pipeline
2. **Testing**: Run comprehensive test suite
3. **Build**: Create optimized container images
4. **Security Scan**: Vulnerability assessment
5. **Deploy to Staging**: Automated staging deployment
6. **Integration Tests**: End-to-end testing
7. **Production Deployment**: Blue-green deployment
8. **Health Checks**: Post-deployment verification

### Rollback Procedures
- **Automated Rollback**: Health check failures
- **Manual Rollback**: Emergency procedures
- **Database Rollback**: Migration rollback scripts
- **Traffic Routing**: Gradual traffic shifting

## Contributing
1. Follow infrastructure as code best practices
2. Test all changes in development environment first
3. Document infrastructure changes and decisions
4. Implement proper security controls
5. Monitor resource usage and costs
6. Maintain disaster recovery procedures
