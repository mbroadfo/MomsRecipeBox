##################################################################
# AWS Secrets Manager integration for MongoDB Atlas
##################################################################

# Define the variables needed for MongoDB Atlas
variable "mongodb_atlas_public_key" {
  description = "MongoDB Atlas Public API Key"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_private_key" {
  description = "MongoDB Atlas Private API Key"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_org_id" {
  description = "MongoDB Atlas Organization ID"
  type        = string
}

variable "mongodb_atlas_project_id" {
  description = "MongoDB Atlas Project ID"
  type        = string
}

variable "mongodb_atlas_password" {
  description = "Password for the MongoDB Atlas database user"
  type        = string
  sensitive   = true
}

variable "development_cidr_block" {
  description = "CIDR block for development access"
  type        = string
  default     = "0.0.0.0/0"
}

variable "lambda_cidr_block" {
  description = "CIDR block for Lambda function access"
  type        = string
  default     = ""
}

# Set local variables for use in MongoDB Atlas provider
locals {
  mongodb_atlas_public_key  = var.mongodb_atlas_public_key
  mongodb_atlas_private_key = var.mongodb_atlas_private_key
  mongodb_atlas_org_id      = var.mongodb_atlas_org_id
  mongodb_atlas_project_id  = var.mongodb_atlas_project_id
  mongodb_atlas_password    = var.mongodb_atlas_password
  development_cidr_block    = var.development_cidr_block
  lambda_cidr_block         = var.lambda_cidr_block
  mongodb_uri               = ""  # Will be populated by output after creation
}