# MongoDB Restore Script for Mom's Recipe Box
# Comprehensive restore solution with safety checks and verification

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    
    [Parameter(Mandatory=$false)]
    [string]$DatabaseName = "",
    
    [Parameter(Mandatory=$false)]
    [string[]]$Collections = @(),
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateBackupBeforeRestore
)

# Configuration
$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#].*)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

# Default configuration
$Config = @{
    Database = @{
        Name = if ($DatabaseName) { $DatabaseName } else { if ($env:MONGODB_DB_NAME) { $env:MONGODB_DB_NAME } else { "moms_recipe_box" } }
        HostName = if ($env:MONGODB_HOST) { $env:MONGODB_HOST } else { "localhost" }
        Port = if ($env:MONGODB_PORT) { $env:MONGODB_PORT } else { "27017" }
        Username = if ($env:MONGODB_ROOT_USER) { $env:MONGODB_ROOT_USER } else { "admin" }
        Password = if ($env:MONGODB_ROOT_PASSWORD) { $env:MONGODB_ROOT_PASSWORD } else { "supersecret" }
        AuthSource = "admin"
        ContainerName = "momsrecipebox-mongo"
    }
    Restore = @{
        BackupPath = $BackupPath
        Collections = $Collections
        DryRun = $DryRun
        Force = $Force
        CreateBackupBeforeRestore = $CreateBackupBeforeRestore
    }
}

function Write-RestoreLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    
    # Also log to file
    $logFile = "restore.log"
    $logMessage | Out-File -FilePath $logFile -Append -Encoding UTF8
}

function Test-MongoConnection {
    Write-RestoreLog "Testing MongoDB connection..."
    
    try {
        $testCommand = "db.adminCommand('ping')"
        
        docker exec $Config.Database.ContainerName mongosh `
            -u $Config.Database.Username `
            -p $Config.Database.Password `
            --authenticationDatabase $Config.Database.AuthSource `
            --eval $testCommand --quiet
            
        if ($LASTEXITCODE -eq 0) {
            Write-RestoreLog "MongoDB connection successful"
            return $true
        } else {
            Write-RestoreLog "MongoDB connection failed" "ERROR"
            return $false
        }
    } catch {
        Write-RestoreLog "MongoDB connection error: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Test-BackupPath {
    Write-RestoreLog "Validating backup path: $($Config.Restore.BackupPath)"
    
    if (!(Test-Path $Config.Restore.BackupPath)) {
        Write-RestoreLog "Backup path does not exist: $($Config.Restore.BackupPath)" "ERROR"
        return $false
    }
    
    # Check if it's a compressed backup
    if ($Config.Restore.BackupPath.EndsWith(".zip")) {
        Write-RestoreLog "Detected compressed backup"
        return Test-CompressedBackup
    }
    
    # Check for metadata file
    $metadataPath = Join-Path $Config.Restore.BackupPath "metadata.json"
    if (!(Test-Path $metadataPath)) {
        Write-RestoreLog "Metadata file not found - may be legacy backup" "WARNING"
    }
    
    return $true
}

function Test-CompressedBackup {
    Write-RestoreLog "Extracting compressed backup for analysis..."
    
    try {
        $tempExtractPath = Join-Path $env:TEMP "mrb_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Expand-Archive -Path $Config.Restore.BackupPath -DestinationPath $tempExtractPath -Force
        
        # Update backup path to extracted location
        $extractedBackupDir = Get-ChildItem -Path $tempExtractPath -Directory | Select-Object -First 1
        if ($extractedBackupDir) {
            $Config.Restore.BackupPath = $extractedBackupDir.FullName
            Write-RestoreLog "Using extracted backup path: $($Config.Restore.BackupPath)"
            return $true
        } else {
            Write-RestoreLog "Could not find backup directory in extracted archive" "ERROR"
            return $false
        }
    } catch {
        Write-RestoreLog "Failed to extract compressed backup: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Get-BackupMetadata {
    $metadataPath = Join-Path $Config.Restore.BackupPath "metadata.json"
    
    if (Test-Path $metadataPath) {
        try {
            $metadata = Get-Content $metadataPath | ConvertFrom-Json
            Write-RestoreLog "Backup metadata loaded successfully"
            return $metadata
        } catch {
            Write-RestoreLog "Failed to parse backup metadata: $($_.Exception.Message)" "WARNING"
            return $null
        }
    } else {
        Write-RestoreLog "No metadata file found - attempting to detect backup type" "WARNING"
        return Get-BackupType
    }
}

function Get-BackupType {
    # Try to detect backup type based on file structure
    $bsonFiles = Get-ChildItem -Path $Config.Restore.BackupPath -Filter "*.bson" -Recurse
    $jsonFiles = Get-ChildItem -Path $Config.Restore.BackupPath -Filter "*.json"
    
    if ($bsonFiles.Count -gt 0) {
        Write-RestoreLog "Detected full backup (BSON files found)"
        return @{ Type = "full"; DetectedType = $true }
    } elseif ($jsonFiles.Count -gt 0) {
        Write-RestoreLog "Detected incremental backup (JSON files found)"
        return @{ Type = "incremental"; DetectedType = $true }
    } else {
        Write-RestoreLog "Could not detect backup type" "ERROR"
        return $null
    }
}

function Get-CurrentDatabaseStats {
    Write-RestoreLog "Getting current database statistics..."
    
    $statsCommand = @"
db = db.getSiblingDB('$($Config.Database.Name)');
const stats = db.stats();
const collections = db.getCollectionNames();
let collectionStats = {};
collections.forEach(col => {
    collectionStats[col] = db[col].countDocuments();
});
printjson({
    dbStats: {
        collections: stats.collections,
        objects: stats.objects,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize
    },
    collectionCounts: collectionStats
});
"@
    
    try {
        $result = docker exec $Config.Database.ContainerName mongosh `
            -u $Config.Database.Username `
            -p $Config.Database.Password `
            --authenticationDatabase $Config.Database.AuthSource `
            --eval $statsCommand --quiet
            
        return $result | ConvertFrom-Json
    } catch {
        Write-RestoreLog "Failed to get database statistics: $($_.Exception.Message)" "WARNING"
        return $null
    }
}

function Invoke-PreRestoreBackup {
    if ($Config.Restore.CreateBackupBeforeRestore) {
        Write-RestoreLog "Creating pre-restore backup..."
        
        $preRestoreBackupScript = Join-Path $PSScriptRoot "backup-mongodb.ps1"
        $preRestoreBackupPath = "./backups/pre-restore-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"
        
        try {
            & $preRestoreBackupScript -Type "full" -Destination $preRestoreBackupPath -Verify $false
            Write-RestoreLog "Pre-restore backup created: $preRestoreBackupPath" "SUCCESS"
            return $preRestoreBackupPath
        } catch {
            Write-RestoreLog "Failed to create pre-restore backup: $($_.Exception.Message)" "ERROR"
            if (!$Config.Restore.Force) {
                throw "Pre-restore backup failed and Force not specified"
            }
            return $null
        }
    }
    return $null
}

function Invoke-FullRestore {
    param([object]$Metadata)
    
    Write-RestoreLog "Starting full database restore..."
    
    try {
        # Copy backup to container
        $containerBackupPath = "/tmp/restore_backup"
        docker exec $Config.Database.ContainerName rm -rf $containerBackupPath
        docker cp $Config.Restore.BackupPath $Config.Database.ContainerName:$containerBackupPath
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to copy backup to container"
        }
        
        # Determine database path in backup
        $dbBackupPath = "$containerBackupPath/$($Config.Database.Name)"
        
        # Check if database directory exists in backup
        $checkDbCommand = "[ -d '$dbBackupPath' ] && echo 'exists' || echo 'notfound'"
        $dbCheckResult = docker exec $Config.Database.ContainerName sh -c $checkDbCommand
        
        if ($dbCheckResult.Trim() -eq 'notfound') {
            # Try to find any database directory
            $findDbCommand = "find $containerBackupPath -name '*.bson' | head -1 | xargs dirname"
            $foundDbPath = docker exec $Config.Database.ContainerName sh -c $findDbCommand
            if ($foundDbPath) {
                $dbBackupPath = $foundDbPath.Trim()
                Write-RestoreLog "Using discovered database path: $dbBackupPath"
            } else {
                throw "Could not find database files in backup"
            }
        }
        
        if ($Config.Restore.DryRun) {
            Write-RestoreLog "DRY RUN: Would restore from $dbBackupPath to database $($Config.Database.Name)" "INFO"
            
            # Show what would be restored
            $listCommand = "find $dbBackupPath -name '*.bson' | sed 's/.*\///g' | sed 's/\.bson$//g'"
            $collections = docker exec $Config.Database.ContainerName sh -c $listCommand
            Write-RestoreLog "Collections that would be restored:"
            $collections -split "`n" | ForEach-Object { Write-RestoreLog "  - $_" }
            
            return @{ Success = $true; DryRun = $true }
        }
        
        # Perform the restore
        $restoreCommand = @(
            "mongorestore"
            "--host", "$($Config.Database.HostName):$($Config.Database.Port)"
            "--username", $Config.Database.Username
            "--password", $Config.Database.Password
            "--authenticationDatabase", $Config.Database.AuthSource
            "--db", $Config.Database.Name
            "--drop"  # Drop existing collections before restore
        )
        
        # Add collection filter if specified
        if ($Config.Restore.Collections.Count -gt 0) {
            foreach ($collection in $Config.Restore.Collections) {
                $restoreCommand += "--collection", $collection
            }
        }
        
        $restoreCommand += $dbBackupPath
        
        # Execute restore
        docker exec $Config.Database.ContainerName @restoreCommand
        
        if ($LASTEXITCODE -ne 0) {
            throw "mongorestore failed with exit code $LASTEXITCODE"
        }
        
        # Clean up container backup
        docker exec $Config.Database.ContainerName rm -rf $containerBackupPath
        
        Write-RestoreLog "Full restore completed successfully" "SUCCESS"
        return @{ Success = $true }
        
    } catch {
        Write-RestoreLog "Full restore failed: $($_.Exception.Message)" "ERROR"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Invoke-IncrementalRestore {
    param([object]$Metadata)
    
    Write-RestoreLog "Starting incremental restore..."
    
    try {
        $jsonFiles = Get-ChildItem -Path $Config.Restore.BackupPath -Filter "*.json"
        
        if ($jsonFiles.Count -eq 0) {
            throw "No JSON files found for incremental restore"
        }
        
        foreach ($jsonFile in $jsonFiles) {
            $collectionName = [System.IO.Path]::GetFileNameWithoutExtension($jsonFile.Name)
            
            # Skip if specific collections requested and this isn't one of them
            if ($Config.Restore.Collections.Count -gt 0 -and $collectionName -notin $Config.Restore.Collections) {
                Write-RestoreLog "Skipping collection $collectionName (not in requested collections)"
                continue
            }
            
            if ($Config.Restore.DryRun) {
                Write-RestoreLog "DRY RUN: Would restore collection $collectionName from $($jsonFile.Name)" "INFO"
                continue
            }
            
            Write-RestoreLog "Restoring collection: $collectionName"
            
            # Copy JSON file to container
            $containerJsonPath = "/tmp/restore_$collectionName.json"
            docker cp $jsonFile.FullName "$($Config.Database.ContainerName):$containerJsonPath"
            
            # Import the collection
            $importCommand = @(
                "mongoimport"
                "--host", "$($Config.Database.HostName):$($Config.Database.Port)"
                "--username", $Config.Database.Username
                "--password", $Config.Database.Password
                "--authenticationDatabase", $Config.Database.AuthSource
                "--db", $Config.Database.Name
                "--collection", $collectionName
                "--file", $containerJsonPath
                "--upsert"  # Update existing documents, insert new ones
            )
            
            docker exec $Config.Database.ContainerName @importCommand
            
            if ($LASTEXITCODE -ne 0) {
                Write-RestoreLog "Failed to import collection $collectionName" "ERROR"
            } else {
                Write-RestoreLog "Successfully imported collection $collectionName" "SUCCESS"
            }
            
            # Clean up
            docker exec $Config.Database.ContainerName rm -f $containerJsonPath
        }
        
        if ($Config.Restore.DryRun) {
            return @{ Success = $true; DryRun = $true }
        }
        
        Write-RestoreLog "Incremental restore completed" "SUCCESS"
        return @{ Success = $true }
        
    } catch {
        Write-RestoreLog "Incremental restore failed: $($_.Exception.Message)" "ERROR"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Test-RestoreIntegrity {
    param([object]$PreRestoreStats, [object]$Metadata)
    
    Write-RestoreLog "Verifying restore integrity..."
    
    try {
        $postRestoreStats = Get-CurrentDatabaseStats
        
        if ($postRestoreStats) {
            Write-RestoreLog "Post-restore statistics:"
            Write-RestoreLog "  Collections: $($postRestoreStats.dbStats.collections)"
            Write-RestoreLog "  Objects: $($postRestoreStats.dbStats.objects)"
            Write-RestoreLog "  Data Size: $($postRestoreStats.dbStats.dataSize) bytes"
            
            foreach ($collection in $postRestoreStats.collectionCounts.PSObject.Properties) {
                Write-RestoreLog "  $($collection.Name): $($collection.Value) documents"
            }
        }
        
        # Basic verification - check that we have some data
        if ($postRestoreStats.dbStats.objects -gt 0) {
            Write-RestoreLog "Restore integrity verification passed" "SUCCESS"
            return $true
        } else {
            Write-RestoreLog "Restore integrity verification failed - no objects in database" "ERROR"
            return $false
        }
        
    } catch {
        Write-RestoreLog "Restore integrity verification failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Show-RestorePreview {
    param([object]$Metadata, [object]$CurrentStats)
    
    Write-RestoreLog "=== RESTORE PREVIEW ===" "INFO"
    Write-RestoreLog "Backup Path: $($Config.Restore.BackupPath)"
    Write-RestoreLog "Target Database: $($Config.Database.Name)"
    
    if ($Metadata) {
        Write-RestoreLog "Backup Type: $($Metadata.Type)"
        Write-RestoreLog "Backup Date: $($Metadata.Timestamp)"
        if ($Metadata.PreBackupStats) {
            Write-RestoreLog "Backup Contents: $($Metadata.PreBackupStats.dbStats.objects) objects in $($Metadata.PreBackupStats.dbStats.collections) collections"
        }
    }
    
    if ($CurrentStats) {
        Write-RestoreLog "Current Database: $($CurrentStats.dbStats.objects) objects in $($CurrentStats.dbStats.collections) collections"
    }
    
    if ($Config.Restore.Collections.Count -gt 0) {
        Write-RestoreLog "Collections to restore: $($Config.Restore.Collections -join ', ')"
    } else {
        Write-RestoreLog "Collections to restore: ALL"
    }
    
    Write-RestoreLog "========================" "INFO"
}

# Main execution
Write-RestoreLog "Starting MongoDB restore process" "INFO"
Write-RestoreLog "Backup Path: $($Config.Restore.BackupPath)"
Write-RestoreLog "Target Database: $($Config.Database.Name)"

# Validate prerequisites
if (!(Test-MongoConnection)) {
    Write-RestoreLog "Cannot proceed - MongoDB connection failed" "ERROR"
    exit 1
}

if (!(Test-BackupPath)) {
    Write-RestoreLog "Cannot proceed - Backup path validation failed" "ERROR"
    exit 1
}

# Get backup metadata and current database stats
$metadata = Get-BackupMetadata
$currentStats = Get-CurrentDatabaseStats

# Show preview
Show-RestorePreview -Metadata $metadata -CurrentStats $currentStats

# Confirm restore unless Force is specified
if (!$Config.Restore.Force -and !$Config.Restore.DryRun) {
    $confirmation = Read-Host "Do you want to proceed with the restore? This will modify/replace existing data. Type 'YES' to continue"
    if ($confirmation -ne "YES") {
        Write-RestoreLog "Restore cancelled by user" "INFO"
        exit 0
    }
}

# Create pre-restore backup if requested
$preRestoreBackupPath = Invoke-PreRestoreBackup

# Perform restore based on backup type
$result = if ($metadata.Type -eq "full" -or $metadata.Type -eq "archive") {
    Invoke-FullRestore -Metadata $metadata
} elseif ($metadata.Type -eq "incremental") {
    Invoke-IncrementalRestore -Metadata $metadata
} else {
    Write-RestoreLog "Unknown backup type: $($metadata.Type)" "ERROR"
    @{ Success = $false; Error = "Unknown backup type" }
}

# Verify restore if successful and not a dry run
if ($result.Success -and !$result.DryRun) {
    if (!(Test-RestoreIntegrity -PreRestoreStats $currentStats -Metadata $metadata)) {
        Write-RestoreLog "Restore verification failed" "ERROR"
        
        if ($preRestoreBackupPath) {
            Write-RestoreLog "Consider restoring from pre-restore backup: $preRestoreBackupPath" "INFO"
        }
        
        exit 1
    }
}

if ($result.Success) {
    if ($result.DryRun) {
        Write-RestoreLog "Restore dry run completed successfully" "SUCCESS"
    } else {
        Write-RestoreLog "Restore operation completed successfully" "SUCCESS"
        if ($preRestoreBackupPath) {
            Write-RestoreLog "Pre-restore backup available at: $preRestoreBackupPath" "INFO"
        }
    }
    exit 0
} else {
    Write-RestoreLog "Restore operation failed: $($result.Error)" "ERROR"
    exit 1
}
