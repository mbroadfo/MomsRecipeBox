# MongoDB Atlas Cloud Backup Strategy

This document outlines the backup strategy for Mom's Recipe Box using MongoDB Atlas cloud backups.

## Overview

MongoDB Atlas provides built-in cloud backup functionality for all clusters, including the free M0 tier. While the M0 tier has some limitations, we can leverage AWS services to enhance our backup and recovery capabilities.

## MongoDB Atlas Backup Features

### M0 Tier Limitations

- No built-in continuous backup
- No on-demand backups
- No point-in-time recovery
- No automated snapshots by MongoDB Atlas

### Our Backup Strategy

Since we're using the M0 free tier, we'll implement a custom backup solution using AWS services to perform regular exports of our data.

## Backup Implementation

### 1. Regular Database Exports using AWS Lambda

We'll set up a Lambda function that runs on a schedule to export our MongoDB data.

#### Lambda Function Setup

Create a new file `infra/mongodb_backup_lambda.tf`:

```terraform
resource "aws_lambda_function" "mongodb_atlas_backup" {
  function_name    = "mongodb-atlas-backup"
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.mongodb_backup_role.arn
  filename         = "lambda_function_payload.zip"
  source_code_hash = filebase64sha256("lambda_function_payload.zip")
  timeout          = 300 # 5 minutes
  memory_size      = 512

  environment {
    variables = {
      MONGODB_URI      = "
      BUCKET_NAME      = aws_s3_bucket.mongodb_backups.bucket
      DATABASE_NAME    = "momsrecipebox"
    }
  }
}

resource "aws_iam_role" "mongodb_backup_role" {
  name = "mongodb_backup_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "mongodb_backup_policy" {
  name        = "mongodb_backup_policy"
  description = "Allows Lambda function to access S3 and CloudWatch Logs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.mongodb_backups.arn}",
          "${aws_s3_bucket.mongodb_backups.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "mongodb_backup_policy_attachment" {
  role       = aws_iam_role.mongodb_backup_role.name
  policy_arn = aws_iam_policy.mongodb_backup_policy.arn
}

# S3 Bucket for storing backups
resource "aws_s3_bucket" "mongodb_backups" {
  bucket = "momsrecipebox-mongodb-backups-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_lifecycle_configuration" "mongodb_backups_lifecycle" {
  bucket = aws_s3_bucket.mongodb_backups.id

  rule {
    id      = "backup-retention"
    status  = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365 # Keep backups for 1 year
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "mongodb_backups_encryption" {
  bucket = aws_s3_bucket.mongodb_backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudWatch Event Rule to trigger the backup Lambda function
resource "aws_cloudwatch_event_rule" "mongodb_backup_schedule" {
  name                = "mongodb-backup-schedule"
  description         = "Triggers MongoDB Atlas backup Lambda function"
  schedule_expression = "cron(0 3 * * ? *)" # Run daily at 3:00 AM UTC
}

resource "aws_cloudwatch_event_target" "mongodb_backup_lambda_target" {
  rule      = aws_cloudwatch_event_rule.mongodb_backup_schedule.name
  target_id = "mongodb_backup_lambda"
  arn       = aws_lambda_function.mongodb_atlas_backup.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_to_invoke_backup" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.mongodb_atlas_backup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.mongodb_backup_schedule.arn
}

data "aws_caller_identity" "current" {}
```

### 2. Lambda Function Code for Database Export

Create a file `scripts/mongodb_backup_lambda/index.js`:

```javascript
const { MongoClient } = require('mongodb');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const s3 = new AWS.S3();

exports.handler = async function(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  
  const mongodbUri = process.env.MONGODB_URI;
  const bucketName = process.env.BUCKET_NAME;
  const databaseName = process.env.DATABASE_NAME;
  
  console.log(`Starting backup of ${databaseName}`);
  
  try {
    // Connect to MongoDB
    const client = new MongoClient(mongodbUri);
    await client.connect();
    console.log("Connected to MongoDB Atlas");
    
    const db = client.db(databaseName);
    
    // Get list of collections
    const collections = await db.listCollections().toArray();
    
    // Create a timestamp for the backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = `/tmp/mongodb-backup-${timestamp}`;
    
    // Create backup directory
    await execAsync(`mkdir -p ${backupFolder}`);
    
    // Export each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`Exporting collection: ${collectionName}`);
      
      // Query all documents in the collection
      const documents = await db.collection(collectionName).find({}).toArray();
      
      // Write to JSON file
      const outputFile = path.join(backupFolder, `${collectionName}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(documents, null, 2));
    }
    
    // Create a zip archive
    const zipFileName = `/tmp/mongodb-backup-${timestamp}.zip`;
    await execAsync(`cd ${backupFolder} && zip -r ${zipFileName} .`);
    
    // Upload to S3
    console.log(`Uploading backup to S3 bucket: ${bucketName}`);
    const fileContent = fs.readFileSync(zipFileName);
    
    const s3Response = await s3.putObject({
      Bucket: bucketName,
      Key: `mongodb-backup-${timestamp}.zip`,
      Body: fileContent,
      ContentType: 'application/zip',
      Metadata: {
        'database': databaseName,
        'timestamp': timestamp
      }
    }).promise();
    
    // Clean up local files
    await execAsync(`rm -rf ${backupFolder} ${zipFileName}`);
    
    await client.close();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Backup completed successfully",
        timestamp: timestamp,
        s3Location: `s3://${bucketName}/mongodb-backup-${timestamp}.zip`
      })
    };
    
  } catch (error) {
    console.error("Backup failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Backup failed",
        error: error.message
      })
    };
  }
};
```

### 3. Package Lambda Function

Create a PowerShell script `scripts/package_mongodb_backup_lambda.ps1`:

```powershell
# Package MongoDB Atlas backup Lambda function

# Create temporary directory
$tempDir = ".\temp_mongodb_backup_lambda"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Copy Lambda code
Copy-Item ".\scripts\mongodb_backup_lambda\index.js" -Destination "$tempDir\index.js"

# Create package.json
$packageJson = @"
{
  "name": "mongodb-atlas-backup",
  "version": "1.0.0",
  "description": "Lambda function to backup MongoDB Atlas database",
  "main": "index.js",
  "dependencies": {
    "mongodb": "^5.0.0",
    "aws-sdk": "^2.1354.0"
  }
}
"@
Set-Content -Path "$tempDir\package.json" -Value $packageJson

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
Set-Location $tempDir
npm install --production
Set-Location ..

# Create zip file
Write-Host "Creating zip file..." -ForegroundColor Cyan
Compress-Archive -Path "$tempDir\*" -DestinationPath ".\lambda_function_payload.zip" -Force

# Clean up
Write-Host "Cleaning up..." -ForegroundColor Cyan
Remove-Item -Recurse -Force $tempDir

Write-Host "✅ Lambda function packaged successfully: lambda_function_payload.zip" -ForegroundColor Green
```

## Backup Verification and Restoration

### Verification Process

1. Set up CloudWatch alarms to monitor backup job success
2. Create a notification system for failed backups
3. Periodically test restoration of backups to verify data integrity

### Restoration Process

1. Download the backup ZIP file from S3
2. Extract the files to a local directory
3. Use `mongoimport` to restore each collection:

```bash
mongoimport --uri <MONGODB_URI> --collection <COLLECTION_NAME> --file <JSON_FILE> --jsonArray
```

## Emergency Restoration Procedure

In case of data loss or corruption:

1. Identify the most recent valid backup
2. Download the backup from S3
3. Follow these steps to restore:

```powershell
# Download backup from S3
aws s3 cp s3://momsrecipebox-mongodb-backups-<ACCOUNT_ID>/mongodb-backup-<TIMESTAMP>.zip .

# Extract backup
Expand-Archive -Path mongodb-backup-<TIMESTAMP>.zip -DestinationPath ./mongodb-restore

# Get MongoDB URI from AWS Secrets Manager
$secretJson = aws secretsmanager get-secret-value --secret-id moms-recipe-secrets | ConvertFrom-Json
$mongoUri = ($secretJson.SecretString | ConvertFrom-Json).MONGODB_URI

# Restore each collection
Get-ChildItem -Path ./mongodb-restore -Filter *.json | ForEach-Object {
    $collectionName = $_.BaseName
    mongoimport --uri $mongoUri --collection $collectionName --file $_.FullName --jsonArray
}
```

## Summary

This backup strategy provides:

1. Daily automated backups of all collections
2. Secure storage in S3 with lifecycle policies
3. Encrypted backup storage
4. Retention of backups for one year
5. Automated cleanup with tiered storage to optimize costs

While the free M0 tier has limitations, our custom backup solution provides a robust way to protect our data without additional MongoDB Atlas costs.
