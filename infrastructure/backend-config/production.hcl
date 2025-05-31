# Terraform Backend Configuration for Production Environment
# Usage: terraform init -backend-config=backend-config/production.hcl

bucket         = "skillforge-ai-terraform-state-production"
key            = "production/terraform.tfstate"
region         = "us-west-2"
encrypt        = true
dynamodb_table = "skillforge-ai-terraform-locks-production"

# Optional: Configure workspace isolation
# workspace_key_prefix = "env"
