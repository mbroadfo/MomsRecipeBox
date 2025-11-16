# Variables for Mom's Recipe Box Terraform Setup

variable "public_subnet_ids" {
  description = "Public subnets used by the bastion host"
  type        = list(string)
  default     = [
    "subnet-022be9ea4ac9e10eb",
    "subnet-032e887c9ef595bd6"
  ]
}

variable "enable_app_api" {
  description = "Enable the app API resources"
  type        = bool
  default     = false
}

# ==============================================
# Auth0 Configuration Variables
# ==============================================

variable "auth0_domain" {
  description = "Auth0 domain for authentication"
  type        = string
  default     = "your-domain.auth0.com"
  sensitive   = true
}

variable "auth0_client_id" {
  description = "Auth0 client ID"
  type        = string
  default     = "your-client-id"
  sensitive   = true
}

variable "auth0_client_secret" {
  description = "Auth0 client secret"
  type        = string
  default     = "your-client-secret"
  sensitive   = true
}

variable "auth0_audience" {
  description = "Auth0 API audience"
  type        = string
  default     = "your-api-audience"
  sensitive   = true
}

variable "auth0_m2m_client_id" {
  description = "Auth0 machine-to-machine client ID"
  type        = string
  default     = "your-m2m-client-id"
  sensitive   = true
}

# ==============================================
# AI Provider API Key Variables
# ==============================================

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  default     = "your-openai-key"
  sensitive   = true
}

variable "groq_api_key" {
  description = "Groq API key"
  type        = string
  default     = "your-groq-key"
  sensitive   = true
}

variable "google_api_key" {
  description = "Google AI API key"
  type        = string
  default     = "your-google-key"
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  default     = "your-anthropic-key"
  sensitive   = true
}

variable "deepseek_api_key" {
  description = "DeepSeek API key"
  type        = string
  default     = "your-deepseek-key"
  sensitive   = true
}

# ==============================================
# S3 Bucket Variables
# ==============================================

variable "recipe_images_bucket" {
  description = "S3 bucket name for recipe images"
  type        = string
  default     = "mrb-recipe-images-dev"
}

variable "mongodb_backups_bucket" {
  description = "S3 bucket name for MongoDB backups"
  type        = string
  default     = "mrb-mongodb-backups-dev"
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
  default     = "dev"
}

variable "ui_hosting_bucket" {
  description = "S3 bucket name for UI static hosting"
  type        = string
  default     = "mrb-ui-hosting-dev"
}

# aws_secret_name variable removed - migrated to Parameter Store (cost optimization)
# See SSM_SECRETS_PARAMETER_NAME in app_api.tf

