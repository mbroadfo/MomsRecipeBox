# MongoDB-Backup.ps1
# Consolidated script for MongoDB Atlas backup operations
# This script handles local backups, S3 backups, and maintenance operations

param(
    # Backup options
    [Parameter(Mandatory=$false)]
    [string]$Operation = "backup",  # Options: backup, restore, schedule, maintain
    
    [Parameter(Mandatory=$false)]
    [string]$BackupPath = ".\backups\mongodb_atlas",
    
    [Parameter(Mandatory=$false)]
    [string]$BackupName,  # Auto-generated if not provided
    
    # AWS/S3 options
    [Parameter(Mandatory=$false)]
    [string]$SecretName = "moms-recipe-secrets-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-west-2",
    
    [Parameter(Mandatory=$false)]
    [string]$S3Bucket = "mrb-mongodb-backups-dev",
    
    # Restore options
    [Parameter(Mandatory=$false)]
    [string]$BackupKey,  # For S3 restore operations
    
    [Parameter(Mandatory=$false)]
    [string]$TempPath = "$env:TEMP\mongodb_backup",
    
    # Schedule options
    [Parameter(Mandatory=$false)]
    [string]$TaskName = "MongoDBAtlasBackup",
    
    [Parameter(Mandatory=$false)]
    [string]$RunTime = "3:00am",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("Daily", "Weekly")]
    [string]$Frequency = "Daily",
    
    # General options
    [Parameter(Mandatory=$false)]
    [switch]$UseS3,
    
    [Parameter(Mandatory=$false)]
    [switch]$KeepLocalBackup,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [switch]$ListBackups
)

function Show-Banner {
    param (
        [string]$Title
    )
    
    Write-Host "
+----------------------------------------+
|                                        |
|        $Title        |
|                                        |
+----------------------------------------+
" -ForegroundColor Cyan
}

function Find-MongoDump {
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
    
    return $mongoDumpPath
}

function Get-MongoDBConnectionInfo {
    param (
        [string]$SecretName,
        [string]$Region
    )
    
    try {
        Write-Host "Getting MongoDB credentials from AWS Secrets Manager..." -ForegroundColor Gray
        $secretJson = aws secretsmanager get-secret-value --secret-id $SecretName --region $Region 2>$null | ConvertFrom-Json
        
        if ($secretJson) {
            $secrets = $secretJson.SecretString | ConvertFrom-Json
            $MongoUri = $secrets.MONGODB_URI
            
            # If MONGODB_URI is not present, try to build it from other fields
            if (-not $MongoUri -and $secrets.MONGODB_ATLAS_PASSWORD) {
                $host = $secrets.MONGODB_HOST
                $username = $secrets.MONGODB_USER
                $password = $secrets.MONGODB_ATLAS_PASSWORD
                $dbName = $secrets.MONGODB_DBNAME
                
                if ($host -and $username -and $password -and $dbName) {
                    $MongoUri = "mongodb+srv://$username:$password@$host/$dbName?retryWrites=true&w=majority"
                }
            }
        }
        
        if (-not $MongoUri) {
            Write-Error "MongoDB URI not found in AWS Secrets Manager (secret: $SecretName). Please check your secret configuration."
            exit 1
        }

        # Parse URI to extract username and password
        $username = ""
        $password = ""
        if ($MongoUri -match "mongodb\+srv:\/\/([^:]+):([^@]+)@") {
            $username = $matches[1]
            $password = $matches[2]
        }

        Write-Host "Successfully retrieved MongoDB connection details from AWS Secrets Manager" -ForegroundColor Green
        
        return @{
            ConnectionString = $MongoUri
            Username = $username
            Password = $password
        }
    }
    catch {
        Write-Error "Could not access AWS Secrets Manager: $($_.Exception.Message)"
        Write-Host "Ensure AWS CLI is installed and configured with appropriate permissions" -ForegroundColor Yellow
        exit 1
    }
}

function Backup-MongoDB {
    param (
        [string]$BackupPath,
        [string]$BackupName,
        [string]$MongoDumpPath,
        [hashtable]$ConnectionInfo
    )
    
    # Create timestamp for backup if not provided
    if (-not $BackupName) {
        $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
        $BackupName = "mongodb_backup_$timestamp"
    }
    
    $fullBackupPath = Join-Path $BackupPath $BackupName
    
    # Create backup directory if it doesn't exist
    if (-not (Test-Path $BackupPath)) {
        New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    }
    
    # Perform backup
    try {
        Write-Host "Backing up MongoDB Atlas database to $fullBackupPath..." -ForegroundColor Yellow
        
        # Use mongodump to create backup
        & $MongoDumpPath --uri="$($ConnectionInfo.ConnectionString)" --out="$fullBackupPath"
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "mongodump failed with exit code $LASTEXITCODE"
            exit $LASTEXITCODE
        }
        
        # Create backup info file
        $backupInfo = @{
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            source = "MongoDB Atlas"
            path = $fullBackupPath
        } | ConvertTo-Json -Depth 5
        
        Set-Content -Path (Join-Path $fullBackupPath "backup_info.json") -Value $backupInfo
        
        Write-Host "✅ MongoDB Atlas backup completed successfully to: $fullBackupPath" -ForegroundColor Green
        
        # List collections that were backed up
        $collectionFolders = Get-ChildItem -Path (Join-Path $fullBackupPath "momsrecipebox") -Directory -ErrorAction SilentlyContinue
        if ($collectionFolders) {
            Write-Host "`nBacked up collections:" -ForegroundColor Cyan
            
            foreach ($folder in $collectionFolders) {
                $collectionName = $folder.Name
                $bsonFiles = Get-ChildItem -Path $folder.FullName -Filter "*.bson"
                $documentCount = "unknown"
                $fileSize = $bsonFiles | Measure-Object -Property Length -Sum | Select-Object -ExpandProperty Sum
                
                if ($fileSize) {
                    $fileSizeFormatted = if ($fileSize -lt 1KB) {
                        "$fileSize B"
                    } elseif ($fileSize -lt 1MB) {
                        "{0:N2} KB" -f ($fileSize / 1KB)
                    } else {
                        "{0:N2} MB" -f ($fileSize / 1MB)
                    }
                    
                    Write-Host " - $collectionName ($fileSizeFormatted)" -ForegroundColor Gray
                }
            }
        }
        
        return @{
            Success = $true
            BackupPath = $fullBackupPath
            BackupName = $BackupName
        }
    } 
    catch {
        Write-Error "Backup failed: $_"
        exit 1
    }
}

function Backup-ToS3 {
    param (
        [string]$BackupPath,
        [string]$BackupName,
        [string]$S3Bucket,
        [switch]$KeepLocalBackup
    )
    
    $zipPath = "$BackupPath.zip"
    $s3Key = "backups/$BackupName.zip"
    
    # Check if AWS CLI is installed
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Error "AWS CLI is not installed. Please install it to use S3 functionality."
        exit 1
    }
    
    try {
        # Step 1: Compress the backup
        Write-Host "Compressing backup..." -ForegroundColor Yellow
        
        if (Test-Path $zipPath) {
            Remove-Item $zipPath -Force
        }
        
        Compress-Archive -Path $BackupPath -DestinationPath $zipPath -CompressionLevel Optimal
        Write-Host "Backup compressed to: $zipPath" -ForegroundColor Green
        
        # Step 2: Upload to S3
        Write-Host "Uploading to S3..." -ForegroundColor Yellow
        
        $s3Params = @()
        if ($Force) {
            $s3Params += "--force"
        }
        
        # Upload the zip file to S3
        aws s3 cp $zipPath "s3://$S3Bucket/$s3Key" $s3Params
        
        if ($LASTEXITCODE -ne 0) {
            throw "S3 upload failed with exit code $LASTEXITCODE"
        }
        
        Write-Host "Backup uploaded to S3: s3://$S3Bucket/$s3Key" -ForegroundColor Green
        
        # Step 3: Clean up local files if requested
        if (-not $KeepLocalBackup) {
            Write-Host "Cleaning up local files..." -ForegroundColor Yellow
            
            # Remove the backup directory
            if (Test-Path $BackupPath) {
                Remove-Item $BackupPath -Recurse -Force
            }
            
            # Remove the zip file
            if (Test-Path $zipPath) {
                Remove-Item $zipPath -Force
            }
            
            Write-Host "Local backup files removed" -ForegroundColor Green
        } else {
            Write-Host "Local backup files kept at: $BackupPath" -ForegroundColor Yellow
            Write-Host "Compressed backup file: $zipPath" -ForegroundColor Yellow
        }
        
        return $true
    }
    catch {
        Write-Error "S3 backup operation failed: $_"
        return $false
    }
}

function Get-S3BackupList {
    param (
        [string]$S3Bucket
    )
    
    try {
        Write-Host "📋 Listing available backups in S3 bucket: $S3Bucket" -ForegroundColor Cyan
        $backups = aws s3 ls "s3://$S3Bucket/" --output text
        
        if (-not $backups) {
            Write-Warning "No backup files found in the bucket"
            return @()
        }
        
        $backupList = @()
        $backups -split "`n" | ForEach-Object {
            $parts = $_ -split "\s+", 3
            if ($parts.Count -ge 3 -and $parts[3] -like "*.zip") {
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

function Restore-FromS3 {
    param (
        [string]$S3Bucket,
        [string]$BackupKey,
        [string]$TempPath,
        [hashtable]$ConnectionInfo,
        [switch]$Force
    )
    
    if (-not $BackupKey) {
        # Get the latest backup if none specified
        $backupList = Get-S3BackupList -S3Bucket $S3Bucket
        if ($backupList.Count -eq 0) {
            Write-Error "No backups found in bucket: $S3Bucket"
            exit 1
        }
        
        $latestBackup = $backupList | Sort-Object { [DateTime]::Parse($_.LastModified) } -Descending | Select-Object -First 1
        $BackupKey = $latestBackup.Key
        Write-Host "No backup key specified. Using the latest backup: $BackupKey" -ForegroundColor Yellow
    }
    
    $zipFilePath = Join-Path $TempPath (Split-Path $BackupKey -Leaf)
    
    try {
        # Create the temp directory if it doesn't exist
        if (-not (Test-Path $TempPath)) {
            New-Item -ItemType Directory -Path $TempPath -Force | Out-Null
        }
        
        # Step 1: Download the backup from S3
        Write-Host "⬇️ Downloading backup from S3: $BackupKey" -ForegroundColor Cyan
        aws s3 cp "s3://$S3Bucket/$BackupKey" $zipFilePath
        
        if (-not (Test-Path $zipFilePath)) {
            Write-Error "Failed to download backup file"
            exit 1
        }
        
        # Step 2: Extract the backup
        $extractPath = Join-Path $TempPath "extract"
        if (Test-Path $extractPath) {
            Remove-Item -Path $extractPath -Recurse -Force
        }
        
        New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
        Write-Host "📦 Extracting backup archive..." -ForegroundColor Cyan
        Expand-Archive -Path $zipFilePath -DestinationPath $extractPath -Force
        
        # Step 3: Restore MongoDB
        # Find the dump directory
        $dumpPath = Get-ChildItem -Path $extractPath -Filter "dump" -Directory | 
            Select-Object -First 1 -ExpandProperty FullName
        
        if (-not $dumpPath) {
            $dumpPath = $extractPath
        }
        
        # Extract the database name from the connection string
        $dbName = $ConnectionInfo.ConnectionString -split "/" | Select-Object -Last 1 -ErrorAction SilentlyContinue
        if ($dbName -match "\?") {
            $dbName = $dbName -split "\?" | Select-Object -First 1
        }
        
        if (-not $dbName) {
            Write-Error "Could not determine database name from connection string"
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
        
        # Find mongorestore
        $mongoDumpPath = Find-MongoDump
        $mongoRestorePath = $mongoDumpPath.Replace("mongodump.exe", "mongorestore.exe").Replace("mongodump", "mongorestore")
        
        # Perform the restore using mongorestore
        $connectionUri = $ConnectionInfo.ConnectionString
        $username = $ConnectionInfo.Username
        $password = $ConnectionInfo.Password
        
        Write-Host "Running mongorestore command..." -ForegroundColor Cyan
        
        # Build mongorestore command
        $restoreCmd = "& '$mongoRestorePath' --uri `"$connectionUri`" --drop `"$dumpPath`""
        
        # Execute mongorestore
        Invoke-Expression $restoreCmd
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database restore completed successfully!" -ForegroundColor Green
        } else {
            Write-Error "Database restore failed with exit code $LASTEXITCODE"
            exit 1
        }
        
        # Clean up temporary files
        if (Test-Path $TempPath) {
            Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Cyan
            Remove-Item -Path $zipFilePath -Force
            Remove-Item -Path $extractPath -Recurse -Force
            Write-Host "✅ Temporary files removed" -ForegroundColor Green
        }
        
        Write-Host "`n✅ MongoDB restore process completed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Error "Error during restore process: $_"
        exit 1
    }
}

function Register-BackupTask {
    param (
        [string]$TaskName,
        [string]$RunTime,
        [string]$Frequency,
        [string]$ScriptPath
    )
    
    # Set up the scheduled task
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -Operation backup -UseS3"
    $trigger = if ($Frequency -eq "Daily") {
        New-ScheduledTaskTrigger -Daily -At $RunTime
    } else {
        New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $RunTime
    }
    
    # Use Principal to run when user is logged in
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
    
    # Create the task with the configured settings
    try {
        Register-ScheduledTask -Action $action -Trigger $trigger -TaskName $TaskName -Description "MongoDB Atlas S3 Backup" -Principal $principal -Force
        Write-Host "✅ Scheduled task '$TaskName' registered successfully to run $Frequency at $RunTime" -ForegroundColor Green
        
        # Show the task details
        Get-ScheduledTask -TaskName $TaskName
        
        Write-Host "`nTo modify this task, use the Windows Task Scheduler or run this script again with different parameters." -ForegroundColor Yellow
    } catch {
        Write-Error "Failed to register scheduled task: $_"
        exit 1
    }
}

function Start-Maintenance {
    param (
        [string]$BackupPath,
        [switch]$SkipBackup,
        [switch]$UseS3,
        [switch]$KeepLocalBackup,
        [hashtable]$ConnectionInfo
    )
    
    Show-Banner "MONGODB ATLAS MAINTENANCE"
    
    # Track overall success
    $success = $true
    $startTime = Get-Date
    
    # Function to run a script and track its result
    function Invoke-MaintenanceTask {
        param (
            [string]$Title,
            [scriptblock]$ScriptBlock
        )
        
        Write-Host "`n[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] >> $Title" -ForegroundColor Cyan
        
        try {
            & $ScriptBlock
            if ($LASTEXITCODE -ne 0) {
                throw "Script exited with error code $LASTEXITCODE"
            }
            Write-Host "[SUCCESS] $Title completed successfully" -ForegroundColor Green
            return $true
        }
        catch {
            Write-Host "[ERROR] $Title failed: $_" -ForegroundColor Red
            return $false
        }
    }
    
    # Step 1: Create backup if not skipped
    if (-not $SkipBackup) {
        $mongoDumpPath = Find-MongoDump
        $backupSuccess = Invoke-MaintenanceTask -Title "Creating MongoDB Atlas backup" -ScriptBlock {
            # Create backup directly here
            $backupResult = Backup-MongoDB -BackupPath $BackupPath -MongoDumpPath $mongoDumpPath -ConnectionInfo $ConnectionInfo
            
            # Upload to S3 if requested
            if ($UseS3 -and $backupResult.Success) {
                $s3Success = Backup-ToS3 -BackupPath $backupResult.BackupPath -BackupName $backupResult.BackupName -S3Bucket $S3Bucket -KeepLocalBackup:$KeepLocalBackup
                if (-not $s3Success) {
                    throw "Failed to upload backup to S3"
                }
            }
        }
        
        $success = $success -and $backupSuccess
    }
    
    # Step 2: Check MongoDB Atlas disk usage
    $diskCheckSuccess = Invoke-MaintenanceTask -Title "Checking MongoDB Atlas disk usage" -ScriptBlock {
        # Add MongoDB Atlas disk usage check here
        # This is a placeholder for future implementation
        
        Write-Host "MongoDB Atlas M0 tier has a 512MB storage limit. Managing storage to stay within limits..." -ForegroundColor Yellow
        Write-Host "Storage metrics checking will be implemented in a future update" -ForegroundColor Yellow
        
        # Return success since this is just a placeholder
        return $true
    }
    
    $success = $success -and $diskCheckSuccess
    
    # Print summary
    $endTime = Get-Date
    $duration = $endTime - $startTime
    
    Write-Host "`n----------------------------------------"
    Write-Host "MAINTENANCE SUMMARY" -ForegroundColor Cyan
    Write-Host "----------------------------------------"
    Write-Host "Date/Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host "Duration: $($duration.ToString('hh\:mm\:ss'))"
    Write-Host "Status: $(if ($success) { "[SUCCESS]" } else { "[ERROR]" })" -ForegroundColor $(if ($success) { "Green" } else { "Red" })
    Write-Host "----------------------------------------`n"
    
    # Return success or failure
    return $success
}

# Main execution block
try {
    Set-StrictMode -Version Latest
    $ErrorActionPreference = "Stop"
    $global:MongoConnectionInfo = $null
    
    # Get connection info early
    $ConnectionInfo = Get-MongoDBConnectionInfo -SecretName $SecretName -Region $Region
    $global:MongoConnectionInfo = $ConnectionInfo
    
    # Process by operation
    switch ($Operation.ToLower()) {
        "backup" {
            Show-Banner "MONGODB ATLAS BACKUP"
            
            # Find MongoDB tools and perform backup
            $mongoDumpPath = Find-MongoDump
            $backupResult = Backup-MongoDB -BackupPath $BackupPath -BackupName $BackupName -MongoDumpPath $mongoDumpPath -ConnectionInfo $ConnectionInfo
            
            # Upload to S3 if requested
            if ($UseS3 -and $backupResult.Success) {
                Backup-ToS3 -BackupPath $backupResult.BackupPath -BackupName $backupResult.BackupName -S3Bucket $S3Bucket -KeepLocalBackup:$KeepLocalBackup
            }
            
            return $backupResult
        }
        
        "restore" {
            Show-Banner "MONGODB ATLAS RESTORE"
            
            # If ListBackups is specified, just list the backups and exit
            if ($ListBackups) {
                $backups = Get-S3BackupList -S3Bucket $S3Bucket
                
                if ($backups.Count -eq 0) {
                    Write-Host "No backups found in bucket: $S3Bucket" -ForegroundColor Yellow
                    exit 0
                }
                
                Write-Host "`nAvailable MongoDB Backups in S3 Bucket: $S3Bucket`n" -ForegroundColor Cyan
                Write-Host "------------------------------------------------------------"
                $backups | Format-Table -Property @{Label="Date"; Expression={$_.LastModified}}, @{Label="Size (MB)"; Expression={$_.SizeMB}}, @{Label="Backup Key"; Expression={$_.Key}}
                
                Write-Host "`nTo restore a specific backup, run:" -ForegroundColor Yellow
                Write-Host ".\MongoDB-Backup.ps1 -Operation restore -BackupKey 'BACKUP_KEY_HERE'" -ForegroundColor Yellow
                Write-Host "------------------------------------------------------------`n"
                exit 0
            }
            
            # Restore from S3
            Restore-FromS3 -S3Bucket $S3Bucket -BackupKey $BackupKey -TempPath $TempPath -ConnectionInfo $ConnectionInfo -Force:$Force
        }
        
        "schedule" {
            Show-Banner "MONGODB BACKUP SCHEDULER"
            
            # Schedule backup task
            Register-BackupTask -TaskName $TaskName -RunTime $RunTime -Frequency $Frequency -ScriptPath $PSCommandPath
        }
        
        "maintain" {
            # Run maintenance tasks
            Start-Maintenance -BackupPath $BackupPath -SkipBackup:$SkipBackup -UseS3:$UseS3 -KeepLocalBackup:$KeepLocalBackup -ConnectionInfo $ConnectionInfo
        }
        
        default {
            Write-Error "Invalid operation: $Operation. Valid operations are: backup, restore, schedule, maintain"
            exit 1
        }
    }
}
catch {
    Write-Error "An error occurred: $_"
    exit 1
}