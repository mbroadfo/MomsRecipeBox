# Create-MongoBackupLambda.ps1
# This script creates an AWS Lambda function for MongoDB Atlas backup

param(
    [Parameter(Mandatory=$false)]
    [string]$SecretName = "moms-recipe-secrets-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-west-2",
    
    [Parameter(Mandatory=$false)]
    [string]$BucketName = "momsrecipebox-mongodb-backups",
    
    [Parameter(Mandatory=$false)]
    [string]$LambdaName = "mongodb-atlas-backup"
)

Write-Host "Creating MongoDB Atlas Backup Lambda" -ForegroundColor Cyan
Write-Host "------------------------------------" -ForegroundColor Cyan

# Check if AWS CLI is installed
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Error "AWS CLI is not installed. Please install it first."
    exit 1
}

# Check if Node.js is installed (needed for creating the Lambda package)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed. Please install it first."
    exit 1
}

# Create temporary directory for Lambda code
$tempDir = ".\temp_lambda"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Get MongoDB credentials from AWS Secrets Manager
try {
    Write-Host "Getting MongoDB credentials from AWS Secrets Manager..." -ForegroundColor Gray
    $secretJson = aws secretsmanager get-secret-value --secret-id $SecretName --region $Region | ConvertFrom-Json
    $secrets = $secretJson.SecretString | ConvertFrom-Json
    
    $mongoUri = $secrets.MONGODB_URI
    if (-not $mongoUri) {
        Write-Error "MongoDB URI not found in AWS Secrets Manager"
        exit 1
    }
}
catch {
    Write-Error "Failed to get MongoDB credentials: $_"
    exit 1
}

# Check if S3 bucket exists, create if not
Write-Host "Checking S3 bucket..." -ForegroundColor Gray
$bucketExists = $null
try {
    $bucketExists = aws s3api head-bucket --bucket $BucketName 2>$null
    Write-Host "S3 bucket '$BucketName' exists." -ForegroundColor Gray
}
catch {
    Write-Host "S3 bucket doesn't exist. Creating it..." -ForegroundColor Yellow
    try {
        aws s3 mb s3://$BucketName --region $Region | Out-Null
        Write-Host "Created S3 bucket: $BucketName" -ForegroundColor Green

        # Configure bucket lifecycle policy
        $lifecycleConfig = @"
{
  "Rules": [
    {
      "ID": "backup-lifecycle",
      "Status": "Enabled",
      "Prefix": "",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
"@
        $lifecycleConfigPath = Join-Path $tempDir "lifecycle.json"
        Set-Content -Path $lifecycleConfigPath -Value $lifecycleConfig
        aws s3api put-bucket-lifecycle-configuration --bucket $BucketName --lifecycle-configuration file://$lifecycleConfigPath | Out-Null
        Write-Host "Configured bucket lifecycle policy." -ForegroundColor Gray
    }
    catch {
        Write-Error "Failed to create S3 bucket: $_"
        exit 1
    }
}

# Create Lambda IAM role
$roleName = "$LambdaName-role"
Write-Host "Creating IAM role for Lambda..." -ForegroundColor Gray

# Check if role exists
$roleExists = $null
try {
    $roleExists = aws iam get-role --role-name $roleName 2>$null
}
catch {}

if (-not $roleExists) {
    Write-Host "Creating new IAM role..." -ForegroundColor Yellow
    
    $trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@
    $trustPolicyPath = Join-Path $tempDir "trust-policy.json"
    Set-Content -Path $trustPolicyPath -Value $trustPolicy
    
    try {
        $roleOutput = aws iam create-role --role-name $roleName --assume-role-policy-document file://$trustPolicyPath | ConvertFrom-Json
        $roleArn = $roleOutput.Role.Arn
        Write-Host "Created IAM role: $roleArn" -ForegroundColor Green
        
        # Attach policies to the role
        Write-Host "Attaching policies to the role..." -ForegroundColor Gray
        aws iam attach-role-policy --role-name $roleName --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole | Out-Null
        
        $s3Policy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::$BucketName",
        "arn:aws:s3:::$BucketName/*"
      ]
    }
  ]
}
"@
        $s3PolicyPath = Join-Path $tempDir "s3-policy.json"
        Set-Content -Path $s3PolicyPath -Value $s3Policy
        
        aws iam put-role-policy --role-name $roleName --policy-name "${LambdaName}-s3-access" --policy-document file://$s3PolicyPath | Out-Null
        
        # Add secrets access policy
        $secretsPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:$Region:*:secret:$SecretName*"
    }
  ]
}
"@
        $secretsPolicyPath = Join-Path $tempDir "secrets-policy.json"
        Set-Content -Path $secretsPolicyPath -Value $secretsPolicy
        
        aws iam put-role-policy --role-name $roleName --policy-name "${LambdaName}-secrets-access" --policy-document file://$secretsPolicyPath | Out-Null
        
        # Wait for role to propagate
        Write-Host "Waiting for role to propagate (10 seconds)..." -ForegroundColor Gray
        Start-Sleep -Seconds 10
    }
    catch {
        Write-Error "Failed to create IAM role: $_"
        exit 1
    }
}
else {
    $roleArn = $roleExists.Role.Arn
    Write-Host "Using existing IAM role: $roleArn" -ForegroundColor Green
}

# Create Lambda code
Write-Host "Creating Lambda function code..." -ForegroundColor Gray

# Create package.json
$packageJson = @"
{
  "name": "mongodb-atlas-backup",
  "version": "1.0.0",
  "description": "AWS Lambda function to backup MongoDB Atlas database",
  "main": "index.js",
  "dependencies": {
    "mongodb": "^5.0.0",
    "aws-sdk": "^2.1354.0",
    "adm-zip": "^0.5.10"
  }
}
"@
Set-Content -Path (Join-Path $tempDir "package.json") -Value $packageJson

# Create index.js
$indexJs = @"
const { MongoClient } = require('mongodb');
const AWS = require('aws-sdk');
const AdmZip = require('adm-zip');

const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();

exports.handler = async (event, context) => {
  console.log('Starting MongoDB Atlas backup');
  
  try {
    // Get MongoDB URI from Secrets Manager
    const secretName = '$SecretName';
    console.log(`Retrieving secret: \${secretName}`);
    
    const secretData = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    const secrets = JSON.parse(secretData.SecretString);
    const mongodbUri = secrets.MONGODB_URI;
    const databaseName = 'momsrecipebox';
    
    if (!mongodbUri) {
      throw new Error('MongoDB URI not found in secrets');
    }
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB Atlas');
    const client = new MongoClient(mongodbUri);
    await client.connect();
    
    const db = client.db(databaseName);
    console.log(`Connected to database: \${databaseName}`);
    
    // Get list of collections
    const collections = await db.listCollections().toArray();
    console.log(`Found \${collections.length} collections`);
    
    // Create a zip archive
    const zip = new AdmZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Add metadata to archive
    const metadata = {
      timestamp,
      source: 'MongoDB Atlas Lambda Backup',
      database: databaseName,
      collections: collections.map(c => c.name)
    };
    zip.addFile('metadata.json', Buffer.from(JSON.stringify(metadata, null, 2)));
    
    // Export each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`Exporting collection: \${collectionName}`);
      
      const documents = await db.collection(collectionName).find({}).toArray();
      console.log(`Found \${documents.length} documents in \${collectionName}`);
      
      // Add to zip file
      zip.addFile(`\${collectionName}.json`, Buffer.from(JSON.stringify(documents, null, 2)));
    }
    
    // Upload to S3
    const bucketName = '$BucketName';
    const key = `mongodb-backup-\${timestamp}.zip`;
    
    console.log(`Uploading backup to S3: \${bucketName}/\${key}`);
    
    await s3.putObject({
      Bucket: bucketName,
      Key: key,
      Body: zip.toBuffer(),
      ContentType: 'application/zip',
      Metadata: {
        'database': databaseName,
        'timestamp': timestamp,
        'collection-count': collections.length.toString()
      }
    }).promise();
    
    console.log('Backup completed successfully');
    await client.close();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Backup completed successfully',
        timestamp,
        s3Location: `s3://\${bucketName}/\${key}`,
        collections: collections.length
      })
    };
    
  } catch (error) {
    console.error('Backup failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Backup failed',
        error: error.message
      })
    };
  }
};
"@
Set-Content -Path (Join-Path $tempDir "index.js") -Value $indexJs

# Install dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Gray
Push-Location $tempDir
npm install --production
Pop-Location

# Create Lambda function ZIP package
$zipPath = "lambda_backup_function.zip"
if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

Write-Host "Creating Lambda function package..." -ForegroundColor Gray
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath

# Check if Lambda function exists
$lambdaExists = $null
try {
    $lambdaExists = aws lambda get-function --function-name $LambdaName --region $Region 2>$null
}
catch {}

if (-not $lambdaExists) {
    # Create Lambda function
    Write-Host "Creating Lambda function..." -ForegroundColor Yellow
    try {
        aws lambda create-function `
            --function-name $LambdaName `
            --runtime nodejs18.x `
            --handler index.handler `
            --role $roleArn `
            --zip-file fileb://$zipPath `
            --timeout 300 `
            --memory-size 512 `
            --region $Region | Out-Null
        
        Write-Host "✅ Created Lambda function: $LambdaName" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to create Lambda function: $_"
        exit 1
    }
}
else {
    # Update Lambda function
    Write-Host "Updating Lambda function code..." -ForegroundColor Yellow
    try {
        aws lambda update-function-code `
            --function-name $LambdaName `
            --zip-file fileb://$zipPath `
            --region $Region | Out-Null
        
        Write-Host "✅ Updated Lambda function: $LambdaName" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to update Lambda function: $_"
        exit 1
    }
}

# Create CloudWatch Events Rule to schedule the backup
$ruleName = "$LambdaName-schedule"

# Check if rule exists
$ruleExists = $null
try {
    $ruleExists = aws events describe-rule --name $ruleName --region $Region 2>$null
}
catch {}

if (-not $ruleExists) {
    # Create rule
    Write-Host "Creating CloudWatch Events rule for daily backups..." -ForegroundColor Yellow
    try {
        aws events put-rule `
            --name $ruleName `
            --schedule-expression "cron(0 3 * * ? *)" `
            --description "Daily MongoDB Atlas backup at 3:00 AM UTC" `
            --region $Region | Out-Null
        
        # Add permission for CloudWatch Events to invoke Lambda
        aws lambda add-permission `
            --function-name $LambdaName `
            --statement-id "AllowCloudWatchToInvoke" `
            --action "lambda:InvokeFunction" `
            --principal "events.amazonaws.com" `
            --source-arn $(aws events describe-rule --name $ruleName --region $Region --query 'Arn' --output text) `
            --region $Region | Out-Null
        
        # Add target to rule
        aws events put-targets `
            --rule $ruleName `
            --targets "Id"="1","Arn"=$(aws lambda get-function --function-name $LambdaName --region $Region --query 'Configuration.FunctionArn' --output text) `
            --region $Region | Out-Null
        
        Write-Host "✅ Created CloudWatch Events rule: $ruleName" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to create CloudWatch Events rule: $_"
        exit 1
    }
}
else {
    Write-Host "CloudWatch Events rule already exists: $ruleName" -ForegroundColor Green
}

# Test the Lambda function
Write-Host "`nWould you like to test the backup Lambda function now? (Y/N)" -ForegroundColor Cyan
$testResponse = Read-Host
if ($testResponse -eq "Y" -or $testResponse -eq "y") {
    Write-Host "Invoking Lambda function for testing..." -ForegroundColor Yellow
    try {
        $testOutput = aws lambda invoke `
            --function-name $LambdaName `
            --invocation-type RequestResponse `
            --log-type Tail `
            --query 'LogResult' `
            --output text `
            --region $Region `
            temp-output.json | ForEach-Object { [System.Text.Encoding]::ASCII.GetString([System.Convert]::FromBase64String($_)) }
        
        Write-Host "`nLambda execution logs:" -ForegroundColor Gray
        Write-Host $testOutput
        
        $testResult = Get-Content -Raw temp-output.json | ConvertFrom-Json
        if ($testResult.statusCode -eq 200) {
            Write-Host "`n✅ Backup completed successfully!" -ForegroundColor Green
            Write-Host "S3 Location: $($testResult.body.s3Location)" -ForegroundColor Green
        } else {
            Write-Host "`n❌ Backup failed. See logs above for details." -ForegroundColor Red
        }
        
        Remove-Item -Force temp-output.json
    }
    catch {
        Write-Error "Failed to test Lambda function: $_"
    }
}

# Clean up temporary files
Remove-Item -Recurse -Force $tempDir

Write-Host "`n✅ MongoDB Atlas backup system is now configured" -ForegroundColor Green
Write-Host "Daily backups will run at 3:00 AM UTC" -ForegroundColor Cyan
Write-Host "Backups will be stored in S3 bucket: $BucketName" -ForegroundColor Cyan
Write-Host "You can manually trigger a backup by invoking the Lambda function: $LambdaName" -ForegroundColor Cyan