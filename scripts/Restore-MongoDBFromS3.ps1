# Restore-MongoDBFromS3.ps1
# Script to restore MongoDB Atlas from an S3 backup
# Updated to use terraform-mrb AWS profile and handle BSON file backups

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupKey,
    
    [Parameter(Mandatory=$false)]
    [string]$BucketName = "mrb-mongodb-backups-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$TempPath = "$env:TEMP\mongodb_restore",
    
    [Parameter(Mandatory=$false)]
    [switch]$ListBackups,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [string]$AwsProfile = "terraform-mrb"
)

function Get-BackupList {
    param (
        [string]$BucketName,
        [string]$AwsProfile
    )
    
    try {
        Write-Host "📋 Listing available backups in S3 bucket: $BucketName (using profile: $AwsProfile)" -ForegroundColor Cyan
        
        # Set AWS profile environment variable
        $env:AWS_PROFILE = $AwsProfile
        
        # List backup directories (not individual files)
        $backups = aws s3 ls "s3://$BucketName/" --output text
        
        if (-not $backups) {
            Write-Warning "No backup directories found in the bucket"
            return @()
        }
        
        $backupList = @()
        $backups -split "`n" | ForEach-Object {
            $line = $_.Trim()
            if ($line -and $line.Contains("PRE ")) {
                # This is a directory/prefix
                $parts = $line -split "\s+", 4
                if ($parts.Count -ge 4 -and $parts[3].EndsWith("/")) {
                    $backupList += [PSCustomObject]@{
                        LastModified = $parts[0] + " " + $parts[1]
                        Type = "Directory"
                        Key = $parts[3].TrimEnd("/")
                    }
                }
            }
        }
        
        return $backupList
    }
    catch {
        Write-Error "Error listing backups: $_"
        exit 1
    }
}

function Get-LatestBackup {
    param (
        [string]$BucketName,
        [string]$AwsProfile
    )
    
    try {
        $backupList = Get-BackupList -BucketName $BucketName -AwsProfile $AwsProfile
        
        if ($backupList.Count -eq 0) {
            Write-Error "No backups found in bucket: $BucketName"
            exit 1
        }
        
        # Sort by LastModified descending and select the first one
        $latestBackup = $backupList | Sort-Object { [DateTime]::Parse($_.LastModified) } -Descending | Select-Object -First 1
        
        return $latestBackup
    }
    catch {
        Write-Error "Error getting latest backup: $_"
        exit 1
    }
}

function Get-BackupFiles {
    param (
        [string]$BucketName,
        [string]$BackupKey,
        [string]$TempPath,
        [string]$AwsProfile
    )
    
    $downloadPath = Join-Path $TempPath $BackupKey
    
    try {
        # Create the temp directory if it doesn't exist
        if (-not (Test-Path $TempPath)) {
            New-Item -ItemType Directory -Path $TempPath -Force | Out-Null
        }
        
        # Create backup-specific directory
        if (-not (Test-Path $downloadPath)) {
            New-Item -ItemType Directory -Path $downloadPath -Force | Out-Null
        }
        
        Write-Host "⬇️ Downloading backup files from S3: $BackupKey" -ForegroundColor Cyan
        
        # Set AWS profile environment variable
        $env:AWS_PROFILE = $AwsProfile
        
        # Download all files from the backup directory
        aws s3 cp "s3://$BucketName/$BackupKey/" $downloadPath --recursive
        
        if (-not (Get-ChildItem -Path $downloadPath -File)) {
            Write-Error "Failed to download backup files"
            exit 1
        }
        
        Write-Host "✅ Successfully downloaded backup files to: $downloadPath" -ForegroundColor Green
        return $downloadPath
    }
    catch {
        Write-Error "Error downloading backup files: $_"
        exit 1
    }
}

function Restore-MongoDB {
    param (
        [string]$BackupPath,
        [string]$AwsProfile
    )
    
    try {
        Write-Host "🔗 Getting MongoDB Atlas connection string from terraform..." -ForegroundColor Cyan
        
        # Set AWS profile environment variable
        $env:AWS_PROFILE = $AwsProfile
        
        # Get connection string from terraform output
        $currentLocation = Get-Location
        try {
            Set-Location (Join-Path $PSScriptRoot "..\infra")
            $connectionString = terraform output -raw mongodb_connection_string
            
            if (-not $connectionString -or $connectionString -eq "") {
                Write-Error "Failed to get MongoDB connection string from terraform output"
                exit 1
            }
            
            Write-Host "✅ Successfully retrieved connection string from terraform" -ForegroundColor Green
        }
        finally {
            Set-Location $currentLocation
        }
        
        # Validate backup path contains BSON files
        $bsonFiles = Get-ChildItem -Path $BackupPath -Filter "*.bson" -File
        if ($bsonFiles.Count -eq 0) {
            Write-Error "No BSON files found in backup path: $BackupPath"
            exit 1
        }
        
        Write-Host "� Found $($bsonFiles.Count) BSON files to restore" -ForegroundColor Cyan
        $bsonFiles | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
        
        # Confirm before proceeding with restore
        if (-not $Force) {
            Write-Host "`n⚠️  WARNING: This will overwrite the existing Atlas database!" -ForegroundColor Yellow
            Write-Host "   This will replace all data in the MongoDB Atlas cluster." -ForegroundColor Yellow
            $confirmation = Read-Host "`nAre you sure you want to continue? (y/n)"
            if ($confirmation -ne 'y') {
                Write-Host "Restore cancelled by user." -ForegroundColor Red
                exit 0
            }
        }
        
        Write-Host "`n🔄 Starting MongoDB restore to Atlas..." -ForegroundColor Yellow
        Write-Host "   Source: $BackupPath" -ForegroundColor Gray
        Write-Host "   Target: MongoDB Atlas (momsrecipebox database)" -ForegroundColor Gray
        
        # Execute mongorestore with --drop to replace existing data
        $restoreCmd = "mongorestore --uri=`"$connectionString`" --drop `"$BackupPath`""
        
        Write-Host "`n🔧 Running mongorestore..." -ForegroundColor Cyan
        $result = Invoke-Expression $restoreCmd
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Database restore completed successfully!" -ForegroundColor Green
            Write-Host "   Atlas database now contains the restored data from backup." -ForegroundColor Green
        } else {
            Write-Error "Database restore failed with exit code $LASTEXITCODE"
            Write-Host "Restore output: $result" -ForegroundColor Red
            exit 1
        }
    }
    catch {
        Write-Error "Error during database restore: $_"
        exit 1
    }
}

function Remove-TempFiles {
    param (
        [string]$TempPath
    )
    
    try {
        if (Test-Path $TempPath) {
            Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Cyan
            Remove-Item -Path $TempPath -Recurse -Force
            Write-Host "✅ Temporary files removed" -ForegroundColor Green
        }
    }
    catch {
        Write-Warning "Error cleaning up temporary files: $_"
        # Don't exit on cleanup failure
    }
}

# Main script execution
try {
    Write-Host "🚀 MongoDB Atlas Restore Script" -ForegroundColor Cyan
    Write-Host "   Using AWS Profile: $AwsProfile" -ForegroundColor Gray
    Write-Host "   S3 Bucket: $BucketName" -ForegroundColor Gray
    
    # If ListBackups is specified, just list the backups and exit
    if ($ListBackups) {
        $backups = Get-BackupList -BucketName $BucketName -AwsProfile $AwsProfile
        
        if ($backups.Count -eq 0) {
            Write-Host "No backups found in bucket: $BucketName" -ForegroundColor Yellow
            exit 0
        }
        
        Write-Host "`nAvailable MongoDB Backups in S3 Bucket: $BucketName`n" -ForegroundColor Cyan
        Write-Host "------------------------------------------------------------"
        $backups | Format-Table -Property @{Label="Date"; Expression={$_.LastModified}}, @{Label="Type"; Expression={$_.Type}}, @{Label="Backup Directory"; Expression={$_.Key}}
        
        Write-Host "`nTo restore a specific backup, run:" -ForegroundColor Yellow
        Write-Host ".\Restore-MongoDBFromS3.ps1 -BackupKey 'BACKUP_DIRECTORY_NAME'" -ForegroundColor Yellow
        Write-Host "Example: .\Restore-MongoDBFromS3.ps1 -BackupKey 'backup_2025-09-20_07-37-07'" -ForegroundColor Yellow
        Write-Host "------------------------------------------------------------`n"
        exit 0
    }
    
    # If no BackupKey specified, use the latest backup
    if (-not $BackupKey) {
        $latestBackup = Get-LatestBackup -BucketName $BucketName -AwsProfile $AwsProfile
        $BackupKey = $latestBackup.Key
        Write-Host "No backup key specified. Using the latest backup: $BackupKey" -ForegroundColor Yellow
    }
    
    # Download the backup files from S3
    $downloadPath = Get-BackupFiles -BucketName $BucketName -BackupKey $BackupKey -TempPath $TempPath -AwsProfile $AwsProfile
    
    # The backup is in moms_recipe_box subdirectory
    $actualBackupPath = Join-Path $downloadPath "moms_recipe_box"
    
    if (-not (Test-Path $actualBackupPath)) {
        Write-Error "Expected backup subdirectory not found: $actualBackupPath"
        exit 1
    }
    
    # Restore MongoDB from the downloaded backup
    Restore-MongoDB -BackupPath $actualBackupPath -AwsProfile $AwsProfile
    
    # Clean up temporary files
    Remove-TempFiles -TempPath $TempPath
    
    Write-Host ""
    Write-Host "MongoDB Atlas restore process completed successfully!" -ForegroundColor Green
    Write-Host "Your Atlas database now contains the restored recipe data." -ForegroundColor Green
}
catch {
    Write-Error "Error during restore process"
    Write-Error $_.Exception.Message
    exit 1
}