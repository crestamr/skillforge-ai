# SkillForge AI - Production Environment Configuration

# AWS Configuration
aws_region = "us-west-2"

# Domain Configuration
# domain_name = "skillforge.ai"  # Set your production domain
# certificate_arn = "arn:aws:acm:us-west-2:123456789012:certificate/12345678-1234-1234-1234-123456789012"  # Set your certificate ARN

# Security Configuration
enable_shield_advanced = false  # Set to true for enterprise DDoS protection (additional cost)

# AI/ML Configuration
enable_gpu_nodes = false  # Set to true if you need GPU instances for advanced AI workloads

# Note: The production environment includes:
# - Larger instance sizes for performance
# - Multi-AZ deployments for high availability
# - Extended backup retention periods
# - All security features enabled (WAF, encryption, etc.)
# - Comprehensive monitoring and logging
# - Auto-scaling enabled for all components
