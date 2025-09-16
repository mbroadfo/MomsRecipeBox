# Restore-MongoDBFromS3.ps1
# Script to restore MongoDB Atlas from an S3 backup

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupKey,
    
    [Parameter(Mandatory=$false)]
    [string]$BucketName = "moms-recipe-box-backups",
    
    [Parameter(Mandatory=$false)]
    [string]$TempPath = "$env:TEMP\mongodb_restore",
    
    [Parameter(Mandatory=$false)]
    [switch]$ListBackups,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

function Get-BackupList {
    param (
        [string]$BucketName
    )
    
    try {
        Write-Host "📋 Listing available backups in S3 bucket: $BucketName" -ForegroundColor Cyan
        $backups = aws s3 ls "s3://$BucketName/" --output text
        
        if (-not $backups) {
            Write-Warning "No backup files found in the bucket"
            return @()
        }
        
        $backupList = @()
        $backups -split "`n" | ForEach-Object {
            $parts = $_ -split "\s+", 3
            if ($parts.Count -ge 3) {
                $backupList += [PSCustomObject]@{
                    LastModified = $parts[0] + " " + $parts[1]
                    Size = [long]$parts[2]
                    Key = $parts[3]
                    SizeMB = [math]::Round($parts[2] / 1MB, 2)
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
        [string]$BucketName
    )
    
    try {
        $backupList = Get-BackupList -BucketName $BucketName
        
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

function Get-BackupFile {
    param (
        [string]$BucketName,
        [string]$BackupKey,
        [string]$TempPath
    )
    
    $zipFilePath = Join-Path $TempPath (Split-Path $BackupKey -Leaf)
    
    try {
        # Create the temp directory if it doesn't exist
        if (-not (Test-Path $TempPath)) {
            New-Item -ItemType Directory -Path $TempPath -Force | Out-Null
        }
        
        Write-Host "⬇️ Downloading backup from S3: $BackupKey" -ForegroundColor Cyan
        aws s3 cp "s3://$BucketName/$BackupKey" $zipFilePath
        
        if (-not (Test-Path $zipFilePath)) {
            Write-Error "Failed to download backup file"
            exit 1
        }
        
        return $zipFilePath
    }
    catch {
        Write-Error "Error downloading backup file: $_"
        exit 1
    }
}

function Expand-BackupFile {
    param (
        [string]$ZipFilePath,
        [string]$TempPath
    )
    
    $extractPath = Join-Path $TempPath "extract"
    
    try {
        # Create the extract directory if it doesn't exist
        if (Test-Path $extractPath) {
            Remove-Item -Path $extractPath -Recurse -Force
        }
        
        New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
        
        Write-Host "📦 Extracting backup archive..." -ForegroundColor Cyan
        Expand-Archive -Path $ZipFilePath -DestinationPath $extractPath -Force
        
        return $extractPath
    }
    catch {
        Write-Error "Error extracting backup file: $_"
        exit 1
    }
}

function Restore-MongoDB {
    param (
        [string]$BackupPath
    )
    
    try {
        # Get MongoDB credentials from AWS Secrets Manager
        $scriptPath = $PSScriptRoot
        $backupScript = Join-Path $scriptPath "Test-MongoDBBackup.ps1"
        
        if (-not (Test-Path $backupScript)) {
            Write-Error "Required script not found: $backupScript"
            exit 1
        }
        
        # Get MongoDB connection info from the backup script
        . $backupScript -GetConnectionInfoOnly
        
        # Make sure we got the connection string
        if (-not $global:MongoConnectionInfo -or -not $global:MongoConnectionInfo.ConnectionString) {
            Write-Error "Failed to get MongoDB connection information"
            exit 1
        }
        
        # Extract the database name from the connection string
        $dbName = $global:MongoConnectionInfo.ConnectionString -split "/" | Select-Object -Last 1
        
        if (-not $dbName) {
            Write-Error "Could not determine database name from connection string"
            exit 1
        }
        
        # Find the dump directory
        $dumpPath = Get-ChildItem -Path $BackupPath -Filter "dump" -Directory | Select-Object -First 1 -ExpandProperty FullName
        
        if (-not $dumpPath) {
            Write-Error "Could not find 'dump' directory in the extracted backup"
            exit 1
        }
        
        Write-Host "🔄 Restoring MongoDB database: $dbName" -ForegroundColor Yellow
        
        # Confirm before proceeding with restore
        if (-not $Force) {
            $confirmation = Read-Host "WARNING: This will overwrite the existing database. Continue? (y/n)"
            if ($confirmation -ne 'y') {
                Write-Host "Restore cancelled by user." -ForegroundColor Red
                exit 0
            }
        }
        
        # Perform the restore using mongorestore
        $connectionUri = $global:MongoConnectionInfo.ConnectionString
        $username = $global:MongoConnectionInfo.Username
        $password = $global:MongoConnectionInfo.Password
        
        Write-Host "Running mongorestore command..." -ForegroundColor Cyan
        
        # Build mongorestore command
        $restoreCmd = "mongorestore --uri `"$connectionUri`" --username `"$username`" --password `"$password`" --drop $dumpPath"
        
        # Execute mongorestore
        Invoke-Expression $restoreCmd
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database restore completed successfully!" -ForegroundColor Green
        } else {
            Write-Error "Database restore failed with exit code $LASTEXITCODE"
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
    # If ListBackups is specified, just list the backups and exit
    if ($ListBackups) {
        $backups = Get-BackupList -BucketName $BucketName
        
        if ($backups.Count -eq 0) {
            Write-Host "No backups found in bucket: $BucketName" -ForegroundColor Yellow
            exit 0
        }
        
        Write-Host "`nAvailable MongoDB Backups in S3 Bucket: $BucketName`n" -ForegroundColor Cyan
        Write-Host "------------------------------------------------------------"
        $backups | Format-Table -Property @{Label="Date"; Expression={$_.LastModified}}, @{Label="Size (MB)"; Expression={$_.SizeMB}}, @{Label="Backup Key"; Expression={$_.Key}}
        
        Write-Host "`nTo restore a specific backup, run:" -ForegroundColor Yellow
        Write-Host ".\Restore-MongoDBFromS3.ps1 -BackupKey 'BACKUP_KEY_HERE'" -ForegroundColor Yellow
        Write-Host "------------------------------------------------------------`n"
        exit 0
    }
    
    # If no BackupKey specified, use the latest backup
    if (-not $BackupKey) {
        $latestBackup = Get-LatestBackup -BucketName $BucketName
        $BackupKey = $latestBackup.Key
        Write-Host "No backup key specified. Using the latest backup: $BackupKey" -ForegroundColor Yellow
    }
    
    # Download the backup file
    $zipFilePath = Get-BackupFile -BucketName $BucketName -BackupKey $BackupKey -TempPath $TempPath
    
    # Extract the backup
    $extractPath = Expand-BackupFile -ZipFilePath $zipFilePath -TempPath $TempPath
    
    # Restore MongoDB from the extracted backup
    Restore-MongoDB -BackupPath $extractPath
    
    # Clean up temporary files
    Remove-TempFiles -TempPath $TempPath
    
    Write-Host "`n✅ MongoDB restore process completed successfully!" -ForegroundColor Green
}
catch {
    Write-Error "Error during restore process: $_"
    exit 1
}