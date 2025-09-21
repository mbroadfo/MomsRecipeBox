# MongoDB Backup Cleanup Script
# Removes old backups based on retention policies

param(
    [Parameter(Mandatory=$false)]
    [switch]$DryRun,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [int]$FullRetentionDays = 30,
    
    [Parameter(Mandatory=$false)]
    [int]$IncrementalRetentionDays = 7,
    
    [Parameter(Mandatory=$false)]
    [int]$ArchiveRetentionDays = 365
)

$ErrorActionPreference = "Stop"

# Load environment variables
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#].*)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

$BackupRootPath = if ($env:BACKUP_ROOT_PATH) { $env:BACKUP_ROOT_PATH } else { "./backups" }

function Write-CleanupLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
}

function Get-BackupAge {
    param([string]$BackupPath)
    
    # Try to extract timestamp from path or metadata
    $metadataPath = Join-Path $BackupPath "metadata.json"
    
    if (Test-Path $metadataPath) {
        try {
            $metadata = Get-Content $metadataPath | ConvertFrom-Json
            if ($metadata.Timestamp) {
                return [DateTime]::Parse($metadata.Timestamp)
            }
        } catch {
            # Fall back to file system dates
        }
    }
    
    # Extract from directory name
    if ($BackupPath -match "(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})") {
        try {
            return [DateTime]::ParseExact($matches[1], "yyyy-MM-dd_HH-mm-ss", $null)
        } catch {
            # Fall back to file system dates
        }
    }
    
    # Fall back to file creation time
    if (Test-Path $BackupPath) {
        return (Get-Item $BackupPath).CreationTime
    }
    
    return Get-Date
}

function Get-BackupType {
    param([string]$BackupPath)
    
    # Check metadata first
    $metadataPath = Join-Path $BackupPath "metadata.json"
    if (Test-Path $metadataPath) {
        try {
            $metadata = Get-Content $metadataPath | ConvertFrom-Json
            return $metadata.Type
        } catch {
            # Fall back to path analysis
        }
    }
    
    # Analyze path structure
    if ($BackupPath -match "archive") {
        return "archive"
    } elseif ($BackupPath -match "incremental") {
        return "incremental"
    } elseif ($BackupPath -match "full") {
        return "full"
    }
    
    # Check file contents
    if (Test-Path $BackupPath) {
        $bsonFiles = Get-ChildItem -Path $BackupPath -Filter "*.bson" -Recurse -ErrorAction SilentlyContinue
        if ($bsonFiles.Count -gt 0) {
            return "full"
        }
        
        $jsonFiles = Get-ChildItem -Path $BackupPath -Filter "*.json" -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "metadata.json" }
        if ($jsonFiles.Count -gt 0) {
            return "incremental"
        }
    }
    
    return "unknown"
}

function Get-BackupSize {
    param([string]$BackupPath)
    
    if (Test-Path $BackupPath) {
        if ((Get-Item $BackupPath).PSIsContainer) {
            return (Get-ChildItem -Path $BackupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
        } else {
            return (Get-Item $BackupPath).Length
        }
    }
    
    return 0
}

function Find-ExpiredBackups {
    Write-CleanupLog "Scanning for expired backups..."
    
    $expiredBackups = @()
    $now = Get-Date
    
    # Define retention periods
    $retentionPolicies = @{
        "full" = $FullRetentionDays
        "incremental" = $IncrementalRetentionDays
        "archive" = $ArchiveRetentionDays
    }
    
    # Find all backup directories and compressed files
    $allBackupItems = Get-ChildItem -Path $BackupRootPath -Recurse | Where-Object {
        ($_.PSIsContainer -and ($_.Name -match "full_|incremental_|archive_")) -or
        ($_.Extension -eq ".zip" -and $_.Name -match "backup|full|incremental|archive")
    }
    
    foreach ($item in $allBackupItems) {
        try {
            $backupAge = Get-BackupAge -BackupPath $item.FullName
            $backupType = Get-BackupType -BackupPath $item.FullName
            $backupSize = Get-BackupSize -BackupPath $item.FullName
            
            $ageInDays = ($now - $backupAge).TotalDays
            $retentionDays = $retentionPolicies[$backupType]
            
            if (!$retentionDays) {
                Write-CleanupLog "Unknown backup type '$backupType' for $($item.FullName), using default 30 days" "WARNING"
                $retentionDays = 30
            }
            
            if ($ageInDays -gt $retentionDays) {
                $expiredBackup = @{
                    Path = $item.FullName
                    Name = $item.Name
                    Type = $backupType
                    Age = $backupAge
                    AgeInDays = [math]::Round($ageInDays, 1)
                    Size = $backupSize
                    RetentionDays = $retentionDays
                    IsCompressed = $item.Extension -eq ".zip"
                    IsDirectory = $item.PSIsContainer
                }
                
                $expiredBackups += $expiredBackup
            }
        } catch {
            Write-CleanupLog "Error processing backup $($item.FullName): $($_.Exception.Message)" "WARNING"
        }
    }
    
    return $expiredBackups
}

function Remove-ExpiredBackup {
    param([object]$BackupInfo)
    
    try {
        if ($BackupInfo.IsDirectory) {
            Remove-Item -Path $BackupInfo.Path -Recurse -Force
        } else {
            Remove-Item -Path $BackupInfo.Path -Force
        }
        
        Write-CleanupLog "Removed: $($BackupInfo.Name)" "SUCCESS"
        return $true
    } catch {
        Write-CleanupLog "Failed to remove $($BackupInfo.Name): $($_.Exception.Message)" "ERROR"
        return $false
    }
}

function Show-CleanupSummary {
    param([array]$ExpiredBackups, [array]$RemovedBackups = @())
    
    Write-CleanupLog "=== BACKUP CLEANUP SUMMARY ===" "INFO"
    
    if ($ExpiredBackups.Count -eq 0) {
        Write-CleanupLog "No expired backups found" "SUCCESS"
        return
    }
    
    # Group by type
    $byType = $ExpiredBackups | Group-Object Type
    
    foreach ($group in $byType) {
        $totalSize = ($group.Group | Measure-Object -Property Size -Sum).Sum
        $sizeStr = if ($totalSize -gt 1GB) { 
            "$([math]::Round($totalSize/1GB, 2)) GB" 
        } elseif ($totalSize -gt 1MB) { 
            "$([math]::Round($totalSize/1MB, 2)) MB" 
        } else { 
            "$([math]::Round($totalSize/1KB, 1)) KB" 
        }
        
        Write-CleanupLog "$($group.Name.ToUpper()) backups: $($group.Count) expired ($sizeStr total)"
    }
    
    $totalExpired = $ExpiredBackups.Count
    $totalSize = ($ExpiredBackups | Measure-Object -Property Size -Sum).Sum
    $totalSizeStr = if ($totalSize -gt 1GB) { 
        "$([math]::Round($totalSize/1GB, 2)) GB" 
    } elseif ($totalSize -gt 1MB) { 
        "$([math]::Round($totalSize/1MB, 2)) MB" 
    } else { 
        "$([math]::Round($totalSize/1KB, 1)) KB" 
    }
    
    Write-CleanupLog "TOTAL: $totalExpired expired backups ($totalSizeStr)"
    
    if ($DryRun) {
        Write-CleanupLog "DRY RUN - No backups were actually removed" "INFO"
        
        Write-CleanupLog "Expired backups that would be removed:"
        foreach ($backup in $ExpiredBackups) {
            $sizeStr = if ($backup.Size -gt 1MB) { 
                "$([math]::Round($backup.Size/1MB, 2)) MB" 
            } else { 
                "$([math]::Round($backup.Size/1KB, 1)) KB" 
            }
            Write-CleanupLog "  - $($backup.Name) ($($backup.Type), $($backup.AgeInDays) days old, $sizeStr)"
        }
    } else {
        $removedCount = $RemovedBackups.Count
        $failedCount = $totalExpired - $removedCount
        
        Write-CleanupLog "Removed: $removedCount backups" $(if ($removedCount -eq $totalExpired) { "SUCCESS" } else { "WARNING" })
        if ($failedCount -gt 0) {
            Write-CleanupLog "Failed to remove: $failedCount backups" "ERROR"
        }
    }
    
    Write-CleanupLog "============================" "INFO"
}

function Test-CriticalBackups {
    param([array]$ExpiredBackups)
    
    Write-CleanupLog "Checking for critical backup retention..."
    
    # Ensure we're not removing ALL backups of a type
    $backupTypes = @("full", "incremental", "archive")
    $warnings = @()
    
    foreach ($type in $backupTypes) {
        $expiredOfType = $ExpiredBackups | Where-Object { $_.Type -eq $type }
        
        if ($expiredOfType.Count -gt 0) {
            # Count remaining backups of this type
            $allOfType = Get-ChildItem -Path $BackupRootPath -Recurse | Where-Object {
                ($_.PSIsContainer -and ($_.Name -match "$type`_")) -or
                ($_.Extension -eq ".zip" -and $_.Name -match $type)
            }
            
            $remainingOfType = $allOfType.Count - $expiredOfType.Count
            
            if ($remainingOfType -eq 0) {
                $warnings += "WARNING: All $type backups would be removed. Consider keeping at least one recent backup."
            } elseif ($remainingOfType -lt 2) {
                $warnings += "WARNING: Only $remainingOfType $type backup(s) would remain after cleanup."
            }
        }
    }
    
    if ($warnings.Count -gt 0) {
        Write-CleanupLog "SAFETY WARNINGS:" "WARNING"
        foreach ($warning in $warnings) {
            Write-CleanupLog "  $warning" "WARNING"
        }
        
        if (!$Force) {
            Write-CleanupLog "Use -Force to override safety warnings" "WARNING"
            return $false
        }
    }
    
    return $true
}

# Main execution
Write-CleanupLog "Starting backup cleanup..." "INFO"
Write-CleanupLog "Backup root path: $BackupRootPath"
Write-CleanupLog "Retention policies: Full=$FullRetentionDays days, Incremental=$IncrementalRetentionDays days, Archive=$ArchiveRetentionDays days"

if (!(Test-Path $BackupRootPath)) {
    Write-CleanupLog "Backup root path does not exist: $BackupRootPath" "ERROR"
    exit 1
}

# Find expired backups
$expiredBackups = Find-ExpiredBackups

if ($expiredBackups.Count -eq 0) {
    Write-CleanupLog "No expired backups found" "SUCCESS"
    exit 0
}

# Safety check
if (!(Test-CriticalBackups -ExpiredBackups $expiredBackups)) {
    Write-CleanupLog "Cleanup cancelled due to safety warnings" "WARNING"
    exit 1
}

# Show what would be cleaned up
Show-CleanupSummary -ExpiredBackups $expiredBackups

# Confirm if not dry run and not forced
if (!$DryRun -and !$Force) {
    $confirmation = Read-Host "Do you want to proceed with removing $($expiredBackups.Count) expired backup(s)? Type 'YES' to continue"
    if ($confirmation -ne "YES") {
        Write-CleanupLog "Cleanup cancelled by user" "INFO"
        exit 0
    }
}

# Perform cleanup if not dry run
$removedBackups = @()
if (!$DryRun) {
    Write-CleanupLog "Removing expired backups..."
    
    foreach ($backup in $expiredBackups) {
        if (Remove-ExpiredBackup -BackupInfo $backup) {
            $removedBackups += $backup
        }
    }
    
    # Show final summary
    Show-CleanupSummary -ExpiredBackups $expiredBackups -RemovedBackups $removedBackups
    
    if ($removedBackups.Count -eq $expiredBackups.Count) {
        Write-CleanupLog "Cleanup completed successfully" "SUCCESS"
        exit 0
    } else {
        Write-CleanupLog "Cleanup completed with some failures" "WARNING"
        exit 1
    }
} else {
    Write-CleanupLog "Dry run completed" "SUCCESS"
    exit 0
}
