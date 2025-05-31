# SkillForge AI - Production Environment Variables

variable "aws_region" {
  description = "AWS region for production resources"
  type        = string
  default     = "us-west-2"
}

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

variable "enable_shield_advanced" {
  description = "Enable AWS Shield Advanced for DDoS protection"
  type        = bool
  default     = false
}

variable "enable_gpu_nodes" {
  description = "Enable GPU nodes for advanced AI workloads"
  type        = bool
  default     = false
}
