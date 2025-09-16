##################################################################
# MongoDB Atlas Configuration for Mom's Recipe Box
##################################################################

terraform {
  required_providers {
    mongodbatlas = {
      source = "mongodb/mongodbatlas"
      version = "~> 1.12.0"
    }
  }
}

# Configure the MongoDB Atlas Provider
provider "mongodbatlas" {
  public_key  = local.mongodb_atlas_public_key
  private_key = local.mongodb_atlas_private_key
}

  # Create an M0 (FREE) Cluster
resource "mongodbatlas_cluster" "momsrecipebox_cluster" {
  project_id = local.mongodb_atlas_project_id
  name       = "momsrecipebox-cluster"
  
  # M0 FREE tier configuration
  provider_name               = "TENANT"
  backing_provider_name       = "AWS"
  provider_region_name        = "US_WEST_2"
  provider_instance_size_name = "M0"

  # M0 is a shared tier with fixed settings - these are required
  disk_size_gb         = 0.5    # M0 has 512MB storage
  mongo_db_major_version = "8.0"  # Updated to match what's deployed
  auto_scaling_disk_gb_enabled = false
  
  # Prevent terraform from trying to modify this resource
  lifecycle {
    ignore_changes = [
      mongo_db_major_version,
      disk_size_gb,
      auto_scaling_disk_gb_enabled,
      provider_name,
      provider_instance_size_name,
      provider_region_name,
      backing_provider_name
    ]
  }
}# Create a Database User
resource "mongodbatlas_database_user" "momsrecipebox_user" {
  username           = "mrbapp"
  password           = local.mongodb_atlas_password
  project_id         = local.mongodb_atlas_project_id
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "momsrecipebox"
  }

  roles {
    role_name     = "readWrite"
    database_name = "admin"
  }
}

# Create IP Access List entries
resource "mongodbatlas_project_ip_access_list" "app_ip_list" {
  project_id = local.mongodb_atlas_project_id
  # Allow your current development IP
  # You can use "0.0.0.0/0" for open access, but this is not recommended for production
  cidr_block = local.development_cidr_block
  comment    = "Development access"
}

# Optional: Allow AWS Lambda access if you're using Lambda
resource "mongodbatlas_project_ip_access_list" "lambda_ip_list" {
  count      = local.lambda_cidr_block != "" ? 1 : 0
  project_id = local.mongodb_atlas_project_id
  cidr_block = local.lambda_cidr_block
  comment    = "AWS Lambda access"
}

# Output the connection string
output "mongodb_connection_string" {
  value       = "mongodb+srv://${mongodbatlas_database_user.momsrecipebox_user.username}:${local.mongodb_atlas_password}@${replace(mongodbatlas_cluster.momsrecipebox_cluster.srv_address, "mongodb+srv://", "")}/momsrecipebox?retryWrites=true&w=majority"
  description = "MongoDB Atlas connection string"
  sensitive   = true
}

output "mongodb_srv_address" {
  value       = mongodbatlas_cluster.momsrecipebox_cluster.srv_address
  description = "MongoDB Atlas SRV address (without credentials)"
}