# MongoDB Atlas Backup Solution

This directory contains scripts for backing up MongoDB Atlas databases to S3, scheduling automated backups, and performing maintenance tasks.

## Components

### 1. Test-MongoDBBackup.ps1

A script that tests connectivity to MongoDB Atlas and creates a local backup. It retrieves credentials from AWS Secrets Manager.

### 2. Backup-MongoDBToS3.ps1

The main backup script that:

- Creates a MongoDB Atlas backup locally
- Compresses the backup into a ZIP file
- Uploads the compressed backup to S3
- Optionally cleans up local backup files after successful upload

### 3. Register-MongoDBBackupTask.ps1

A utility script to register the backup process as a Windows Scheduled Task. This allows for automated backups at specified intervals.

### 4. Restore-MongoDBFromS3.ps1

A script to restore MongoDB databases from S3 backups. Features include:

- Listing available backups in the S3 bucket
- Downloading and extracting backups
- Restoring databases with proper error handling
- Automatic cleanup of temporary files

### 5. Invoke-MongoDBMaintenance.ps1

A comprehensive maintenance script that:

- Creates backups and uploads them to S3
- Performs maintenance checks
- Reports on storage usage
- Provides detailed operation logs

## Setup Instructions

### Prerequisites

- AWS CLI installed and configured
- AWS Secrets Manager set up with MongoDB Atlas credentials
- Proper IAM permissions for S3 access and Secrets Manager
- MongoDB tools installed locally

### Configuration

1. **AWS Secrets Manager**:
   - Secret should be named `mongodb/credentials` by default
   - Format: `{ "username": "your_username", "password": "your_password" }`

2. **S3 Bucket**:
   - Created via Terraform in `infra/s3_backups.tf`
   - Has a 30-day lifecycle policy for automatic backup management

3. **IAM Permissions**:
   - App role has permissions to access both S3 buckets (backups and images)
   - Local AWS profile must have access to S3 and Secrets Manager

## Usage

### Manual Backup

To manually create a backup and upload to S3:

```powershell
.\Backup-MongoDBToS3.ps1
```

Options:

- `-BackupName`: Override default backup naming (default: "mongodb_backup_YYYY-MM-DD_HH-MM-SS")
- `-TempPath`: Specify temporary directory for local backup files
- `-KeepLocalBackup`: Switch to retain local backup files after S3 upload
- `-ForceOverwrite`: Switch to overwrite existing S3 objects with the same key

### Setting Up Scheduled Backups

To schedule automated backups:

```powershell
.\Register-MongoDBBackupTask.ps1 -TaskName "MongoDBAtlasBackup" -RunTime "3:00am" -Frequency "Daily"
```

Options:

- `-TaskName`: Name for the scheduled task (default: "MongoDBAtlasBackup")
- `-RunTime`: Time to run the backup (default: "3:00am")
- `-Frequency`: "Daily" or "Weekly" (default: "Daily")

### Restoring from Backup

To list available backups:

```powershell
.\Restore-MongoDBFromS3.ps1 -ListBackups
```

To restore the latest backup:

```powershell
.\Restore-MongoDBFromS3.ps1
```

To restore a specific backup:

```powershell
.\Restore-MongoDBFromS3.ps1 -BackupKey "path/to/backup.zip"
```

Options:

- `-BackupKey`: The S3 object key of the backup to restore
- `-BucketName`: S3 bucket name (default: "moms-recipe-box-backups")
- `-TempPath`: Temporary directory for extraction (default: %TEMP%\mongodb_restore)
- `-Force`: Skip confirmation prompt

### Running Maintenance

To run all maintenance tasks including backup:

```powershell
.\Invoke-MongoDBMaintenance.ps1
```

Options:

- `-BackupOnly`: Only perform backup operation
- `-SkipBackup`: Skip backup and only run other maintenance tasks
- `-KeepLocalBackups`: Retain local backup files
- `-Verbose`: Show detailed output

### Verifying Backups

You can verify your backups in the S3 console or using AWS CLI:

```powershell
aws s3 ls s3://moms-recipe-box-backups/
```

## Troubleshooting

Common issues:

- **Connection failures**: Verify IP whitelisting in MongoDB Atlas
- **Authentication errors**: Check AWS Secrets Manager values
- **S3 upload errors**: Verify IAM permissions and AWS CLI configuration
- **Task scheduler errors**: Ensure proper user permissions for task execution

## Architecture

```ascii
┌─────────────────┐    ┌───────────────────┐    ┌────────────────┐
│                 │    │                   │    │                │
│  Scheduled Task │───►│  PowerShell       │───►│  AWS Secrets   │
│                 │    │  Backup Scripts   │◄───│  Manager       │
└─────────────────┘    │                   │    │                │
                       └───────┬───────────┘    └────────────────┘
                               │
                               ▼
                       ┌───────────────────┐    ┌────────────────┐
                       │                   │    │                │
                       │  MongoDB Atlas    │◄───┤  S3 Bucket     │
                       │                   │    │                │
                       └───────────────────┘    └────────────────┘
```

## Additional Information

- The backup file naming convention includes timestamps for easy identification
- S3 lifecycle policies automatically manage old backups for cost optimization
- The MongoDB Atlas M0 tier has a 512MB storage limit
