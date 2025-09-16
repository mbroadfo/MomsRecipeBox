# Register-MongoDBBackupTask.ps1
# This script registers a scheduled task to run MongoDB backups to S3

param(
    [Parameter(Mandatory=$false)]
    [string]$TaskName = "MongoDBAtlasBackup",
    
    [Parameter(Mandatory=$false)]
    [string]$RunTime = "3:00am",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("Daily", "Weekly")]
    [string]$Frequency = "Daily"
)

# Get the current directory where scripts are stored
$scriptPath = $PSScriptRoot
$backupScript = Join-Path $scriptPath "Backup-MongoDBToS3.ps1"

# Ensure the backup script exists
if (-not (Test-Path $backupScript)) {
    Write-Error "Backup script not found at: $backupScript"
    exit 1
}

# Set up the scheduled task
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`""
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
    
    Write-Host "`nTo modify this task, use the Windows Task Scheduler or run this script again with new parameters." -ForegroundColor Yellow
} catch {
    Write-Error "Failed to register scheduled task: $_"
    exit 1
}