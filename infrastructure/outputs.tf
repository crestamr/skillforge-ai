# SkillForge AI Infrastructure Outputs

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "database_subnets" {
  description = "List of IDs of database subnets"
  value       = module.vpc.database_subnets
}

output "nat_gateway_ips" {
  description = "List of public Elastic IPs created for AWS NAT Gateway"
  value       = module.vpc.nat_public_ips
}

# EKS Outputs
output "eks_cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "eks_cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "eks_cluster_iam_role_name" {
  description = "IAM role name associated with EKS cluster"
  value       = module.eks.cluster_iam_role_name
}

output "eks_cluster_iam_role_arn" {
  description = "IAM role ARN associated with EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "eks_cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "eks_cluster_version" {
  description = "The Kubernetes version for the EKS cluster"
  value       = module.eks.cluster_version
}

output "eks_node_groups" {
  description = "EKS node groups"
  value       = module.eks.eks_managed_node_groups
  sensitive   = true
}

output "eks_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

output "eks_oidc_provider_arn" {
  description = "The ARN of the OIDC Provider if enabled"
  value       = module.eks.oidc_provider_arn
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.db_instance_port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.db_instance_name
}

output "rds_username" {
  description = "RDS instance root username"
  value       = module.rds.db_instance_username
  sensitive   = true
}

output "rds_password_secret_arn" {
  description = "ARN of the secret containing RDS password"
  value       = aws_secretsmanager_secret.rds_password.arn
}

# ElastiCache Outputs
output "elasticache_endpoint" {
  description = "ElastiCache endpoint"
  value       = module.elasticache.primary_endpoint_address
  sensitive   = true
}

output "elasticache_port" {
  description = "ElastiCache port"
  value       = module.elasticache.port
}

# DocumentDB Outputs
output "documentdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = module.documentdb.endpoint
  sensitive   = true
}

output "documentdb_port" {
  description = "DocumentDB cluster port"
  value       = module.documentdb.port
}

output "documentdb_master_username" {
  description = "DocumentDB master username"
  value       = module.documentdb.master_username
  sensitive   = true
}

# S3 Outputs
output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.app_storage.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.app_storage.arn
}

output "s3_bucket_domain_name" {
  description = "Domain name of the S3 bucket"
  value       = aws_s3_bucket.app_storage.bucket_domain_name
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.main.arn
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.main.domain_name
}

# Load Balancer Outputs
output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = module.alb.lb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the load balancer"
  value       = module.alb.lb_zone_id
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = module.alb.lb_arn
}

# Security Group Outputs
output "alb_security_group_id" {
  description = "Security group ID for ALB"
  value       = aws_security_group.alb.id
}

output "eks_nodes_security_group_id" {
  description = "Security group ID for EKS nodes"
  value       = aws_security_group.eks_nodes.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "elasticache_security_group_id" {
  description = "Security group ID for ElastiCache"
  value       = aws_security_group.elasticache.id
}

# KMS Outputs
output "kms_key_id" {
  description = "KMS key ID"
  value       = aws_kms_key.main.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN"
  value       = aws_kms_key.main.arn
}

output "kms_alias_name" {
  description = "KMS key alias name"
  value       = aws_kms_alias.main.name
}

# IAM Outputs
output "eks_worker_iam_role_arn" {
  description = "IAM role ARN for EKS worker nodes"
  value       = module.eks.eks_managed_node_groups_iam_role_arn
}

# Monitoring Outputs
output "cloudwatch_log_group_name" {
  description = "CloudWatch log group name"
  value       = "/aws/eks/${local.name_prefix}/cluster"
}

# Application Configuration Outputs
output "application_config" {
  description = "Application configuration for deployment"
  value = {
    environment = var.environment
    region      = var.aws_region
    
    database = {
      host     = module.rds.db_instance_endpoint
      port     = module.rds.db_instance_port
      name     = module.rds.db_instance_name
      username = module.rds.db_instance_username
    }
    
    redis = {
      host = module.elasticache.primary_endpoint_address
      port = module.elasticache.port
    }
    
    mongodb = {
      host = module.documentdb.endpoint
      port = module.documentdb.port
    }
    
    storage = {
      bucket_name = aws_s3_bucket.app_storage.id
      cdn_domain  = aws_cloudfront_distribution.main.domain_name
    }
    
    cluster = {
      name     = module.eks.cluster_id
      endpoint = module.eks.cluster_endpoint
    }
  }
  sensitive = true
}

# Kubernetes Configuration
output "kubeconfig" {
  description = "kubectl config as generated by the module"
  value = {
    cluster_name                     = module.eks.cluster_id
    endpoint                        = module.eks.cluster_endpoint
    certificate_authority_data      = module.eks.cluster_certificate_authority_data
    region                         = var.aws_region
  }
  sensitive = true
}

# Cost Optimization Outputs
output "cost_optimization_info" {
  description = "Information for cost optimization"
  value = {
    spot_instances_enabled = var.enable_spot_instances
    nat_gateways_count    = length(module.vpc.natgw_ids)
    rds_instance_class    = var.rds_instance_class
    elasticache_node_type = var.elasticache_node_type
  }
}

# Security Outputs
output "security_info" {
  description = "Security configuration information"
  value = {
    vpc_flow_logs_enabled = true
    encryption_at_rest    = true
    kms_key_rotation     = true
    secrets_manager_arn  = aws_secretsmanager_secret.rds_password.arn
  }
}
