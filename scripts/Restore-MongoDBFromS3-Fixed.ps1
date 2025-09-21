# Restore-MongoDBFromS3-Fixed.ps1
# Simple script to restore MongoDB Atlas from the local backup
# Uses terraform-mrb AWS profile and local backup files

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupName = "backup_2025-09-20_07-37-07",
    
    [Parameter(Mandatory=$false)]
    [string]$AwsProfile = "terraform-mrb",
    
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

Write-Host "MongoDB Atlas Restore Script" -ForegroundColor Cyan
Write-Host "Using AWS Profile: $AwsProfile" -ForegroundColor Gray
Write-Host "Backup: $BackupName" -ForegroundColor Gray

try {
    # Construct MongoDB Atlas connection string manually with proper URL encoding
    Write-Host "Constructing MongoDB Atlas connection string..." -ForegroundColor Cyan
    
    $Username = "mrbapp"
    $Password = "zjF5MNeHDeCs9@XBzjF5MNeHDeCs9@XB"
    $ServerAddress = "momsrecipebox-cluster.vohcix5.mongodb.net"
    $Database = "moms_recipe_box"  # Match the Atlas user permissions (with underscores)
    
    # URL encode the password (@ becomes %40)
    $EncodedPassword = $Password -replace "@", "%40"
    
    # Construct the connection string
    $connectionString = "mongodb+srv://$Username`:$EncodedPassword@$ServerAddress/$Database`?retryWrites=true&w=majority"
    Write-Host "Successfully constructed connection string with URL-encoded password" -ForegroundColor Green
    
    # Validate local backup path
    $backupPath = Join-Path $PSScriptRoot "..\backups\$BackupName\moms_recipe_box"
    
    if (-not (Test-Path $backupPath)) {
        Write-Error "Local backup not found: $backupPath"
        exit 1
    }
    
    # Check for BSON files
    $bsonFiles = Get-ChildItem -Path $backupPath -Filter "*.bson" -File
    if ($bsonFiles.Count -eq 0) {
        Write-Error "No BSON files found in backup path"
        exit 1
    }
    
    Write-Host "Found $($bsonFiles.Count) BSON files to restore:" -ForegroundColor Cyan
    $bsonFiles | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
    
    # Confirm before proceeding
    if (-not $Force) {
        Write-Host ""
        Write-Host "WARNING: This will overwrite the existing Atlas database!" -ForegroundColor Yellow
        $confirmation = Read-Host "Continue? (y/n)"
        if ($confirmation -ne 'y') {
            Write-Host "Restore cancelled by user" -ForegroundColor Red
            exit 0
        }
    }
    
    # Execute restore
    Write-Host ""
    Write-Host "Starting MongoDB restore to Atlas..." -ForegroundColor Yellow
    Write-Host "Source: $backupPath" -ForegroundColor Gray
    
    $restoreResult = & mongorestore --uri="$connectionString" --drop "$backupPath" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Database restore completed successfully!" -ForegroundColor Green
        Write-Host "Atlas database now contains the restored data" -ForegroundColor Green
    } else {
        Write-Error "Database restore failed with exit code $LASTEXITCODE"
        Write-Host "Error output: $restoreResult" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Error "Error during restore process"
    Write-Error $_.Exception.Message
    exit 1
}