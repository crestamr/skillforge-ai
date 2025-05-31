# SkillForge AI Infrastructure - Main Configuration
# Terraform configuration for AWS-based infrastructure

terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    # Backend configuration will be provided via backend config files
    # terraform init -backend-config=backend-config/staging.hcl
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SkillForge AI"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "SkillForge Team"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  name_prefix = "skillforge-ai-${var.environment}"
  
  common_tags = {
    Project     = "SkillForge AI"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  # Network configuration
  vpc_cidr = var.vpc_cidr
  azs      = slice(data.aws_availability_zones.available.names, 0, 3)
  
  private_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 1),
    cidrsubnet(local.vpc_cidr, 8, 2),
    cidrsubnet(local.vpc_cidr, 8, 3),
  ]
  
  public_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 101),
    cidrsubnet(local.vpc_cidr, 8, 102),
    cidrsubnet(local.vpc_cidr, 8, 103),
  ]
  
  database_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 201),
    cidrsubnet(local.vpc_cidr, 8, 202),
    cidrsubnet(local.vpc_cidr, 8, 203),
  ]
}

# VPC Module
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.name_prefix}-vpc"
  cidr = local.vpc_cidr

  azs              = local.azs
  private_subnets  = local.private_subnets
  public_subnets   = local.public_subnets
  database_subnets = local.database_subnets

  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Database subnet group
  create_database_subnet_group = true
  database_subnet_group_name   = "${local.name_prefix}-db-subnet-group"

  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true

  tags = local.common_tags
}

# Security Groups
resource "aws_security_group" "alb" {
  name_prefix = "${local.name_prefix}-alb-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for Application Load Balancer"

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "eks_cluster" {
  name_prefix = "${local.name_prefix}-eks-cluster-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for EKS cluster"

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [local.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-eks-cluster-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "eks_nodes" {
  name_prefix = "${local.name_prefix}-eks-nodes-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for EKS worker nodes"

  ingress {
    description = "Node to node communication"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  ingress {
    description     = "Cluster to node communication"
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  ingress {
    description = "ALB to nodes"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-eks-nodes-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "${local.name_prefix}-rds-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for RDS database"

  ingress {
    description     = "PostgreSQL from EKS nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-rds-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "elasticache" {
  name_prefix = "${local.name_prefix}-elasticache-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for ElastiCache Redis"

  ingress {
    description     = "Redis from EKS nodes"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-elasticache-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Random password for RDS
resource "random_password" "rds_password" {
  length  = 32
  special = true
}

# Store RDS password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "rds_password" {
  name                    = "${local.name_prefix}-rds-password"
  description             = "RDS password for SkillForge AI"
  recovery_window_in_days = 7

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id = aws_secretsmanager_secret.rds_password.id
  secret_string = jsonencode({
    username = var.rds_username
    password = random_password.rds_password.result
  })
}

# KMS Key for encryption
resource "aws_kms_key" "main" {
  description             = "KMS key for SkillForge AI encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-kms-key"
  })
}

resource "aws_kms_alias" "main" {
  name          = "alias/${local.name_prefix}-key"
  target_key_id = aws_kms_key.main.key_id
}

# S3 Buckets
resource "aws_s3_bucket" "app_storage" {
  bucket = "${local.name_prefix}-app-storage"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-storage"
  })
}

resource "aws_s3_bucket_versioning" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.main.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "app_storage" {
  bucket = aws_s3_bucket.app_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Distribution for static assets
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_s3_bucket.app_storage.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.app_storage.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.app_storage.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cloudfront"
  })
}

resource "aws_cloudfront_origin_access_identity" "main" {
  comment = "OAI for ${local.name_prefix}"
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${local.name_prefix}-cluster"
  cluster_version = var.eks_cluster_version

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true

  # Encryption
  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.main.arn
    resources        = ["secrets"]
  }

  # Logging
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  # Security groups
  cluster_security_group_additional_rules = {
    ingress_nodes_443 = {
      description                = "Node groups to cluster API"
      protocol                   = "tcp"
      from_port                  = 443
      to_port                    = 443
      type                       = "ingress"
      source_node_security_group = true
    }
  }

  node_security_group_additional_rules = {
    ingress_self_all = {
      description = "Node to node all ports/protocols"
      protocol    = "-1"
      from_port   = 0
      to_port     = 0
      type        = "ingress"
      self        = true
    }

    ingress_cluster_443 = {
      description                   = "Cluster API to node groups"
      protocol                      = "tcp"
      from_port                     = 443
      to_port                       = 443
      type                          = "ingress"
      source_cluster_security_group = true
    }

    ingress_cluster_kubelet = {
      description                   = "Cluster API to node kubelets"
      protocol                      = "tcp"
      from_port                     = 10250
      to_port                       = 10250
      type                          = "ingress"
      source_cluster_security_group = true
    }

    egress_all = {
      description      = "Node all egress"
      protocol         = "-1"
      from_port        = 0
      to_port          = 0
      type             = "egress"
      cidr_blocks      = ["0.0.0.0/0"]
      ipv6_cidr_blocks = ["::/0"]
    }
  }

  # EKS Managed Node Groups
  eks_managed_node_groups = {
    for name, config in var.eks_node_groups : name => {
      name           = "${local.name_prefix}-${name}"
      instance_types = config.instance_types
      capacity_type  = config.capacity_type

      min_size     = config.min_size
      max_size     = config.max_size
      desired_size = config.desired_size

      disk_size = config.disk_size
      disk_type = "gp3"

      labels = merge(config.labels, {
        Environment = var.environment
        NodeGroup   = name
      })

      taints = config.taints

      update_config = {
        max_unavailable_percentage = 25
      }

      # Launch template configuration
      create_launch_template = true
      launch_template_name   = "${local.name_prefix}-${name}"

      # User data
      pre_bootstrap_user_data = <<-EOT
        #!/bin/bash
        yum update -y
        yum install -y amazon-cloudwatch-agent

        # Configure CloudWatch agent
        cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
        {
          "metrics": {
            "namespace": "SkillForge/EKS",
            "metrics_collected": {
              "cpu": {
                "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
                "metrics_collection_interval": 60
              },
              "disk": {
                "measurement": ["used_percent"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
              },
              "mem": {
                "measurement": ["mem_used_percent"],
                "metrics_collection_interval": 60
              }
            }
          }
        }
        EOF

        /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
          -a fetch-config -m ec2 -s \
          -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
      EOT

      tags = merge(local.common_tags, {
        Name = "${local.name_prefix}-${name}-node-group"
      })
    }
  }

  # aws-auth configmap
  manage_aws_auth_configmap = true

  aws_auth_roles = [
    {
      rolearn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/SkillForgeAdminRole"
      username = "admin"
      groups   = ["system:masters"]
    },
  ]

  aws_auth_users = [
    {
      userarn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/skillforge-admin"
      username = "skillforge-admin"
      groups   = ["system:masters"]
    },
  ]

  tags = local.common_tags
}

# RDS PostgreSQL Database
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${local.name_prefix}-postgres"

  engine               = "postgres"
  engine_version       = "15.4"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = var.rds_instance_class

  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_max_allocated_storage
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.main.arn

  db_name  = "skillforge"
  username = var.rds_username
  password = random_password.rds_password.result
  port     = 5432

  multi_az               = var.environment == "production" ? true : false
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.rds.id]

  maintenance_window              = var.rds_maintenance_window
  backup_window                  = var.rds_backup_window
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  create_cloudwatch_log_group     = true

  backup_retention_period = var.rds_backup_retention_period
  skip_final_snapshot     = var.environment == "staging" ? true : false
  deletion_protection     = var.environment == "production" ? true : false

  performance_insights_enabled          = var.environment == "production" ? true : false
  performance_insights_retention_period = var.environment == "production" ? 7 : null
  create_monitoring_role                = var.environment == "production" ? true : false
  monitoring_interval                   = var.environment == "production" ? 60 : 0

  db_subnet_group_name   = module.vpc.database_subnet_group_name
  create_db_subnet_group = false

  parameters = [
    {
      name  = "log_checkpoints"
      value = 1
    },
    {
      name  = "log_connections"
      value = 1
    },
    {
      name  = "log_disconnections"
      value = 1
    },
    {
      name  = "log_lock_waits"
      value = 1
    },
    {
      name  = "log_temp_files"
      value = 0
    },
    {
      name  = "shared_preload_libraries"
      value = "pg_stat_statements"
    }
  ]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-postgres"
  })
}

# ElastiCache Redis
module "elasticache" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 1.0"

  cluster_id           = "${local.name_prefix}-redis"
  description          = "Redis cluster for SkillForge AI"

  engine               = "redis"
  node_type            = var.elasticache_node_type
  num_cache_nodes      = var.elasticache_num_cache_nodes
  parameter_group_name = var.elasticache_parameter_group_name
  port                 = var.elasticache_port

  subnet_group_name = "${local.name_prefix}-redis-subnet-group"
  subnet_ids        = module.vpc.private_subnets
  security_group_ids = [aws_security_group.elasticache.id]

  # Backup
  snapshot_retention_limit = var.environment == "production" ? 5 : 1
  snapshot_window         = "03:00-05:00"

  # Maintenance
  maintenance_window = "sun:05:00-sun:09:00"

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  # Logging
  log_delivery_configuration = [
    {
      destination      = aws_cloudwatch_log_group.elasticache.name
      destination_type = "cloudwatch-logs"
      log_format       = "text"
      log_type         = "slow-log"
    }
  ]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis"
  })
}

# Random password for Redis
resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

# CloudWatch log group for ElastiCache
resource "aws_cloudwatch_log_group" "elasticache" {
  name              = "/aws/elasticache/${local.name_prefix}"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.main.arn

  tags = local.common_tags
}

# DocumentDB (MongoDB-compatible)
module "documentdb" {
  source  = "terraform-aws-modules/documentdb/aws"
  version = "~> 1.0"

  cluster_identifier      = "${local.name_prefix}-documentdb"
  engine                 = "docdb"
  master_username        = var.documentdb_master_username
  master_password        = random_password.documentdb_password.result
  backup_retention_period = var.environment == "production" ? 7 : 1
  preferred_backup_window = "07:00-09:00"
  skip_final_snapshot    = var.environment == "staging" ? true : false

  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.documentdb.id]

  cluster_size         = var.documentdb_cluster_size
  instance_class       = var.documentdb_instance_class

  storage_encrypted   = true
  kms_key_id         = aws_kms_key.main.arn

  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-documentdb"
  })
}

# Random password for DocumentDB
resource "random_password" "documentdb_password" {
  length  = 32
  special = true
}

# Security group for DocumentDB
resource "aws_security_group" "documentdb" {
  name_prefix = "${local.name_prefix}-documentdb-"
  vpc_id      = module.vpc.vpc_id
  description = "Security group for DocumentDB cluster"

  ingress {
    description     = "DocumentDB from EKS nodes"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-documentdb-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Application Load Balancer
module "alb" {
  source  = "terraform-aws-modules/alb/aws"
  version = "~> 8.0"

  name = "${local.name_prefix}-alb"

  load_balancer_type = "application"
  vpc_id             = module.vpc.vpc_id
  subnets            = module.vpc.public_subnets
  security_groups    = [aws_security_group.alb.id]

  # Access logs
  access_logs = {
    bucket  = aws_s3_bucket.alb_logs.id
    enabled = true
    prefix  = "alb-logs"
  }

  target_groups = [
    {
      name             = "${local.name_prefix}-frontend"
      backend_protocol = "HTTP"
      backend_port     = 3000
      target_type      = "ip"

      health_check = {
        enabled             = true
        healthy_threshold   = 2
        interval            = 30
        matcher             = "200"
        path                = "/health"
        port                = "traffic-port"
        protocol            = "HTTP"
        timeout             = 5
        unhealthy_threshold = 2
      }
    },
    {
      name             = "${local.name_prefix}-backend"
      backend_protocol = "HTTP"
      backend_port     = 8000
      target_type      = "ip"

      health_check = {
        enabled             = true
        healthy_threshold   = 2
        interval            = 30
        matcher             = "200"
        path                = "/health"
        port                = "traffic-port"
        protocol            = "HTTP"
        timeout             = 5
        unhealthy_threshold = 2
      }
    },
    {
      name             = "${local.name_prefix}-ai-services"
      backend_protocol = "HTTP"
      backend_port     = 8001
      target_type      = "ip"

      health_check = {
        enabled             = true
        healthy_threshold   = 2
        interval            = 30
        matcher             = "200"
        path                = "/health"
        port                = "traffic-port"
        protocol            = "HTTP"
        timeout             = 5
        unhealthy_threshold = 2
      }
    }
  ]

  http_tcp_listeners = [
    {
      port               = 80
      protocol           = "HTTP"
      action_type        = "redirect"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  ]

  https_listeners = var.certificate_arn != "" ? [
    {
      port               = 443
      protocol           = "HTTPS"
      certificate_arn    = var.certificate_arn
      action_type        = "forward"
      target_group_index = 0
    }
  ] : []

  http_tcp_listener_rules = [
    {
      http_tcp_listener_index = 0
      priority               = 100

      actions = [{
        type               = "forward"
        target_group_index = 1
      }]

      conditions = [{
        path_patterns = ["/api/*"]
      }]
    },
    {
      http_tcp_listener_index = 0
      priority               = 200

      actions = [{
        type               = "forward"
        target_group_index = 2
      }]

      conditions = [{
        path_patterns = ["/ai/*"]
      }]
    }
  ]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })
}

# S3 bucket for ALB access logs
resource "aws_s3_bucket" "alb_logs" {
  bucket = "${local.name_prefix}-alb-logs"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb-logs"
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "log_retention"
    status = "Enabled"

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.main.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ALB access logs bucket policy
resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_elb_service_account.main.id}:root"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/alb-logs/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
      },
      {
        Effect = "Allow"
        Principal = {
          Service = "delivery.logs.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/alb-logs/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# Data source for ELB service account
data "aws_elb_service_account" "main" {}

# Route53 hosted zone (if domain is provided)
resource "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0
  name  = var.domain_name

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-zone"
  })
}

# Route53 records
resource "aws_route53_record" "main" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.alb.lb_dns_name
    zone_id                = module.alb.lb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.alb.lb_dns_name
    zone_id                = module.alb.lb_zone_id
    evaluate_target_health = true
  }
}
