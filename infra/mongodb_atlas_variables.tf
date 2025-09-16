# MongoDB Atlas Variables
# NOTE: All MongoDB Atlas variables are now stored in AWS Secrets Manager
# and accessed via the secrets.tf file. This file is kept for reference only.

# For historical reference, these were the variables previously defined here:
# - mongodb_atlas_public_key: MongoDB Atlas API Public Key
# - mongodb_atlas_private_key: MongoDB Atlas API Private Key
# - mongodb_atlas_org_id: MongoDB Atlas Organization ID
# - mongodb_atlas_project_id: MongoDB Atlas Project ID (already created)
# - mongodb_atlas_password: Password for the MongoDB Atlas database user
# - development_cidr_block: CIDR block for development access (your IP address with /32)
# - lambda_cidr_block: CIDR block for AWS Lambda access (if using Lambda)

# To manage these values, use the scripts:
# - scripts/Get-MongoAtlasSecrets.ps1: Retrieves secrets from AWS Secrets Manager
# - scripts/Set-MongoAtlasSecret.ps1: Creates or updates secrets in AWS Secrets Manager