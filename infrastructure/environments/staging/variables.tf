# SkillForge AI - Staging Environment Variables

variable "aws_region" {
  description = "AWS region for staging resources"
  type        = string
  default     = "us-west-2"
}

variable "domain_name" {
  description = "Base domain name for the application (staging will use staging.domain.com)"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS (should cover *.domain.com)"
  type        = string
  default     = ""
}
