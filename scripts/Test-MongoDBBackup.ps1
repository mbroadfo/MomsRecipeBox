# Test-MongoDBBackup.ps1
# This script tests the MongoDB Atlas backup strategy by performing a manual backup
# Uses AWS Secrets Manager to retrieve MongoDB credentials securely

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

Write-Host "MongoDB Atlas Backup Test" -ForegroundColor Cyan
Write-Host "---------------------------" -ForegroundColor Cyan

# Check if MongoDB tools are installed or find their path
$mongoDumpPath = "mongodump"  # Default to expecting it in PATH
$possiblePaths = @(
    "C:\Program Files\MongoDB\Tools\100\bin\mongodump.exe",
    "C:\Program Files\MongoDB\Database Tools\100\bin\mongodump.exe",
    "C:\Program Files\MongoDB\Server\Tools\bin\mongodump.exe",
    "C:\Program Files\MongoDB\Tools\bin\mongodump.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $mongoDumpPath = $path
        Write-Host "Found mongodump at: $mongoDumpPath" -ForegroundColor Green
        break
    }
}

if ($mongoDumpPath -eq "mongodump") {
    # If we're still using just "mongodump", check if it's in PATH
    try {
        $null = Get-Command mongodump -ErrorAction Stop
    }
    catch {
        Write-Error "MongoDB Database Tools are not installed or not in PATH. Please install them from: https://www.mongodb.com/try/download/database-tools"
        Write-Host "Alternatively, add the directory containing mongodump.exe to your PATH" -ForegroundColor Yellow
        exit 1
    }
}

# Get MongoDB URI from AWS Secrets Manager
try {
    Write-Host "Getting MongoDB credentials from AWS Secrets Manager..." -ForegroundColor Gray
    $secretJson = aws secretsmanager get-secret-value --secret-id $SecretName --region $Region 2>$null | ConvertFrom-Json
    
    if ($secretJson) {
        $secrets = $secretJson.SecretString | ConvertFrom-Json
        $MongoUri = $secrets.MONGODB_URI
    }
    
    if (-not $MongoUri) {
        Write-Error "MongoDB URI not found in AWS Secrets Manager (secret: $SecretName). Please check your secret configuration."
        exit 1
    }

    Write-Host "Successfully retrieved MongoDB connection details from AWS Secrets Manager" -ForegroundColor Green
}
catch {
    Write-Error "Could not access AWS Secrets Manager: $($_.Exception.Message)"
    Write-Host "Ensure AWS CLI is installed and configured with appropriate permissions" -ForegroundColor Yellow
    Write-Host "You can create/update secrets using Set-MongoAtlasSecret.ps1 script" -ForegroundColor Yellow
    exit 1
}

# Create timestamp for backup
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupPath = Join-Path $OutputFolder "mongodb_backup_$timestamp"

# Create backup directory if it doesn't exist
if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
}

# Perform backup
try {
    Write-Host "Backing up MongoDB Atlas database to $backupPath..." -ForegroundColor Yellow
    
    # Use mongodump to create backup
    & $mongoDumpPath --uri="$MongoUri" --out="$backupPath"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "mongodump failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
    
    # Create backup info file
    $backupInfo = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        source = "MongoDB Atlas"
        uri = "MongoDB Atlas (via AWS Secrets Manager: $SecretName)" # Don't log the URI at all
        path = $backupPath
    } | ConvertTo-Json -Depth 5
    
    Set-Content -Path (Join-Path $backupPath "backup_info.json") -Value $backupInfo
    
    Write-Host "✅ MongoDB Atlas backup completed successfully to: $backupPath" -ForegroundColor Green
    
    # List collections that were backed up
    $collectionFolders = Get-ChildItem -Path (Join-Path $backupPath "momsrecipebox") -Directory
    Write-Host "`nBacked up collections:" -ForegroundColor Cyan
    $collectionFolders | ForEach-Object {
        $collectionName = $_.Name
        $bsonFiles = Get-ChildItem -Path $_.FullName -Filter "*.bson"
        $documentCount = 0
        
        if ($bsonFiles.Count -gt 0) {
            # Use mongorestore with --dryRun to count documents
            $mongorestore = $mongoDumpPath.Replace("mongodump.exe", "mongorestore.exe").Replace("mongodump", "mongorestore")
            $dryRunOutput = & $mongorestore --uri="$MongoUri" --nsInclude="momsrecipebox.$collectionName" --dir="$backupPath" --dryRun 2>&1
            $countLine = $dryRunOutput | Select-String -Pattern "going to restore \d+ objects"
            if ($countLine) {
                $documentCount = [regex]::Match($countLine, "going to restore (\d+) objects").Groups[1].Value
            }
        }
        
        $fileSize = $bsonFiles | Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum
        $fileSizeFormatted = if ($fileSize -lt 1KB) {
            "$fileSize B"
        } elseif ($fileSize -lt 1MB) {
            "{0:N2} KB" -f ($fileSize / 1KB)
        } else {
            "{0:N2} MB" -f ($fileSize / 1MB)
        }
        
        Write-Host " - $collectionName ($documentCount documents, $fileSizeFormatted)" -ForegroundColor Gray
    }
    
    # Test restore if forced
    if ($Force) {
        Write-Host "`nTesting restoration capability (dry run)..." -ForegroundColor Yellow
        $mongorestore = $mongoDumpPath.Replace("mongodump.exe", "mongorestore.exe").Replace("mongodump", "mongorestore")
        & $mongorestore --uri="$MongoUri" --dir="$backupPath" --dryRun | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Restore validation completed successfully" -ForegroundColor Green
        } else {
            Write-Error "Restore validation failed with exit code $LASTEXITCODE"
        }
    }
    
    # Get the collection count safely
    $collectionCount = if ($null -ne $collectionFolders) { 
        if ($collectionFolders -is [array]) { $collectionFolders.Length } else { 1 } 
    } else { 
        0 
    }

    return @{
        Success = $true
        BackupPath = $backupPath
        Collections = $collectionCount
        Timestamp = $timestamp
    }
    
} catch {
    Write-Error "Backup failed: $_"
    exit 1
}