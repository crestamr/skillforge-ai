# SkillForge AI Infrastructure Variables

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "eks_node_groups" {
  description = "EKS node group configurations"
  type = map(object({
    instance_types = list(string)
    capacity_type  = string
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
    labels         = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  default = {
    general = {
      instance_types = ["t3.medium", "t3.large"]
      capacity_type  = "ON_DEMAND"
      min_size       = 1
      max_size       = 10
      desired_size   = 3
      disk_size      = 50
      labels = {
        role = "general"
      }
      taints = []
    }
    ai_workloads = {
      instance_types = ["c5.xlarge", "c5.2xlarge"]
      capacity_type  = "SPOT"
      min_size       = 0
      max_size       = 5
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
}

# RDS Configuration
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "RDS maximum allocated storage in GB"
  type        = number
  default     = 100
}

variable "rds_username" {
  description = "RDS master username"
  type        = string
  default     = "skillforge"
}

variable "rds_backup_retention_period" {
  description = "RDS backup retention period in days"
  type        = number
  default     = 7
}

variable "rds_backup_window" {
  description = "RDS backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "rds_maintenance_window" {
  description = "RDS maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

# ElastiCache Configuration
variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "elasticache_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

variable "elasticache_parameter_group_name" {
  description = "ElastiCache parameter group name"
  type        = string
  default     = "default.redis7"
}

variable "elasticache_port" {
  description = "ElastiCache port"
  type        = number
  default     = 6379
}

# DocumentDB Configuration
variable "documentdb_cluster_size" {
  description = "Number of instances in DocumentDB cluster"
  type        = number
  default     = 1
}

variable "documentdb_instance_class" {
  description = "DocumentDB instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "documentdb_master_username" {
  description = "DocumentDB master username"
  type        = string
  default     = "skillforge"
}

# Application Configuration
variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  type        = string
  default     = ""
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable monitoring stack (Prometheus, Grafana)"
  type        = bool
  default     = true
}

variable "enable_logging" {
  description = "Enable centralized logging (ELK stack)"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# Security Configuration
variable "enable_waf" {
  description = "Enable AWS WAF"
  type        = bool
  default     = true
}

variable "enable_shield" {
  description = "Enable AWS Shield Advanced"
  type        = bool
  default     = false
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access the application"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for databases"
  type        = bool
  default     = true
}

# Auto Scaling Configuration
variable "enable_cluster_autoscaler" {
  description = "Enable cluster autoscaler"
  type        = bool
  default     = true
}

variable "enable_horizontal_pod_autoscaler" {
  description = "Enable horizontal pod autoscaler"
  type        = bool
  default     = true
}

variable "enable_vertical_pod_autoscaler" {
  description = "Enable vertical pod autoscaler"
  type        = bool
  default     = false
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable spot instances for cost optimization"
  type        = bool
  default     = true
}

variable "spot_instance_percentage" {
  description = "Percentage of spot instances in node groups"
  type        = number
  default     = 50
  validation {
    condition     = var.spot_instance_percentage >= 0 && var.spot_instance_percentage <= 100
    error_message = "Spot instance percentage must be between 0 and 100."
  }
}

# AI/ML Configuration
variable "enable_gpu_nodes" {
  description = "Enable GPU nodes for AI/ML workloads"
  type        = bool
  default     = false
}

variable "gpu_node_instance_types" {
  description = "Instance types for GPU nodes"
  type        = list(string)
  default     = ["p3.2xlarge", "p3.8xlarge"]
}

# Networking Configuration
variable "enable_private_endpoints" {
  description = "Enable VPC endpoints for AWS services"
  type        = bool
  default     = true
}

variable "enable_nat_gateway_per_az" {
  description = "Enable NAT gateway per availability zone"
  type        = bool
  default     = false
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# Feature Flags
variable "feature_flags" {
  description = "Feature flags for enabling/disabling components"
  type = object({
    enable_ai_services     = bool
    enable_job_matching    = bool
    enable_chat_service    = bool
    enable_analytics       = bool
    enable_notifications   = bool
  })
  default = {
    enable_ai_services     = true
    enable_job_matching    = true
    enable_chat_service    = true
    enable_analytics       = true
    enable_notifications   = true
  }
}
