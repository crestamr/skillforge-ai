# SkillForge AI - Staging Environment
# This file configures the staging environment for SkillForge AI

terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Backend configuration provided via backend-config/staging.hcl
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SkillForge AI"
      Environment = "staging"
      ManagedBy   = "Terraform"
      Owner       = "SkillForge Team"
    }
  }
}

# Call the main infrastructure module
module "skillforge_infrastructure" {
  source = "../../"

  # Environment configuration
  environment = "staging"
  aws_region  = var.aws_region

  # Network configuration
  vpc_cidr = "10.1.0.0/16"

  # EKS configuration
  eks_cluster_version = "1.28"
  eks_node_groups = {
    general = {
      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
      min_size       = 1
      max_size       = 5
      desired_size   = 2
      disk_size      = 50
      labels = {
        role = "general"
      }
      taints = []
    }
    ai_workloads = {
      instance_types = ["c5.large"]
      capacity_type  = "SPOT"
      min_size       = 0
      max_size       = 3
      desired_size   = 1
      disk_size      = 100
      labels = {
        role = "ai-workloads"
      }
      taints = [{
        key    = "ai-workloads"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }

  # Database configuration (smaller instances for staging)
  rds_instance_class              = "db.t3.micro"
  rds_allocated_storage          = 20
  rds_max_allocated_storage      = 50
  rds_backup_retention_period    = 3
  rds_backup_window             = "03:00-04:00"
  rds_maintenance_window        = "sun:04:00-sun:05:00"

  # ElastiCache configuration
  elasticache_node_type         = "cache.t3.micro"
  elasticache_num_cache_nodes   = 1

  # DocumentDB configuration
  documentdb_cluster_size       = 1
  documentdb_instance_class     = "db.t3.medium"

  # Domain configuration (staging subdomain)
  domain_name     = var.domain_name != "" ? "staging.${var.domain_name}" : ""
  certificate_arn = var.certificate_arn

  # Monitoring configuration
  enable_monitoring = true
  enable_logging    = true
  log_retention_days = 7

  # Security configuration
  enable_waf    = false  # Disabled for staging to save costs
  enable_shield = false

  # Backup configuration
  backup_retention_days         = 7
  enable_point_in_time_recovery = false  # Disabled for staging

  # Auto scaling configuration
  enable_cluster_autoscaler           = true
  enable_horizontal_pod_autoscaler    = true
  enable_vertical_pod_autoscaler      = false

  # Cost optimization for staging
  enable_spot_instances     = true
  spot_instance_percentage  = 70
  enable_gpu_nodes         = false

  # Networking
  enable_private_endpoints    = false  # Disabled for staging to save costs
  enable_nat_gateway_per_az   = false

  # Feature flags
  feature_flags = {
    enable_ai_services     = true
    enable_job_matching    = true
    enable_chat_service    = true
    enable_analytics       = false  # Disabled for staging
    enable_notifications   = false  # Disabled for staging
  }

  # Additional tags
  additional_tags = {
    CostCenter = "Development"
    Purpose    = "Staging"
    AutoShutdown = "true"
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
