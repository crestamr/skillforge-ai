# SkillForge AI - Production Environment
# This file configures the production environment for SkillForge AI

terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Backend configuration provided via backend-config/production.hcl
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SkillForge AI"
      Environment = "production"
      ManagedBy   = "Terraform"
      Owner       = "SkillForge Team"
    }
  }
}

# Call the main infrastructure module
module "skillforge_infrastructure" {
  source = "../../"

  # Environment configuration
  environment = "production"
  aws_region  = var.aws_region

  # Network configuration
  vpc_cidr = "10.0.0.0/16"

  # EKS configuration
  eks_cluster_version = "1.28"
  eks_node_groups = {
    general = {
      instance_types = ["t3.large", "t3.xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 2
      max_size       = 10
      desired_size   = 3
      disk_size      = 100
      labels = {
        role = "general"
      }
      taints = []
    }
    ai_workloads = {
      instance_types = ["c5.xlarge", "c5.2xlarge"]
      capacity_type  = "SPOT"
      min_size       = 1
      max_size       = 8
      desired_size   = 2
      disk_size      = 200
      labels = {
        role = "ai-workloads"
      }
      taints = [{
        key    = "ai-workloads"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
    gpu_workloads = {
      instance_types = ["p3.2xlarge"]
      capacity_type  = "ON_DEMAND"
      min_size       = 0
      max_size       = 2
      desired_size   = 0
      disk_size      = 500
      labels = {
        role = "gpu-workloads"
        "nvidia.com/gpu" = "true"
      }
      taints = [{
        key    = "nvidia.com/gpu"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }

  # Database configuration (production-grade instances)
  rds_instance_class              = "db.r5.large"
  rds_allocated_storage          = 100
  rds_max_allocated_storage      = 1000
  rds_backup_retention_period    = 30
  rds_backup_window             = "03:00-04:00"
  rds_maintenance_window        = "sun:04:00-sun:05:00"

  # ElastiCache configuration
  elasticache_node_type         = "cache.r5.large"
  elasticache_num_cache_nodes   = 3

  # DocumentDB configuration
  documentdb_cluster_size       = 3
  documentdb_instance_class     = "db.r5.large"

  # Domain configuration
  domain_name     = var.domain_name
  certificate_arn = var.certificate_arn

  # Monitoring configuration
  enable_monitoring = true
  enable_logging    = true
  log_retention_days = 90

  # Security configuration
  enable_waf    = true
  enable_shield = var.enable_shield_advanced

  # Backup configuration
  backup_retention_days         = 30
  enable_point_in_time_recovery = true

  # Auto scaling configuration
  enable_cluster_autoscaler           = true
  enable_horizontal_pod_autoscaler    = true
  enable_vertical_pod_autoscaler      = true

  # Cost optimization for production
  enable_spot_instances     = true
  spot_instance_percentage  = 30  # Lower percentage for production stability
  enable_gpu_nodes         = var.enable_gpu_nodes

  # Networking
  enable_private_endpoints    = true
  enable_nat_gateway_per_az   = true  # High availability

  # Feature flags (all enabled for production)
  feature_flags = {
    enable_ai_services     = true
    enable_job_matching    = true
    enable_chat_service    = true
    enable_analytics       = true
    enable_notifications   = true
  }

  # Additional tags
  additional_tags = {
    CostCenter = "Production"
    Purpose    = "Production"
    Backup     = "Required"
    Monitoring = "Critical"
  }
}

# Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.skillforge_infrastructure.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.skillforge_infrastructure.eks_cluster_endpoint
  sensitive   = true
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.skillforge_infrastructure.eks_cluster_id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.skillforge_infrastructure.rds_endpoint
  sensitive   = true
}

output "elasticache_endpoint" {
  description = "ElastiCache endpoint"
  value       = module.skillforge_infrastructure.elasticache_endpoint
  sensitive   = true
}

output "documentdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = module.skillforge_infrastructure.documentdb_endpoint
  sensitive   = true
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.skillforge_infrastructure.alb_dns_name
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = module.skillforge_infrastructure.s3_bucket_name
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.skillforge_infrastructure.cloudfront_domain_name
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = var.domain_name != "" ? module.skillforge_infrastructure.route53_zone_id : null
}

output "application_config" {
  description = "Application configuration for deployment"
  value       = module.skillforge_infrastructure.application_config
  sensitive   = true
}

output "kubeconfig" {
  description = "kubectl config as generated by the module"
  value       = module.skillforge_infrastructure.kubeconfig
  sensitive   = true
}
