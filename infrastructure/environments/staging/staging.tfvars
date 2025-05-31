# SkillForge AI - Staging Environment Configuration

# AWS Configuration
aws_region = "us-west-2"

# Domain Configuration
# domain_name = "skillforge.ai"  # Uncomment and set your domain
# certificate_arn = "arn:aws:acm:us-west-2:123456789012:certificate/12345678-1234-1234-1234-123456789012"  # Uncomment and set your certificate ARN

# Note: The staging environment will automatically use:
# - staging.skillforge.ai as the domain (if domain_name is set)
# - Smaller instance sizes for cost optimization
# - Reduced backup retention periods
# - Spot instances for AI workloads
# - Disabled features like WAF and Shield for cost savings
