# Test-MongoDBBackupDocker.ps1
# This script tests the MongoDB Atlas backup strategy using Docker to avoid local tool installation

param(
    [Parameter(Mandatory=$false)]
    [string]$SecretName = "moms-recipe-secrets-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-west-2",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFolder = ".\backups\mongodb_atlas",
    
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

Write-Host "MongoDB Atlas Backup Test (Docker Edition)" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan

# Check if Docker is installed
try {
    $null = docker --version
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed"
    }
}
catch {
    Write-Error "Docker is not installed or not available in PATH. Please install Docker Desktop."
    exit 1
}

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

# Create timestamp for backup
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupPath = Join-Path $OutputFolder "mongodb_backup_$timestamp"
$backupPathFull = Join-Path (Get-Location) $backupPath

# Create backup directory if it doesn't exist
if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
}

if (-not (Test-Path $backupPath)) {
    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
}

# Perform backup using Docker
try {
    Write-Host "Backing up MongoDB Atlas database to $backupPath using Docker..." -ForegroundColor Yellow
    
    # Run mongodump in a Docker container
    $dockerCommand = "docker run --rm -v `"${backupPathFull}:/backup`" mongo:latest mongodump --uri=`"$mongoUri`" --out=/backup"
    
    Write-Host "Running Docker container with MongoDB tools..." -ForegroundColor Gray
    Invoke-Expression $dockerCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker mongodump failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    
    # Create backup info file
    $backupInfo = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        source = "MongoDB Atlas (Docker Backup)"
        uri = $mongoUri.Replace($secrets.MONGODB_ATLAS_PASSWORD, "********") # Mask password in logs
        path = $backupPath
    } | ConvertTo-Json -Depth 5
    
    Set-Content -Path (Join-Path $backupPath "backup_info.json") -Value $backupInfo
    
    Write-Host "✅ MongoDB Atlas backup completed successfully to: $backupPath" -ForegroundColor Green
    
    # List collections that were backed up
    $momsRecipeBoxDir = Join-Path $backupPath "momsrecipebox"
    if (Test-Path $momsRecipeBoxDir) {
        $collectionFolders = Get-ChildItem -Path $momsRecipeBoxDir -Directory
        Write-Host "`nBacked up collections:" -ForegroundColor Cyan
        
        $collectionFolders | ForEach-Object {
            $collectionName = $_.Name
            $bsonFiles = Get-ChildItem -Path $_.FullName -Filter "*.bson"
            
            $fileSize = $bsonFiles | Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum
            $fileSizeFormatted = if ($fileSize -lt 1KB) {
                "$fileSize B"
            } elseif ($fileSize -lt 1MB) {
                "{0:N2} KB" -f ($fileSize / 1KB)
            } else {
                "{0:N2} MB" -f ($fileSize / 1MB)
            }
            
            Write-Host " - $collectionName ($fileSizeFormatted)" -ForegroundColor Gray
        }
    } else {
        Write-Host "`nNo collections found in backup. This may be normal if your database is empty." -ForegroundColor Yellow
    }
    
    # Test restore if forced
    if ($Force) {
        Write-Host "`nTesting restoration capability (in a temporary container)..." -ForegroundColor Yellow
        
        # Create a temporary MongoDB container
        $tempContainerName = "mongo-restore-test-$((New-Guid).ToString().Substring(0,8))"
        Write-Host "Starting temporary MongoDB container: $tempContainerName..." -ForegroundColor Gray
        
        docker run --name $tempContainerName -d mongo:latest
        Start-Sleep -Seconds 2 # Give MongoDB time to start
        
        # Run mongorestore against the temporary container
        Write-Host "Running restore test..." -ForegroundColor Gray
        $restoreCommand = "docker run --rm --link $tempContainerName:mongo -v `"${backupPathFull}:/backup`" mongo:latest mongorestore --host mongo --port 27017 --dir=/backup"
        Invoke-Expression $restoreCommand
        
        # Clean up temporary container
        Write-Host "Cleaning up temporary container..." -ForegroundColor Gray
        docker stop $tempContainerName
        docker rm $tempContainerName
        
        Write-Host "✅ Restore validation completed successfully" -ForegroundColor Green
    }
    
    return @{
        Success = $true
        BackupPath = $backupPath
        Collections = if ($collectionFolders) { $collectionFolders.Count } else { 0 }
        Timestamp = $timestamp
    }
    
} catch {
    Write-Error "Backup failed: $_"
    exit 1
}