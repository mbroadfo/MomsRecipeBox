# Simplified MongoDB Backup Management Script for Mom's Recipe Box
# Basic backup and restore operations

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("backup", "restore", "status", "setup")]
    [string]$Operation,
    
    [Parameter(Mandatory=$false)]
    [string]$Type = "full",
    
    [Parameter(Mandatory=$false)]
    [string]$Path = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [BACKUP] [$Level] $Message"
    Write-Host $logMessage
}

function Test-MongoConnection {
    Write-Log "Testing MongoDB connection..."
    
    try {
        docker exec momsrecipebox-mongo mongosh -u admin -p supersecret --authenticationDatabase admin --eval "db.adminCommand('ping')" --quiet 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "✓ MongoDB connection successful" "SUCCESS"
            return $true
        } else {
            Write-Log "✗ MongoDB connection failed" "ERROR"
            return $false
        }
    } catch {
        Write-Log "✗ MongoDB connection error: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function New-Backup {
    param([string]$BackupType = "full")
    
    Write-Log "Creating $BackupType backup..."
    
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupDir = ".\backups\$BackupType`_$timestamp"
    
    # Create backup directory
    if (!(Test-Path ".\backups")) {
        New-Item -ItemType Directory -Path ".\backups" -Force | Out-Null
    }
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    try {
        # Create mongodump
        Write-Log "Running mongodump..."
        
        docker exec momsrecipebox-mongo mongodump --host localhost:27017 --username admin --password supersecret --authenticationDatabase admin --db moms_recipe_box --out /tmp/backup
        
        if ($LASTEXITCODE -ne 0) {
            throw "mongodump failed"
        }
        
        # Copy backup from container
        Write-Log "Copying backup from container..."
        docker cp momsrecipebox-mongo:/tmp/backup/moms_recipe_box $backupDir
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to copy backup from container"
        }
        
        # Clean up container
        docker exec momsrecipebox-mongo rm -rf /tmp/backup
        
        # Create metadata
        $metadata = @{
            Type = $BackupType
            Timestamp = Get-Date -Format "o"
            Database = "moms_recipe_box"
            BackupPath = $backupDir
            Success = $true
        }
        $metadata | ConvertTo-Json | Out-File -FilePath "$backupDir\metadata.json" -Encoding UTF8
        
        Write-Log "✓ Backup created successfully: $backupDir" "SUCCESS"
        return $backupDir
        
    } catch {
        Write-Log "✗ Backup failed: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

function Restore-Backup {
    param([string]$BackupPath)
    
    if (!(Test-Path $BackupPath)) {
        Write-Log "✗ Backup path not found: $BackupPath" "ERROR"
        return $false
    }
    
    Write-Log "Restoring from backup: $BackupPath"
    
    if ($DryRun) {
        Write-Log "DRY RUN: Would restore from $BackupPath" "INFO"
        return $true
    }
    
    # Confirm unless forced
    if (!$Force) {
        $confirmation = Read-Host "This will replace existing data. Type 'YES' to continue"
        if ($confirmation -ne "YES") {
            Write-Log "Restore cancelled by user" "INFO"
            return $false
        }
    }
    
    try {
        # Copy backup to container
        Write-Log "Copying backup to container..."
        docker cp $BackupPath momsrecipebox-mongo:/tmp/restore_backup
        
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to copy backup to container"
        }
        
        # Restore using mongorestore
        Write-Log "Running mongorestore..."
        docker exec momsrecipebox-mongo mongorestore --host localhost:27017 --username admin --password supersecret --authenticationDatabase admin --db moms_recipe_box --drop /tmp/restore_backup
        
        if ($LASTEXITCODE -ne 0) {
            throw "mongorestore failed"
        }
        
        # Clean up
        docker exec momsrecipebox-mongo rm -rf /tmp/restore_backup
        
        Write-Log "✓ Restore completed successfully" "SUCCESS"
        return $true
        
    } catch {
        Write-Log "✗ Restore failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Show-Status {
    Write-Log "=== BACKUP SYSTEM STATUS ===" "INFO"
    
    # Test database connection
    Test-MongoConnection | Out-Null
    
    # Check backup directory
    if (Test-Path ".\backups") {
        $backups = Get-ChildItem -Path ".\backups" -Directory
        $totalSize = 0
        
        foreach ($backup in $backups) {
            $size = (Get-ChildItem -Path $backup.FullName -Recurse -File | Measure-Object -Property Length -Sum).Sum
            $totalSize += $size
        }
        
        $sizeStr = if ($totalSize -gt 1MB) { "$([math]::Round($totalSize/1MB, 2)) MB" } else { "$([math]::Round($totalSize/1KB, 1)) KB" }
        Write-Log "✓ Backup Directory: .\backups ($($backups.Count) backups, $sizeStr)" "SUCCESS"
        
        if ($backups.Count -gt 0) {
            Write-Log "Recent backups:"
            $backups | Sort-Object CreationTime -Descending | Select-Object -First 5 | ForEach-Object {
                Write-Log "  - $($_.Name) ($(Get-Date $_.CreationTime -Format 'yyyy-MM-dd HH:mm'))"
            }
        }
    } else {
        Write-Log "⚠ Backup Directory: Not found" "WARNING"
    }
    
    Write-Log "=========================" "INFO"
}

function Initialize-BackupSystem {
    Write-Log "Setting up backup system..."
    
    # Create backup directory
    if (!(Test-Path ".\backups")) {
        New-Item -ItemType Directory -Path ".\backups" -Force | Out-Null
        Write-Log "✓ Created backup directory: .\backups"
    }
    
    # Test database connection
    if (Test-MongoConnection) {
        Write-Log "✓ Database connection verified"
    } else {
        Write-Log "✗ Database connection failed - please ensure MongoDB container is running" "ERROR"
        return $false
    }
    
    # Create initial backup
    Write-Log "Creating initial backup..."
    $initialBackup = New-Backup -BackupType "setup"
    
    if ($initialBackup) {
        Write-Log "✓ Backup system setup completed successfully" "SUCCESS"
        Write-Log "Initial backup created at: $initialBackup"
        return $true
    } else {
        Write-Log "✗ Setup failed - could not create initial backup" "ERROR"
        return $false
    }
}

# Main execution
Write-Log "Mom's Recipe Box Backup Manager" "INFO"
Write-Log "Operation: $Operation"

# Check prerequisites (except for status)
if ($Operation -ne "status") {
    # Check if Docker is running
    try {
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Log "✗ Docker is not running or not accessible" "ERROR"
            exit 1
        }
    } catch {
        Write-Log "✗ Docker is not available" "ERROR"
        exit 1
    }
    
    # Check if MongoDB container is running
    $containerStatus = docker ps --filter "name=momsrecipebox-mongo" --format "{{.Status}}"
    if (!$containerStatus -or $containerStatus -notmatch "Up") {
        Write-Log "✗ MongoDB container 'momsrecipebox-mongo' is not running" "ERROR"
        Write-Log "Please start: docker compose up -d mongo" "INFO"
        exit 1
    }
}

# Execute operation
$success = switch ($Operation) {
    "backup" { 
        $result = New-Backup -BackupType $Type
        $null -ne $result
    }
    "restore" { 
        if (!$Path) {
            Write-Log "✗ Restore operation requires -Path parameter" "ERROR"
            $false
        } else {
            Restore-Backup -BackupPath $Path
        }
    }
    "status" { 
        Show-Status
        $true
    }
    "setup" { 
        Initialize-BackupSystem
    }
    default { 
        Write-Log "✗ Unknown operation: $Operation" "ERROR"
        $false
    }
}

# Exit with appropriate code
if ($success) {
    Write-Log "✓ Operation '$Operation' completed successfully" "SUCCESS"
    exit 0
} else {
    Write-Log "✗ Operation '$Operation' failed" "ERROR"
    exit 1
}
