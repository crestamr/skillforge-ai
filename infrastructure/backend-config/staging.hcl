# Terraform Backend Configuration for Staging Environment
# Usage: terraform init -backend-config=backend-config/staging.hcl

bucket         = "skillforge-ai-terraform-state-staging"
key            = "staging/terraform.tfstate"
region         = "us-west-2"
encrypt        = true
dynamodb_table = "skillforge-ai-terraform-locks-staging"

# Optional: Configure workspace isolation
# workspace_key_prefix = "env"
