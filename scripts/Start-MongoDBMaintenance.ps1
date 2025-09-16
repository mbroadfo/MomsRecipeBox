# Start-MongoDBMaintenance.ps1
# This script executes MongoDB maintenance tasks including backup and cleanup

param(
    [Parameter(Mandatory=$false)]
    [switch]$BackupOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBackup,
    
    [Parameter(Mandatory=$false)]
    [switch]$KeepLocalBackups,
    
    [Parameter(Mandatory=$false)]
    [switch]$DetailedOutput
)

# Set strict mode and error action preference
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Get the path to the scripts directory
$scriptPath = $PSScriptRoot
$backupScript = Join-Path $scriptPath "Backup-MongoDBToS3.ps1"
$verboseArg = if ($DetailedOutput) { "-Verbose" } else { "" }

# Print banner
Write-Host "
+----------------------------------------+
|                                        |
|        MONGODB ATLAS MAINTENANCE       |
|                                        |
+----------------------------------------+
" -ForegroundColor Cyan

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

# Step 1: Create S3 backup
if (-not $SkipBackup) {
    $keepLocalArg = if ($KeepLocalBackups) { "-KeepLocalBackup" } else { "" }
    
    $backupSuccess = Invoke-MaintenanceTask -Title "Creating MongoDB Atlas backup" -ScriptBlock {
        # Use Test-MongoDBBackup.ps1 directly since it's working
        & (Join-Path $scriptPath "Test-MongoDBBackup.ps1")
    }
    
    $success = $success -and $backupSuccess
    
    # If BackupOnly is specified, exit after backup
    if ($BackupOnly) {
        if ($success) {
            Write-Host "`n[SUCCESS] Backup-only maintenance completed successfully!" -ForegroundColor Green
        }
        else {
            Write-Host "`n[ERROR] Backup-only maintenance completed with errors!" -ForegroundColor Red
        }
        
        $endTime = Get-Date
        $duration = $endTime - $startTime
        Write-Host "Total duration: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor Cyan
        
        exit $(if ($success) { 0 } else { 1 })
    }
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

# Step 3: Add other maintenance tasks as needed
# Placeholder for potential future maintenance tasks

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
exit $(if ($success) { 0 } else { 1 })