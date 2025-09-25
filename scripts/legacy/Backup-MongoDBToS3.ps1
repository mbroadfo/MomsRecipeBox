# Backup-MongoDBToS3.ps1
# This script performs a MongoDB Atlas backup and uploads it to S3

param(
    [Parameter(Mandatory=$false)]
    [string]$SecretName = "moms-recipe-secrets-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-west-2",
    
    [Parameter(Mandatory=$false)]
    [string]$BackupsBucket = "mrb-mongodb-backups-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$LocalOutputFolder = ".\backups\mongodb_atlas",
    
    [Parameter(Mandatory=$false)]
    [switch]$CleanupLocal
)

Write-Host "MongoDB Atlas S3 Backup" -ForegroundColor Cyan
Write-Host "---------------------" -ForegroundColor Cyan

# Check if AWS CLI is installed
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Error "AWS CLI is not installed. Please install it first."
    exit 1
}

# Create timestamp for backup
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupName = "mongodb_backup_$timestamp"
$localBackupPath = Join-Path $LocalOutputFolder $backupName

# Step 1: Run the Test-MongoDBBackup.ps1 script to create a local backup
$scriptPath = Join-Path $PSScriptRoot "Test-MongoDBBackup.ps1"
Write-Host "Creating MongoDB backup..." -ForegroundColor Yellow
$backupResult = & $scriptPath -SecretName $SecretName -Region $Region -OutputFolder $LocalOutputFolder

# Check if backup was successful
if (-not $backupResult -or -not $backupResult.Success) {
    Write-Error "MongoDB backup failed. Cannot proceed with S3 upload."
    exit 1
}

# Step 2: Create a zip file of the backup
$localZipPath = "$localBackupPath.zip"
Write-Host "Compressing backup..." -ForegroundColor Yellow
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($localBackupPath, $localZipPath)

# Step 3: Upload the zip file to S3
$s3Key = "backups/$timestamp/$backupName.zip"
Write-Host "Uploading backup to S3: $BackupsBucket/$s3Key..." -ForegroundColor Yellow

try {
    aws s3 cp $localZipPath "s3://$BackupsBucket/$s3Key" --region $Region
    $uploadSuccess = $?
    
    if ($uploadSuccess) {
        Write-Host "✅ MongoDB Atlas backup successfully uploaded to S3" -ForegroundColor Green
        
        # Get the S3 URL
        $s3Url = "s3://$BackupsBucket/$s3Key"
        Write-Host "S3 URL: $s3Url" -ForegroundColor Cyan
        
        # Cleanup local files if specified
        if ($CleanupLocal) {
            Write-Host "Cleaning up local backup files..." -ForegroundColor Gray
            Remove-Item -Path $localBackupPath -Recurse -Force
            Remove-Item -Path $localZipPath -Force
            Write-Host "Local backup files deleted" -ForegroundColor Gray
        }
        
        return @{
            Success = $true
            S3Url = $s3Url
            Timestamp = $timestamp
            BackupName = $backupName
            LocalBackupPath = if (-not $CleanupLocal) { $localBackupPath } else { $null }
            LocalZipPath = if (-not $CleanupLocal) { $localZipPath } else { $null }
        }
    } else {
        Write-Error "Failed to upload backup to S3"
        exit 1
    }
} catch {
    Write-Error "Error uploading to S3: $_"
    exit 1
}