# MongoDB Backup Script for Mom's Recipe Box
# Comprehensive backup solution with multiple backup types and verification

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("full", "incremental", "archive", "setup")]
    [string]$Type = "full",
    
    [Parameter(Mandatory=$false)]
    [string]$Destination = "",
    
    [Parameter(Mandatory=$false)]
    [bool]$Compress = $true,
    
    [Parameter(Mandatory=$false)]
    [bool]$Verify = $true,
    
    [Parameter(Mandatory=$false)]
    [bool]$CloudSync = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force
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
        Name = if ($env:MONGODB_DB_NAME) { $env:MONGODB_DB_NAME } else { "moms_recipe_box" }
        HostName = if ($env:MONGODB_HOST) { $env:MONGODB_HOST } else { "localhost" }
        Port = if ($env:MONGODB_PORT) { $env:MONGODB_PORT } else { "27017" }
        Username = if ($env:MONGODB_ROOT_USER) { $env:MONGODB_ROOT_USER } else { "admin" }
        Password = if ($env:MONGODB_ROOT_PASSWORD) { $env:MONGODB_ROOT_PASSWORD } else { "supersecret" }
        AuthSource = "admin"
        ContainerName = "momsrecipebox-mongo"
    }
    Backup = @{
        RootPath = if ($Destination) { $Destination } else { if ($env:BACKUP_ROOT_PATH) { $env:BACKUP_ROOT_PATH } else { "./backups" } }
        Compression = if ($env:BACKUP_COMPRESSION) { [bool]::Parse($env:BACKUP_COMPRESSION) } else { $Compress }
        Verification = if ($env:BACKUP_VERIFICATION) { [bool]::Parse($env:BACKUP_VERIFICATION) } else { $Verify }
        CloudSync = if ($env:BACKUP_CLOUD_SYNC) { [bool]::Parse($env:BACKUP_CLOUD_SYNC) } else { $CloudSync }
        RetentionDays = @{
            Full = 30
            Incremental = 7
            Archive = 365
        }
    }
}

# Ensure backup root directory exists
if (!(Test-Path $Config.Backup.RootPath)) {
    New-Item -ItemType Directory -Path $Config.Backup.RootPath -Force | Out-Null
}

function Write-BackupLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    
    # Also log to file
    $logFile = Join-Path $Config.Backup.RootPath "backup.log"
    $logMessage | Out-File -FilePath $logFile -Append -Encoding UTF8
}

function Test-MongoConnection {
    Write-BackupLog "Testing MongoDB connection..."
    
    try {
        $testCommand = @"
db.adminCommand('ping')
"@
        
        $testResult = docker exec $Config.Database.ContainerName mongosh `
            -u $Config.Database.Username `
            -p $Config.Database.Password `
            --authenticationDatabase $Config.Database.AuthSource `
            --eval $testCommand
            
        if ($LASTEXITCODE -eq 0) {
            Write-BackupLog "MongoDB connection successful"
            return $true
        } else {
            Write-BackupLog "MongoDB connection failed" "ERROR"
            return $false
        }
    } catch {
        Write-BackupLog "MongoDB connection error: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Get-DatabaseStats {
    Write-BackupLog "Gathering database statistics..."
    
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
    
    $result = docker exec $Config.Database.ContainerName mongosh `
        -u $Config.Database.Username `
        -p $Config.Database.Password `
        --authenticationDatabase $Config.Database.AuthSource `
        --eval $statsCommand
        
    return $result
}

function New-BackupDirectory {
    param([string]$BackupType)
    
    $timestamp = Get-Date -Format "yyyy-MM-dd"
    $timeDetailed = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    
    $backupDir = switch ($BackupType) {
        "full" { Join-Path $Config.Backup.RootPath "$timestamp\full_$timeDetailed" }
        "incremental" { Join-Path $Config.Backup.RootPath "$timestamp\incremental_$timeDetailed" }
        "archive" { Join-Path $Config.Backup.RootPath "archive\weekly_$timestamp" }
        default { Join-Path $Config.Backup.RootPath "$timestamp\$BackupType_$timeDetailed" }
    }
    
    if (!(Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    
    return $backupDir
}

function Invoke-FullBackup {
    Write-BackupLog "Starting full database backup..." "INFO"
    
    $backupDir = New-BackupDirectory -BackupType "full"
    $backupMetadata = @{
        Type = "full"
        Timestamp = Get-Date -Format "o"
        Database = $Config.Database.Name
        BackupPath = $backupDir
        PreBackupStats = Get-DatabaseStats
    }
    
    try {
        # Create mongodump
        Write-BackupLog "Creating MongoDB dump..."
        
        $dumpCommand = @(
            "mongodump"
            "--host", "$($Config.Database.HostName):$($Config.Database.Port)"
            "--username", $Config.Database.Username
            "--password", $Config.Database.Password
            "--authenticationDatabase", $Config.Database.AuthSource
            "--db", $Config.Database.Name
            "--out", "/tmp/backup"
        )
        
        # Execute dump inside container
        $dockerCommand = @("docker", "exec", $Config.Database.ContainerName) + $dumpCommand
        $dumpResult = & $dockerCommand[0] $dockerCommand[1..($dockerCommand.Length-1)]
        
        if ($LASTEXITCODE -ne 0) {
            throw "mongodump failed with exit code $LASTEXITCODE"
        }
        
        # Copy backup from container to host
        Write-BackupLog "Copying backup from container..."
        docker cp "$($Config.Database.ContainerName):/tmp/backup/$($Config.Database.Name)" $backupDir
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to copy backup from container"
        }
        
        # Clean up container backup
        docker exec $Config.Database.ContainerName rm -rf /tmp/backup
        
        # Add metadata
        $backupMetadata.PostBackupStats = Get-DatabaseStats
        $backupMetadata.Success = $true
        $backupMetadata | ConvertTo-Json -Depth 10 | Out-File -FilePath (Join-Path $backupDir "metadata.json") -Encoding UTF8
        
        # Compress if requested
        if ($Config.Backup.Compression) {
            Write-BackupLog "Compressing backup..."
            $zipPath = "$backupDir.zip"
            Compress-Archive -Path $backupDir -DestinationPath $zipPath -Force
            Remove-Item -Path $backupDir -Recurse -Force
            $backupMetadata.CompressedPath = $zipPath
            $backupMetadata.CompressedSize = (Get-Item $zipPath).Length
        }
        
        Write-BackupLog "Full backup completed successfully: $backupDir" "SUCCESS"
        return @{ Success = $true; Path = $backupDir; Metadata = $backupMetadata }
        
    } catch {
        Write-BackupLog "Full backup failed: $($_.Exception.Message)" "ERROR"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Invoke-IncrementalBackup {
    Write-BackupLog "Starting incremental backup..." "INFO"
    
    # For incremental backups, we'll export each collection with oplog
    $backupDir = New-BackupDirectory -BackupType "incremental"
    $lastBackupTime = Get-LastBackupTime
    
    $backupMetadata = @{
        Type = "incremental"
        Timestamp = Get-Date -Format "o"
        LastBackupTime = $lastBackupTime
        Database = $Config.Database.Name
        BackupPath = $backupDir
    }
    
    try {
        # Get collections
        $collectionsCommand = @"
db = db.getSiblingDB('$($Config.Database.Name)');
printjson(db.getCollectionNames());
"@
        
        $collectionsResult = docker exec $Config.Database.ContainerName mongosh `
            -u $Config.Database.Username `
            -p $Config.Database.Password `
            --authenticationDatabase $Config.Database.AuthSource `
            --eval $collectionsCommand --quiet
            
        $collections = $collectionsResult | ConvertFrom-Json
        
        foreach ($collection in $collections) {
            Write-BackupLog "Backing up collection: $collection"
            
            # Export collection with query for recent changes
            $query = if ($lastBackupTime) { 
                "{\`$or: [{createdAt: {\`$gte: new Date('$lastBackupTime')}}, {updatedAt: {\`$gte: new Date('$lastBackupTime')}}]}"
            } else { 
                "{}" 
            }
            
            $exportCommand = @(
                "mongoexport"
                "--host", "$($Config.Database.HostName):$($Config.Database.Port)"
                "--username", $Config.Database.Username
                "--password", $Config.Database.Password
                "--authenticationDatabase", $Config.Database.AuthSource
                "--db", $Config.Database.Name
                "--collection", $collection
                "--query", $query
                "--out", "/tmp/backup_$collection.json"
            )
            
            docker exec $Config.Database.ContainerName @exportCommand
            docker cp "$($Config.Database.ContainerName):/tmp/backup_$collection.json" (Join-Path $backupDir "$collection.json")
            docker exec $Config.Database.ContainerName rm -f "/tmp/backup_$collection.json"
        }
        
        $backupMetadata.Collections = $collections
        $backupMetadata.Success = $true
        $backupMetadata | ConvertTo-Json -Depth 10 | Out-File -FilePath (Join-Path $backupDir "metadata.json") -Encoding UTF8
        
        # Update last backup time
        Set-LastBackupTime
        
        Write-BackupLog "Incremental backup completed successfully: $backupDir" "SUCCESS"
        return @{ Success = $true; Path = $backupDir; Metadata = $backupMetadata }
        
    } catch {
        Write-BackupLog "Incremental backup failed: $($_.Exception.Message)" "ERROR"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Get-LastBackupTime {
    $lastBackupFile = Join-Path $Config.Backup.RootPath "last_backup.txt"
    if (Test-Path $lastBackupFile) {
        return Get-Content $lastBackupFile
    }
    return $null
}

function Set-LastBackupTime {
    $lastBackupFile = Join-Path $Config.Backup.RootPath "last_backup.txt"
    (Get-Date -Format "o") | Out-File $lastBackupFile -Encoding UTF8
}

function Invoke-ArchiveBackup {
    Write-BackupLog "Starting archive backup..." "INFO"
    
    # Archive backup is essentially a full backup with longer retention
    $result = Invoke-FullBackup
    if ($result.Success) {
        $result.Metadata.Type = "archive"
        $result.Metadata | ConvertTo-Json -Depth 10 | Out-File -FilePath (Join-Path $result.Path "metadata.json") -Encoding UTF8 -Force
    }
    
    return $result
}

function Test-BackupIntegrity {
    param([string]$BackupPath)
    
    Write-BackupLog "Verifying backup integrity: $BackupPath"
    
    try {
        # Check if metadata exists
        $metadataPath = Join-Path $BackupPath "metadata.json"
        if (!(Test-Path $metadataPath)) {
            Write-BackupLog "Metadata file not found" "WARNING"
            return $false
        }
        
        $metadata = Get-Content $metadataPath | ConvertFrom-Json
        
        # Verify backup directory structure
        if ($metadata.Type -eq "full") {
            # Check for BSON files
            $bsonFiles = Get-ChildItem -Path $BackupPath -Filter "*.bson" -Recurse
            if ($bsonFiles.Count -eq 0) {
                Write-BackupLog "No BSON files found in full backup" "WARNING"
                return $false
            }
        } elseif ($metadata.Type -eq "incremental") {
            # Check for JSON files
            $jsonFiles = Get-ChildItem -Path $BackupPath -Filter "*.json"
            if ($jsonFiles.Count -eq 0) {
                Write-BackupLog "No JSON files found in incremental backup" "WARNING"
                return $false
            }
        }
        
        Write-BackupLog "Backup integrity verification passed" "SUCCESS"
        return $true
        
    } catch {
        Write-BackupLog "Backup integrity verification failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Invoke-BackupSetup {
    Write-BackupLog "Setting up backup system..." "INFO"
    
    try {
        # Create backup directories
        $directories = @(
            $Config.Backup.RootPath,
            (Join-Path $Config.Backup.RootPath "archive"),
            (Join-Path $Config.Backup.RootPath "logs")
        )
        
        foreach ($dir in $directories) {
            if (!(Test-Path $dir)) {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
                Write-BackupLog "Created directory: $dir"
            }
        }
        
        # Create configuration file
        $configFile = Join-Path $Config.Backup.RootPath "backup-config.json"
        $Config | ConvertTo-Json -Depth 10 | Out-File -FilePath $configFile -Encoding UTF8
        Write-BackupLog "Created configuration file: $configFile"
        
        # Setup Windows scheduled tasks (optional)
        if ($Force -or (Read-Host "Setup automated scheduled tasks? (y/N)") -eq "y") {
            New-ScheduledTasks
        }
        
        Write-BackupLog "Backup setup completed successfully" "SUCCESS"
        
    } catch {
        Write-BackupLog "Backup setup failed: $($_.Exception.Message)" "ERROR"
    }
}

function New-ScheduledTasks {
    Write-BackupLog "Setting up scheduled tasks..."
    
    $scriptPath = $MyInvocation.MyCommand.Path
    $workingDir = Split-Path $scriptPath
    
    # Daily full backup at 2 AM
    $dailyAction = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-File `"$scriptPath`" -Type full" `
        -WorkingDirectory $workingDir
    $dailyTrigger = New-ScheduledTaskTrigger -Daily -At "2:00 AM"
    $dailySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    
    Register-ScheduledTask -TaskName "MomsRecipeBox-Daily-Backup" `
        -Action $dailyAction -Trigger $dailyTrigger -Settings $dailySettings `
        -Description "Daily full backup of Mom's Recipe Box database" -Force
    
    # Incremental backup every 4 hours
    $incrementalAction = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-File `"$scriptPath`" -Type incremental" `
        -WorkingDirectory $workingDir
    $incrementalTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 4)
    
    Register-ScheduledTask -TaskName "MomsRecipeBox-Incremental-Backup" `
        -Action $incrementalAction -Trigger $incrementalTrigger -Settings $dailySettings `
        -Description "Incremental backup of Mom's Recipe Box database every 4 hours" -Force
    
    Write-BackupLog "Scheduled tasks created successfully"
}

# Main execution
Write-BackupLog "Starting MongoDB backup process - Type: $Type" "INFO"

# Test MongoDB connection
if (!(Test-MongoConnection)) {
    Write-BackupLog "Cannot proceed - MongoDB connection failed" "ERROR"
    exit 1
}

# Execute backup based on type
$result = switch ($Type) {
    "full" { Invoke-FullBackup }
    "incremental" { Invoke-IncrementalBackup }
    "archive" { Invoke-ArchiveBackup }
    "setup" { Invoke-BackupSetup; @{ Success = $true } }
    default { 
        Write-BackupLog "Unknown backup type: $Type" "ERROR"
        @{ Success = $false; Error = "Unknown backup type" }
    }
}

# Verify backup if requested and backup was successful
if ($result.Success -and $Verify -and $Type -ne "setup") {
    if (!(Test-BackupIntegrity -BackupPath $result.Path)) {
        Write-BackupLog "Backup verification failed" "ERROR"
        exit 1
    }
}

# Cloud sync if enabled
if ($result.Success -and $Config.Backup.CloudSync -and $Type -ne "setup") {
    Write-BackupLog "Cloud sync not implemented yet" "WARNING"
}

if ($result.Success) {
    Write-BackupLog "Backup operation completed successfully" "SUCCESS"
    exit 0
} else {
    Write-BackupLog "Backup operation failed: $($result.Error)" "ERROR"
    exit 1
}
