##################################################################
# Terraform Setup for Mom's Recipe Box
##################################################################

provider "aws" {
  region = "us-west-2"
}

# Removed RDS and VPC-related resources
# Retain only relevant resources for MongoDB and S3 setup
