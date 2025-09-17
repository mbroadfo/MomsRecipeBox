# MongoDB Atlas Management Guide

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Secure Credentials Management](#secure-credentials-management)
   - [Security Guidelines](#security-guidelines)
   - [AWS Secrets Manager Setup](#aws-secrets-manager-setup)
   - [Terraform Integration](#terraform-integration)
   - [Development Environment](#development-environment)
4. [MongoDB Atlas Backup Solution](#mongodb-atlas-backup-solution)
   - [M0 Tier Limitations](#m0-tier-limitations)
   - [Backup Strategy](#backup-strategy)
   - [Consolidated Backup Script](#consolidated-backup-script)
   - [AWS S3 Integration](#aws-s3-integration)
5. [Backup Operations](#backup-operations)
   - [Creating Backups](#creating-backups)
   - [Restoring from Backups](#restoring-from-backups)
   - [Scheduling Automated Backups](#scheduling-automated-backups)
   - [Maintenance Operations](#maintenance-operations)
6. [MongoDB Atlas Migration](#mongodb-atlas-migration)
   - [Updating Connection Strings](#updating-connection-strings)
7. [Emergency Recovery Procedures](#emergency-recovery-procedures)
8. [Troubleshooting](#troubleshooting)
9. [Implementation Details](#implementation-details)

---

## Overview

This guide consolidates information about MongoDB Atlas management for Mom's Recipe Box, covering:

- **Secure credential storage** using AWS Secrets Manager
- **Backup and recovery** procedures for MongoDB Atlas databases
- **Migration** strategies
- **Local and cloud options** for backup storage
- **Terraform integration** for infrastructure as code

This guide replaces multiple individual documents with a single, comprehensive solution.

---

## Prerequisites

- **MongoDB Database Tools**: Download from [MongoDB Download Center](https://www.mongodb.com/try/download/database-tools)
- **AWS CLI**: Required for S3 backup functionality and Secrets Manager
- **PowerShell 5.1+**: For running scripts
- **MongoDB Atlas account**: Configured with appropriate access
- **AWS Account**: For Secrets Manager and optional S3 storage
- **Terraform** (optional): For infrastructure as code

---

## Secure Credentials Management

### Security Guidelines

1. **NEVER commit secrets to Git**
   - All `.tfvars` files are added to `.gitignore`
   - Use provided scripts to generate these files securely

2. **Protect local secrets**
   - Restrict access to your local credentials files
   - Periodically rotate credentials

3. **Use secure credential storage**
   - For production: AWS Secrets Manager / Parameter Store
   - For development: Password manager or secure vault

### AWS Secrets Manager Setup

#### Creating the Secret

##### Option A: Using AWS Console

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

5. Name the secret `moms-recipe-secrets-dev` (for development environment)
6. Add description: "MongoDB Atlas credentials for MomsRecipeBox"
7. Complete the creation wizard with default settings

##### Option B: Using AWS CLI

```bash
aws secretsmanager create-secret \
  --name moms-recipe-secrets-dev \
  --description "MongoDB Atlas credentials for MomsRecipeBox Development" \
  --secret-string "{\"MONGODB_ATLAS_PUBLIC_KEY\":\"your-public-key\",\"MONGODB_ATLAS_PRIVATE_KEY\":\"your-private-key\",\"MONGODB_ATLAS_ORG_ID\":\"your-org-id\",\"MONGODB_ATLAS_PROJECT_ID\":\"your-project-id\",\"MONGODB_ATLAS_PASSWORD\":\"your-secure-db-password\",\"DEVELOPMENT_CIDR_BLOCK\":\"192.168.1.1/32\",\"LAMBDA_CIDR_BLOCK\":\"10.0.0.0/16\",\"MONGODB_URI\":\"
```

#### Retrieving Secrets in Scripts

Use the `Get-MongoAtlasSecrets.ps1` script:

```powershell
.\scripts\Get-MongoAtlasSecrets.ps1 -SecretName "moms-recipe-secrets-dev" -Region "us-west-2"
```

### Terraform Integration

Create a file `infra/secrets.tf` that uses AWS Secrets Manager to retrieve MongoDB credentials:

```terraform
data "aws_secretsmanager_secret" "mongodb_atlas_secret" {
  name = "moms-recipe-secrets-dev" # Or use a variable based on environment
}

data "aws_secretsmanager_secret_version" "current" {
  secret_id = data.aws_secretsmanager_secret.mongodb_atlas_secret.id
}

locals {
  mongodb_credentials = jsondecode(data.aws_secretsmanager_secret_version.current.secret_string)
}

# Access secrets with: local.mongodb_credentials.MONGODB_ATLAS_PUBLIC_KEY
```

### Development Environment

For local development, use the `Create-TfVarsFile.ps1` script:

```powershell
.\scripts\Create-TfVarsFile.ps1
```

This script will:
- Prompt for your MongoDB Atlas credentials
- Detect your current IP address for the access list
- Create the tfvars file with the appropriate format

---

## MongoDB Atlas Backup Solution

MongoDB Atlas provides built-in cloud backup functionality for all clusters. Our solution extends these capabilities with custom scripts and AWS integration.

### M0 Tier Limitations

The free M0 tier has the following limitations:

- No built-in continuous backup
- No on-demand backups
- No point-in-time recovery
- No automated snapshots by MongoDB Atlas

### Backup Strategy

Since we're using the M0 free tier, we've implemented a custom backup solution:

1. **Regular database dumps**: Complete exports of all collections
2. **AWS S3 storage**: Secure, durable cloud storage
3. **Automation**: Scheduled tasks through Windows Task Scheduler
4. **Verification**: Health checks and integrity validation

### Consolidated Backup Script

The `MongoDB-Backup.ps1` script provides a unified interface for all MongoDB backup operations:

- **Local and cloud backup options**
- **Scheduled automated backups**
- **Restoration capabilities**
- **Maintenance utilities**

### AWS S3 Integration

The backup script integrates with AWS S3 for cloud storage:

1. **Backup Process with S3**:
   - Create local backup using mongodump
   - Compress backup directory into a ZIP file
   - Upload ZIP to specified S3 bucket
   - Optionally delete local files after successful upload

2. **S3 Storage Benefits**:
   - **Off-site protection**: Protects against local hardware failures
   - **Lifecycle management**: Automatic transition to cheaper storage tiers
   - **Versioning**: Multiple backup versions for different points in time

3. **S3 Restore Process**:
   - Download ZIP from S3 to local temporary directory
   - Extract archive
   - Run mongorestore using extracted files
   - Clean up temporary files

---

## Backup Operations

### Creating Backups

#### Local Backup

```powershell
.\scripts\MongoDB-Backup.ps1 -Operation backup -BackupPath ".\backups\mongodb_atlas"
```

#### S3 Backup

```powershell
.\scripts\MongoDB-Backup.ps1 -Operation backup -UseS3 -S3Bucket "mrb-mongodb-backups-dev"
```

#### Keep Local Copy When Using S3

```powershell
.\scripts\MongoDB-Backup.ps1 -Operation backup -UseS3 -KeepLocalBackup
```

### Restoring from Backups

#### List Available S3 Backups

```powershell
.\scripts\MongoDB-Backup.ps1 -Operation restore -UseS3 -S3Bucket "mrb-mongodb-backups-dev" -ListBackups
```

#### Restore from S3

```powershell
.\scripts\MongoDB-Backup.ps1 -Operation restore -UseS3 -S3Bucket "mrb-mongodb-backups-dev" -BackupKey "backups/mongodb_backup_2023-10-01.zip"
```

#### Force Restore Without Confirmation

```powershell
.\scripts\MongoDB-Backup.ps1 -Operation restore -UseS3 -S3Bucket "mrb-mongodb-backups-dev" -Force
```

### Scheduling Automated Backups

#### Schedule Daily Backup

```powershell
.\scripts\MongoDB-Backup.ps1 -Operation schedule -TaskName "DailyMongoDBBackup" -RunTime "3:00am" -Frequency "Daily"
```

#### Schedule Weekly Backup

```powershell
.\scripts\MongoDB-Backup.ps1 -Operation schedule -TaskName "WeeklyMongoDBBackup" -RunTime "2:00am" -Frequency "Weekly"
```

### Maintenance Operations

#### Run Database Maintenance

```powershell
.\scripts\MongoDB-Backup.ps1 -Operation maintain
```

#### Run Maintenance Without Creating a Backup

```powershell
.\scripts\MongoDB-Backup.ps1 -Operation maintain -SkipBackup
```

---

## MongoDB Atlas Migration

### Updating Connection Strings

After provisioning your MongoDB Atlas cluster with Terraform, you'll need to update your application's connection strings.

#### 1. Get Your Connection String

Run the following command in the project root:

```powershell
cd .\infra
terraform output mongodb_srv_address
```

#### 2. Update Local Development Environment

Edit your `.env` file in the project root:

```env
# MongoDB Configuration
MONGODB_URI=
MONGODB_DB_NAME=momsrecipebox
```

Replace:

- `<PASSWORD>` with the value of `mongodb_atlas_password` from your `mongodb_atlas.tfvars` file or AWS Secrets Manager
- `<CLUSTER_NAME>` with the output from the terraform command

#### 3. Update AWS Lambda Environment (if applicable)

If you're using AWS Lambda, update the environment variables in your Lambda function:

```terraform
resource "aws_lambda_function" "app_lambda" {
  # ...existing configuration...
  
  environment {
    variables = {
      MONGODB_URI = "
      MONGODB_DB_NAME = "momsrecipebox"
    }
  }
}
```

---

## Emergency Recovery Procedures

### Complete Data Loss Recovery

1. **Stop the application**:

   ```powershell
   docker compose down
   ```

2. **Find the most recent good backup**:

   ```powershell
   .\scripts\MongoDB-Backup.ps1 -Operation restore -ListBackups -S3Bucket "mrb-mongodb-backups-dev"
   ```

3. **Restore from backup**:

   ```powershell
   .\scripts\MongoDB-Backup.ps1 -Operation restore -S3Bucket "mrb-mongodb-backups-dev" -BackupKey "backups/mongodb_backup_2023-10-01.zip" -Force
   ```

4. **Restart the application**:

   ```powershell
   docker compose up -d
   ```

### Database Corruption

1. **Verify database issue**:
   Check MongoDB Atlas admin console or application logs to confirm corruption

2. **Stop any active connections**:
   Pause application services that connect to the database

3. **Restore from most recent backup**:

   ```powershell
   .\scripts\MongoDB-Backup.ps1 -Operation restore -S3Bucket "mrb-mongodb-backups-dev" -Force
   ```

---

## Troubleshooting

### Common Issues

#### MongoDB Tools Not Found

- **Error**: "MongoDB Database Tools are not installed or not in PATH"
- **Solution**: Install MongoDB Database Tools from the MongoDB website and add the bin directory to your PATH
- **Alternative**: Specify full path to mongodump using environment variables

#### AWS Secrets Manager Access Issues

- **Error**: "Could not access AWS Secrets Manager"
- **Solution**: Verify AWS CLI is configured correctly with `aws configure` and ensure proper permissions
- **Check**: AWS credentials file at `~/.aws/credentials`

#### S3 Access Denied

- **Error**: "Access Denied" when uploading to S3
- **Solution**: Verify AWS permissions for the bucket and user
- **Check**: Bucket policy and IAM permissions

#### Backup Verification Failed

- **Error**: "Backup verification failed"
- **Solution**: Check database connectivity and permissions
- **Diagnostic**: Run with additional output: `.\scripts\MongoDB-Backup.ps1 -Operation backup -Verbose`

#### Restore Failed

- **Error**: "Database restore failed with exit code X"
- **Solution**: Check mongorestore log for specific errors
- **Try**: Use the `-Force` parameter to override safety checks

---

## Implementation Details

### Consolidated Script Components

The `MongoDB-Backup.ps1` script combines multiple functionalities:

1. **Connection Management**:
   - Secure retrieval of MongoDB credentials from AWS Secrets Manager
   - Connection string parsing and validation
   - Authentication handling

2. **Backup Functions**:
   - Local backup using mongodump
   - S3 backup with compression
   - Backup validation and metadata recording

3. **Restore Functions**:
   - S3 backup listing and selection
   - Download and extraction
   - Database restoration with mongorestore
   - Safety confirmations and validation

4. **Scheduling Functions**:
   - Windows Task Scheduler integration
   - Daily/weekly schedule options
   - Task configuration and registration

5. **Maintenance Functions**:
   - Database health checks
   - Storage monitoring
   - Consolidated reporting

### Script Architecture

The script is organized into logical function blocks that handle specific operations:

- **Core Functions**: Find-MongoDump, Get-MongoDBConnectionInfo
- **Operation Functions**: Backup-MongoDB, Backup-ToS3, Restore-FromS3, Register-BackupTask, Start-Maintenance
- **Utility Functions**: Show-Banner, Get-S3BackupList
- **Main Execution Block**: Parameter processing and operation dispatch