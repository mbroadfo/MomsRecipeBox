# Setting up MongoDB Atlas Secrets in AWS Secrets Manager

This guide shows how to store MongoDB Atlas credentials in AWS Secrets Manager and access them from Terraform and Docker environments.

## 1. Create the Secret in AWS Secrets Manager

### Option A: Using AWS Console

1. Open the AWS Console and navigate to Secrets Manager
2. Click "Store a new secret"
3. Select "Other type of secret"
4. Add the following key-value pairs:

| Key                        | Value                        | Description                                   |
|----------------------------|------------------------------|-----------------------------------------------|
| `MONGODB_ATLAS_PUBLIC_KEY` | `your-public-key`            | Atlas API Public Key                          |
| `MONGODB_ATLAS_PRIVATE_KEY`| `your-private-key`           | Atlas API Private Key                         |
| `MONGODB_ATLAS_ORG_ID`     | `your-org-id`                | Atlas Organization ID                         |
| `MONGODB_ATLAS_PROJECT_ID` | `your-project-id`            | Atlas Project ID                              |
| `MONGODB_ATLAS_PASSWORD`   | `your-secure-db-password`    | Password for Atlas database user              |
| `DEVELOPMENT_CIDR_BLOCK`   | `192.168.1.1/32`             | Your development IP address with CIDR notation|
| `LAMBDA_CIDR_BLOCK`        | `10.0.0.0/16` or empty string| CIDR block for AWS Lambda (if used)           |
| `MONGODB_URI`              | `mongodb+srv://...`          | Full MongoDB connection string                |

1. Name the secret `moms-recipe-secrets-dev` (for development environment)
2. Add description: "MongoDB Atlas credentials for MomsRecipeBox"
3. Complete the creation wizard with default settings

### Option B: Using AWS CLI

```bash
aws secretsmanager create-secret \
  --name moms-recipe-secrets-dev \
  --description "MongoDB Atlas credentials for MomsRecipeBox Development" \
  --secret-string "{\"MONGODB_ATLAS_PUBLIC_KEY\":\"your-public-key\",\"MONGODB_ATLAS_PRIVATE_KEY\":\"your-private-key\",\"MONGODB_ATLAS_ORG_ID\":\"your-org-id\",\"MONGODB_ATLAS_PROJECT_ID\":\"your-project-id\",\"MONGODB_ATLAS_PASSWORD\":\"your-secure-db-password\",\"DEVELOPMENT_CIDR_BLOCK\":\"192.168.1.1/32\",\"LAMBDA_CIDR_BLOCK\":\"10.0.0.0/16\",\"MONGODB_URI\":\"
```

## 2. Update Terraform to Use AWS Secrets Manager

Create a new file `c:\Users\Mike\Documents\Code\MomsRecipeBox\infra\secrets.tf`:

```terraform
##################################################################
# AWS Secrets Manager integration for MongoDB Atlas
##################################################################

# Access the MongoDB Atlas credentials from AWS Secrets Manager
data "aws_secretsmanager_secret" "mongodb_secrets" {
  name = "moms-recipe-secrets-dev"
}

data "aws_secretsmanager_secret_version" "mongodb_secrets_current" {
  secret_id = data.aws_secretsmanager_secret.mongodb_secrets.id
}

locals {
  # Parse the secret JSON into a map
  secret_map = jsondecode(data.aws_secretsmanager_secret_version.mongodb_secrets_current.secret_string)
  
  # Set local variables for use in MongoDB Atlas provider
  mongodb_atlas_public_key  = local.secret_map["MONGODB_ATLAS_PUBLIC_KEY"]
  mongodb_atlas_private_key = local.secret_map["MONGODB_ATLAS_PRIVATE_KEY"]
  mongodb_atlas_org_id      = local.secret_map["MONGODB_ATLAS_ORG_ID"]
  mongodb_atlas_project_id  = local.secret_map["MONGODB_ATLAS_PROJECT_ID"]
  mongodb_atlas_password    = local.secret_map["MONGODB_ATLAS_PASSWORD"]
  
  # Network access variables
  development_cidr_block    = local.secret_map["DEVELOPMENT_CIDR_BLOCK"]
  lambda_cidr_block         = local.secret_map["LAMBDA_CIDR_BLOCK"]
  
  # You can use the full MongoDB URI directly if needed
  mongodb_uri              = local.secret_map["MONGODB_URI"]
}
```

## 3. Update MongoDB Atlas Terraform Configuration

Update the MongoDB Atlas configuration in `mongodb_atlas.tf` to use the values from AWS Secrets Manager:

```terraform
# Configure the MongoDB Atlas Provider
provider "mongodbatlas" {
  public_key  = local.mongodb_atlas_public_key
  private_key = local.mongodb_atlas_private_key
}

# Create an M0 (FREE) Cluster
resource "mongodbatlas_cluster" "momsrecipebox_cluster" {
  project_id = local.mongodb_atlas_project_id
  # ... other configuration ...
}

# Create a Database User
resource "mongodbatlas_database_user" "momsrecipebox_user" {
  username           = "mrbapp"
  password           = local.mongodb_atlas_password
  project_id         = local.mongodb_atlas_project_id
  # ... other configuration ...
}

# Create IP Access List entries
resource "mongodbatlas_project_ip_access_list" "app_ip_list" {
  project_id = local.mongodb_atlas_project_id
  cidr_block = local.development_cidr_block
  # ... other configuration ...
}
```

## 4. IAM Permissions for Terraform

Ensure that your AWS credentials used for Terraform have the following IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:moms-recipe-secrets-*"
    }
  ]
}
```

## 5. Accessing Secrets in Docker Environment

For Docker-based applications, you can retrieve and inject the secrets into your environment:

```yaml
# Example docker-compose.yml update
version: '3'
services:
  app:
    build:
      context: ./app
    environment:
      - MONGODB_URI=${MONGODB_URI}
    # ... other configuration
```

With a script to populate environment variables:

```powershell
# get-mongodb-secrets.ps1
$secrets = aws secretsmanager get-secret-value --secret-id moms-recipe-secrets-dev | ConvertFrom-Json
$secretsObj = $secrets.SecretString | ConvertFrom-Json
$env:MONGODB_URI = $secretsObj.MONGODB_URI
```

Then run:

```powershell
. ./get-mongodb-secrets.ps1
docker-compose up
```

## 6. Rotating Secrets

Best practice is to rotate your MongoDB Atlas credentials regularly:

1. Generate new API keys in MongoDB Atlas
2. Update the secret in AWS Secrets Manager
3. Terraform will automatically use the new credentials on the next run
