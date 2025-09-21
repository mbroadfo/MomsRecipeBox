# MongoDB Backup Verification Script
# Validates backup integrity and completeness

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupPath = "",
    
    [Parameter(Mandatory=$false)]
    [int]$CheckLast = 1,
    
    [Parameter(Mandatory=$false)]
    [switch]$Detailed
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

function Write-VerifyLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
}

function Test-SingleBackup {
    param([string]$Path)
    
    Write-VerifyLog "Verifying backup: $Path"
    
    $results = @{
        Path = $Path
        Valid = $false
        Type = "unknown"
        Timestamp = $null
        Size = 0
        Collections = @()
        Issues = @()
    }
    
    try {
        # Check if path exists
        if (!(Test-Path $Path)) {
            $results.Issues += "Path does not exist"
            return $results
        }
        
        # Handle compressed backups
        if ($Path.EndsWith(".zip")) {
            $results.Type = "compressed"
            $results.Size = (Get-Item $Path).Length
            
            # Extract to temp location for analysis
            $tempPath = Join-Path $env:TEMP "backup_verify_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
            try {
                Expand-Archive -Path $Path -DestinationPath $tempPath -Force
                $extractedDir = Get-ChildItem -Path $tempPath -Directory | Select-Object -First 1
                if ($extractedDir) {
                    $Path = $extractedDir.FullName
                } else {
                    $results.Issues += "Could not find extracted backup directory"
                    return $results
                }
            } catch {
                $results.Issues += "Failed to extract compressed backup: $($_.Exception.Message)"
                return $results
            }
        }
        
        # Check for metadata file
        $metadataPath = Join-Path $Path "metadata.json"
        if (Test-Path $metadataPath) {
            try {
                $metadata = Get-Content $metadataPath | ConvertFrom-Json
                $results.Type = $metadata.Type
                $results.Timestamp = $metadata.Timestamp
                
                if ($metadata.PreBackupStats -and $metadata.PreBackupStats.collectionCounts) {
                    $results.Collections = $metadata.PreBackupStats.collectionCounts.PSObject.Properties.Name
                }
            } catch {
                $results.Issues += "Failed to parse metadata: $($_.Exception.Message)"
            }
        } else {
            $results.Issues += "No metadata file found"
        }
        
        # Check backup content based on type
        if ($results.Type -eq "full" -or $results.Type -eq "archive") {
            # Look for BSON files
            $bsonFiles = Get-ChildItem -Path $Path -Filter "*.bson" -Recurse
            if ($bsonFiles.Count -eq 0) {
                $results.Issues += "No BSON files found for full backup"
            } else {
                $results.Collections = $bsonFiles | ForEach-Object { 
                    [System.IO.Path]::GetFileNameWithoutExtension($_.Name) 
                } | Sort-Object -Unique
                
                # Calculate total size
                $results.Size = ($bsonFiles | Measure-Object -Property Length -Sum).Sum
            }
            
            # Check for corresponding metadata files
            $metadataFiles = Get-ChildItem -Path $Path -Filter "*.metadata.json" -Recurse
            if ($metadataFiles.Count -ne $bsonFiles.Count) {
                $results.Issues += "Metadata files count mismatch with BSON files"
            }
            
        } elseif ($results.Type -eq "incremental") {
            # Look for JSON files
            $jsonFiles = Get-ChildItem -Path $Path -Filter "*.json" | Where-Object { $_.Name -ne "metadata.json" }
            if ($jsonFiles.Count -eq 0) {
                $results.Issues += "No collection JSON files found for incremental backup"
            } else {
                $results.Collections = $jsonFiles | ForEach-Object { 
                    [System.IO.Path]::GetFileNameWithoutExtension($_.Name) 
                }
                
                # Calculate total size
                $results.Size = ($jsonFiles | Measure-Object -Property Length -Sum).Sum
            }
        }
        
        # Check if collections look reasonable
        $expectedCollections = @("recipes", "favorites", "comments", "shopping_lists", "users")
        $missingCollections = $expectedCollections | Where-Object { $_ -notin $results.Collections }
        if ($missingCollections.Count -gt 0) {
            $results.Issues += "Missing expected collections: $($missingCollections -join ', ')"
        }
        
        # Mark as valid if no critical issues
        $results.Valid = $results.Issues.Count -eq 0 -or ($results.Issues | Where-Object { $_ -notmatch "metadata|expected collections" }).Count -eq 0
        
        # Clean up temp directory if we created one
        if ($results.Type -eq "compressed" -and $tempPath -and (Test-Path $tempPath)) {
            Remove-Item -Path $tempPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        
    } catch {
        $results.Issues += "Verification failed: $($_.Exception.Message)"
    }
    
    return $results
}

function Get-RecentBackups {
    param([int]$Count)
    
    Write-VerifyLog "Finding $Count most recent backups..."
    
    $allBackups = @()
    
    # Get all backup directories and compressed files
    $backupItems = Get-ChildItem -Path $BackupRootPath -Recurse | Where-Object {
        ($_.PSIsContainer -and ($_.Name -match "full_|incremental_|archive_")) -or
        ($_.Extension -eq ".zip" -and $_.Name -match "backup|full|incremental|archive")
    }
    
    foreach ($item in $backupItems) {
        $backupInfo = @{
            Path = $item.FullName
            Name = $item.Name
            CreationTime = $item.CreationTime
            LastWriteTime = $item.LastWriteTime
            IsCompressed = $item.Extension -eq ".zip"
        }
        
        # Try to extract timestamp from name or metadata
        if ($item.Name -match "(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})") {
            $backupInfo.Timestamp = [DateTime]::ParseExact($matches[1], "yyyy-MM-dd_HH-mm-ss", $null)
        } else {
            $backupInfo.Timestamp = $item.LastWriteTime
        }
        
        $allBackups += $backupInfo
    }
    
    # Sort by timestamp and take the most recent
    return $allBackups | Sort-Object Timestamp -Descending | Select-Object -First $Count
}

function Show-VerificationSummary {
    param([array]$Results)
    
    Write-VerifyLog "=== BACKUP VERIFICATION SUMMARY ===" "INFO"
    
    $totalBackups = $Results.Count
    $validBackups = ($Results | Where-Object { $_.Valid }).Count
    $invalidBackups = $totalBackups - $validBackups
    
    Write-VerifyLog "Total backups checked: $totalBackups"
    Write-VerifyLog "Valid backups: $validBackups" $(if ($validBackups -eq $totalBackups) { "SUCCESS" } else { "WARNING" })
    Write-VerifyLog "Invalid backups: $invalidBackups" $(if ($invalidBackups -eq 0) { "SUCCESS" } else { "ERROR" })
    
    foreach ($result in $Results) {
        $status = if ($result.Valid) { "✓ VALID" } else { "✗ INVALID" }
        $sizeStr = if ($result.Size -gt 1MB) { "$([math]::Round($result.Size/1MB, 2)) MB" } else { "$([math]::Round($result.Size/1KB, 1)) KB" }
        
        Write-VerifyLog "$status - $($result.Path) ($($result.Type), $sizeStr)"
        
        if ($result.Issues.Count -gt 0) {
            foreach ($issue in $result.Issues) {
                Write-VerifyLog "  ! $issue" "WARNING"
            }
        }
        
        if ($Detailed -and $result.Collections.Count -gt 0) {
            Write-VerifyLog "  Collections: $($result.Collections -join ', ')"
        }
    }
    
    Write-VerifyLog "=================================" "INFO"
}

# Main execution
Write-VerifyLog "Starting backup verification..." "INFO"

$verificationResults = @()

if ($BackupPath) {
    # Verify specific backup
    Write-VerifyLog "Verifying specific backup: $BackupPath"
    $verificationResults += Test-SingleBackup -Path $BackupPath
} else {
    # Verify recent backups
    Write-VerifyLog "Verifying $CheckLast most recent backups"
    $recentBackups = Get-RecentBackups -Count $CheckLast
    
    if ($recentBackups.Count -eq 0) {
        Write-VerifyLog "No backups found in $BackupRootPath" "WARNING"
        exit 1
    }
    
    foreach ($backup in $recentBackups) {
        $verificationResults += Test-SingleBackup -Path $backup.Path
    }
}

# Show summary
Show-VerificationSummary -Results $verificationResults

# Exit with appropriate code
$invalidCount = ($verificationResults | Where-Object { !$_.Valid }).Count
if ($invalidCount -eq 0) {
    Write-VerifyLog "All backups passed verification" "SUCCESS"
    exit 0
} else {
    Write-VerifyLog "$invalidCount backup(s) failed verification" "ERROR"
    exit 1
}
