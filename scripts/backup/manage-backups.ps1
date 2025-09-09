# Master Backup Management Script for Mom's Recipe Box
# Orchestrates all backup operations and provides a unified interface

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("backup", "restore", "verify", "cleanup", "status", "setup", "test")]
    [string]$Operation,
    
    [Parameter(Mandatory=$false)]
    [string]$Type = "full",
    
    [Parameter(Mandatory=$false)]
    [string]$Path = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [switch]$Detailed
)

$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

# Script locations
$ScriptRoot = $PSScriptRoot
$BackupScript = Join-Path $ScriptRoot "backup-mongodb.ps1"
$RestoreScript = Join-Path $ScriptRoot "restore-mongodb.ps1"
$VerifyScript = Join-Path $ScriptRoot "verify-backup.ps1"
$CleanupScript = Join-Path $ScriptRoot "cleanup-backups.ps1"

function Write-ManagementLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [MANAGER] [$Level] $Message"
    Write-Host $logMessage
}

function Test-Prerequisites {
    Write-ManagementLog "Checking prerequisites..."
    
    # Check if Docker is running
    try {
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-ManagementLog "Docker is not running or not accessible" "ERROR"
            return $false
        }
    } catch {
        Write-ManagementLog "Docker is not available: $($_.Exception.Message)" "ERROR"
        return $false
    }
    
    # Check if MongoDB container is running
    try {
        $containerStatus = docker ps --filter "name=momsrecipebox-mongo" --format "{{.Status}}"
        if (!$containerStatus -or $containerStatus -notmatch "Up") {
            Write-ManagementLog "MongoDB container 'momsrecipebox-mongo' is not running" "ERROR"
            Write-ManagementLog "Please start the container: docker compose up -d mongo" "INFO"
            return $false
        }
    } catch {
        Write-ManagementLog "Failed to check container status: $($_.Exception.Message)" "ERROR"
        return $false
    }
    
    # Check script files exist
    $requiredScripts = @($BackupScript, $RestoreScript, $VerifyScript, $CleanupScript)
    foreach ($script in $requiredScripts) {
        if (!(Test-Path $script)) {
            Write-ManagementLog "Required script not found: $script" "ERROR"
            return $false
        }
    }
    
    Write-ManagementLog "Prerequisites check passed" "SUCCESS"
    return $true
}

function Invoke-BackupOperation {
    Write-ManagementLog "Starting backup operation: $Type"
    
    $params = @{
        Type = $Type
        Verify = $true
    }
    
    if ($Force) { $params.Force = $true }
    if ($Path) { $params.Destination = $Path }
    
    try {
        & $BackupScript @params
        return $LASTEXITCODE -eq 0
    } catch {
        Write-ManagementLog "Backup operation failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Invoke-RestoreOperation {
    if (!$Path) {
        Write-ManagementLog "Restore operation requires -Path parameter" "ERROR"
        return $false
    }
    
    Write-ManagementLog "Starting restore operation from: $Path"
    
    $params = @{
        BackupPath = $Path
    }
    
    if ($DryRun) { $params.DryRun = $true }
    if ($Force) { $params.Force = $true }
    
    try {
        & $RestoreScript @params
        return $LASTEXITCODE -eq 0
    } catch {
        Write-ManagementLog "Restore operation failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Invoke-VerifyOperation {
    Write-ManagementLog "Starting verification operation"
    
    $params = @{}
    
    if ($Path) { 
        $params.BackupPath = $Path 
    } else { 
        $params.CheckLast = 3 
    }
    
    if ($Detailed) { $params.Detailed = $true }
    
    try {
        & $VerifyScript @params
        return $LASTEXITCODE -eq 0
    } catch {
        Write-ManagementLog "Verification operation failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Invoke-CleanupOperation {
    Write-ManagementLog "Starting cleanup operation"
    
    $params = @{}
    
    if ($DryRun) { $params.DryRun = $true }
    if ($Force) { $params.Force = $true }
    
    try {
        & $CleanupScript @params
        return $LASTEXITCODE -eq 0
    } catch {
        Write-ManagementLog "Cleanup operation failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Show-BackupStatus {
    Write-ManagementLog "=== BACKUP SYSTEM STATUS ===" "INFO"
    
    # Load environment variables
    if (Test-Path ".env") {
        Get-Content ".env" | ForEach-Object {
            if ($_ -match "^([^#].*)=(.*)$") {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
    }
    
    $BackupRootPath = if ($env:BACKUP_ROOT_PATH) { $env:BACKUP_ROOT_PATH } else { "./backups" }
    
    # Database connection status
    try {
        docker exec momsrecipebox-mongo mongosh -u admin -p supersecret --authenticationDatabase admin --eval "db.adminCommand('ping')" --quiet > $null
        if ($LASTEXITCODE -eq 0) {
            Write-ManagementLog "✓ Database: Connected" "SUCCESS"
        } else {
            Write-ManagementLog "✗ Database: Connection failed" "ERROR"
        }
    } catch {
        Write-ManagementLog "✗ Database: Connection failed" "ERROR"
    }
    
    # Backup directory status
    if (Test-Path $BackupRootPath) {
        $totalSize = 0
        $backupCounts = @{ full = 0; incremental = 0; archive = 0; unknown = 0 }
        
        try {
            $allBackups = Get-ChildItem -Path $BackupRootPath -Recurse -ErrorAction SilentlyContinue | Where-Object {
                ($_.PSIsContainer -and ($_.Name -match "full_|incremental_|archive_")) -or
                ($_.Extension -eq ".zip" -and $_.Name -match "backup|full|incremental|archive")
            }
            
            foreach ($backup in $allBackups) {
                try {
                    if ($backup.PSIsContainer) {
                        $size = (Get-ChildItem -Path $backup.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                    } else {
                        $size = $backup.Length
                    }
                    $totalSize += $size
                    
                    # Determine type
                    if ($backup.Name -match "full") { $backupCounts.full++ }
                    elseif ($backup.Name -match "incremental") { $backupCounts.incremental++ }
                    elseif ($backup.Name -match "archive") { $backupCounts.archive++ }
                    else { $backupCounts.unknown++ }
                } catch {
                    Write-ManagementLog "Warning: Could not analyze backup $($backup.Name)" "WARNING"
                }
            }
            
            $totalSizeStr = if ($totalSize -gt 1GB) { 
                "$([math]::Round($totalSize/1GB, 2)) GB" 
            } elseif ($totalSize -gt 1MB) { 
                "$([math]::Round($totalSize/1MB, 2)) MB" 
            } else { 
                "$([math]::Round($totalSize/1KB, 1)) KB" 
            }
            
            Write-ManagementLog "✓ Backup Directory: $BackupRootPath ($totalSizeStr)" "SUCCESS"
            Write-ManagementLog "  - Full backups: $($backupCounts.full)"
            Write-ManagementLog "  - Incremental backups: $($backupCounts.incremental)"
            Write-ManagementLog "  - Archive backups: $($backupCounts.archive)"
            if ($backupCounts.unknown -gt 0) {
                Write-ManagementLog "  - Unknown backups: $($backupCounts.unknown)" "WARNING"
            }
        } catch {
            Write-ManagementLog "✗ Backup Directory: Error scanning directory" "ERROR"
        }
    } else {
        Write-ManagementLog "✗ Backup Directory: Not found ($BackupRootPath)" "ERROR"
    }
    
    # Last backup information
    if (Test-Path $BackupRootPath) {
        $lastBackupFile = Join-Path $BackupRootPath "last_backup.txt"
        if (Test-Path $lastBackupFile) {
            try {
                $lastBackupTime = Get-Content $lastBackupFile
                $lastBackupDate = [DateTime]::Parse($lastBackupTime)
                $timeSince = (Get-Date) - $lastBackupDate
                Write-ManagementLog "✓ Last Backup: $($timeSince.Days) days, $($timeSince.Hours) hours ago"
            } catch {
                Write-ManagementLog "⚠ Last Backup: Unable to parse timestamp" "WARNING"
            }
        } else {
            Write-ManagementLog "⚠ Last Backup: Unknown" "WARNING"
        }
    }
    
    # Scheduled tasks status
    try {
        $dailyTask = Get-ScheduledTask -TaskName "MomsRecipeBox-Daily-Backup" -ErrorAction SilentlyContinue
        $incrementalTask = Get-ScheduledTask -TaskName "MomsRecipeBox-Incremental-Backup" -ErrorAction SilentlyContinue
        
        if ($dailyTask) {
            Write-ManagementLog "✓ Scheduled Tasks: Daily backup configured ($($dailyTask.State))"
        } else {
            Write-ManagementLog "⚠ Scheduled Tasks: Daily backup not configured" "WARNING"
        }
        
        if ($incrementalTask) {
            Write-ManagementLog "✓ Scheduled Tasks: Incremental backup configured ($($incrementalTask.State))"
        } else {
            Write-ManagementLog "⚠ Scheduled Tasks: Incremental backup not configured" "WARNING"
        }
    } catch {
        Write-ManagementLog "⚠ Scheduled Tasks: Unable to check status" "WARNING"
    }
    
    Write-ManagementLog "==============================" "INFO"
}

function Invoke-SetupOperation {
    Write-ManagementLog "Setting up backup system..."
    
    try {
        & $BackupScript -Type "setup" -Force:$Force
        
        if ($LASTEXITCODE -eq 0) {
            Write-ManagementLog "Backup system setup completed successfully" "SUCCESS"
            Write-ManagementLog "You can now run: .\manage-backups.ps1 -Operation backup" "INFO"
            return $true
        } else {
            Write-ManagementLog "Backup system setup failed" "ERROR"
            return $false
        }
    } catch {
        Write-ManagementLog "Setup operation failed: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Invoke-TestOperation {
    Write-ManagementLog "Running backup system test..."
    
    $success = $true
    
    # Test 1: Create a test backup
    Write-ManagementLog "Test 1: Creating test backup..."
    try {
        $testBackupPath = "./backups/test-$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"
        & $BackupScript -Type "full" -Destination $testBackupPath -Verify $true
        
        if ($LASTEXITCODE -eq 0) {
            Write-ManagementLog "✓ Test backup created successfully" "SUCCESS"
        } else {
            Write-ManagementLog "✗ Test backup failed" "ERROR"
            $success = $false
        }
    } catch {
        Write-ManagementLog "✗ Test backup failed: $($_.Exception.Message)" "ERROR"
        $success = $false
    }
    
    # Test 2: Verify the backup
    if ($success -and $testBackupPath) {
        Write-ManagementLog "Test 2: Verifying test backup..."
        try {
            & $VerifyScript -BackupPath $testBackupPath
            
            if ($LASTEXITCODE -eq 0) {
                Write-ManagementLog "✓ Backup verification passed" "SUCCESS"
            } else {
                Write-ManagementLog "✗ Backup verification failed" "ERROR"
                $success = $false
            }
        } catch {
            Write-ManagementLog "✗ Backup verification failed: $($_.Exception.Message)" "ERROR"
            $success = $false
        }
    }
    
    # Test 3: Test restore (dry run)
    if ($success -and $testBackupPath) {
        Write-ManagementLog "Test 3: Testing restore (dry run)..."
        try {
            & $RestoreScript -BackupPath $testBackupPath -DryRun -DatabaseName "test_restore"
            
            if ($LASTEXITCODE -eq 0) {
                Write-ManagementLog "✓ Restore test passed" "SUCCESS"
            } else {
                Write-ManagementLog "✗ Restore test failed" "ERROR"
                $success = $false
            }
        } catch {
            Write-ManagementLog "✗ Restore test failed: $($_.Exception.Message)" "ERROR"
            $success = $false
        }
    }
    
    # Cleanup test backup
    if ($testBackupPath -and (Test-Path $testBackupPath)) {
        Write-ManagementLog "Cleaning up test backup..."
        Remove-Item -Path $testBackupPath -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    if ($success) {
        Write-ManagementLog "All backup system tests passed" "SUCCESS"
        return $true
    } else {
        Write-ManagementLog "Some backup system tests failed" "ERROR"
        return $false
    }
}

function Show-Usage {
    Write-Host @"

MongoDB Backup Management for Mom's Recipe Box
================================================

USAGE: .\manage-backups.ps1 -Operation <operation> [options]

OPERATIONS:
  setup     - Initial setup of backup system and scheduled tasks
  backup    - Create a backup (specify -Type: full, incremental, archive)
  restore   - Restore from backup (requires -Path)
  verify    - Verify backup integrity (optional -Path for specific backup)
  cleanup   - Remove old backups based on retention policies
  status    - Show backup system status and health
  test      - Run comprehensive backup system tests

COMMON OPTIONS:
  -Type <type>      Backup type: full, incremental, archive (for backup operation)
  -Path <path>      Backup path (for restore/verify operations)
  -DryRun          Preview operations without making changes
  -Force           Skip confirmation prompts and safety warnings
  -Detailed        Show detailed information (for verify/status operations)

EXAMPLES:
  .\manage-backups.ps1 -Operation setup
  .\manage-backups.ps1 -Operation backup -Type full
  .\manage-backups.ps1 -Operation backup -Type incremental
  .\manage-backups.ps1 -Operation restore -Path "./backups/2025-09-08/full_2025-09-08_14-30-00"
  .\manage-backups.ps1 -Operation verify -Path "./backups/latest"
  .\manage-backups.ps1 -Operation cleanup -DryRun
  .\manage-backups.ps1 -Operation status -Detailed
  .\manage-backups.ps1 -Operation test

ENVIRONMENT VARIABLES:
  Set in .env file or environment:
  - BACKUP_ROOT_PATH        Default backup location (default: ./backups)
  - BACKUP_RETENTION_DAYS   Retention period in days (default: 30)
  - BACKUP_COMPRESSION      Enable compression (default: true)
  - BACKUP_VERIFICATION     Enable verification (default: true)

For more information, see: scripts/backup/README.md

"@
}

# Main execution
Write-ManagementLog "Mom's Recipe Box Backup Manager" "INFO"

# Show usage if no operation specified
if (!$Operation) {
    Show-Usage
    exit 0
}

# Check prerequisites for operations that need them
if ($Operation -in @("backup", "restore", "verify", "test")) {
    if (!(Test-Prerequisites)) {
        Write-ManagementLog "Prerequisites check failed - cannot proceed" "ERROR"
        exit 1
    }
}

# Execute the requested operation
$result = switch ($Operation) {
    "backup"  { Invoke-BackupOperation }
    "restore" { Invoke-RestoreOperation }
    "verify"  { Invoke-VerifyOperation }
    "cleanup" { Invoke-CleanupOperation }
    "status"  { Show-BackupStatus; $true }
    "setup"   { Invoke-SetupOperation }
    "test"    { Invoke-TestOperation }
    default   { 
        Write-ManagementLog "Unknown operation: $Operation" "ERROR"
        Show-Usage
        $false
    }
}

# Exit with appropriate code
if ($result) {
    Write-ManagementLog "Operation '$Operation' completed successfully" "SUCCESS"
    exit 0
} else {
    Write-ManagementLog "Operation '$Operation' failed" "ERROR"
    exit 1
}
