# Scheduled Backup Setup Guide

This guide helps you set up automated backups using Windows Task Scheduler.

## Automatic Setup

The easiest way to set up scheduled backups is to use the setup script:

```powershell
.\scripts\backup\manage-backups.ps1 -Operation setup -Force
```

This will create the following scheduled tasks:
- **Daily Full Backup**: Every day at 2:00 AM
- **Incremental Backup**: Every 4 hours
- **Weekly Archive**: Every Sunday at 1:00 AM
- **Daily Cleanup**: Every day at 3:00 AM

## Manual Setup

If you prefer to set up scheduled tasks manually:

### 1. Daily Full Backup

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File `"C:\Path\To\MomsRecipeBox\scripts\backup\backup-mongodb.ps1`" -Type full" -WorkingDirectory "C:\Path\To\MomsRecipeBox"
$trigger = New-ScheduledTaskTrigger -Daily -At "2:00 AM"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "MomsRecipeBox-Daily-Backup" -Action $action -Trigger $trigger -Settings $settings -Description "Daily full backup of Mom's Recipe Box database" -User "SYSTEM"
```

### 2. Incremental Backup (Every 4 Hours)

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File `"C:\Path\To\MomsRecipeBox\scripts\backup\backup-mongodb.ps1`" -Type incremental" -WorkingDirectory "C:\Path\To\MomsRecipeBox"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 4) -RepetitionDuration (New-TimeSpan -Days 365)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "MomsRecipeBox-Incremental-Backup" -Action $action -Trigger $trigger -Settings $settings -Description "Incremental backup of Mom's Recipe Box database every 4 hours" -User "SYSTEM"
```

### 3. Weekly Archive Backup

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File `"C:\Path\To\MomsRecipeBox\scripts\backup\backup-mongodb.ps1`" -Type archive" -WorkingDirectory "C:\Path\To\MomsRecipeBox"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "1:00 AM"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "MomsRecipeBox-Archive-Backup" -Action $action -Trigger $trigger -Settings $settings -Description "Weekly archive backup of Mom's Recipe Box database" -User "SYSTEM"
```

### 4. Daily Cleanup

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File `"C:\Path\To\MomsRecipeBox\scripts\backup\cleanup-backups.ps1`" -WorkingDirectory "C:\Path\To\MomsRecipeBox"
$trigger = New-ScheduledTaskTrigger -Daily -At "3:00 AM"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "MomsRecipeBox-Cleanup-Backups" -Action $action -Trigger $trigger -Settings $settings -Description "Daily cleanup of old Mom's Recipe Box backups" -User "SYSTEM"
```

## Verification

After setting up scheduled tasks, verify they're working:

```powershell
# Check if tasks are created and enabled
Get-ScheduledTask -TaskName "MomsRecipeBox-*"

# Run a task manually to test
Start-ScheduledTask -TaskName "MomsRecipeBox-Daily-Backup"

# Check task history
Get-WinEvent -FilterHashtable @{LogName="Microsoft-Windows-TaskScheduler/Operational"; ID=200,201} | Where-Object {$_.Message -match "MomsRecipeBox"} | Select-Object TimeCreated, LevelDisplayName, Message
```

## Monitoring

Set up monitoring to ensure backups are running successfully:

### 1. Email Notifications (Optional)

Modify the backup scripts to send email notifications on success/failure by updating the configuration in `backup-config.json`.

### 2. Log Monitoring

Backup logs are written to:
- `backups/backup.log` - All backup operations
- `restore.log` - Restore operations (in current directory)

### 3. Health Checks

Regular health checks can be automated:

```powershell
# Create a health check task that runs every hour
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File `"C:\Path\To\MomsRecipeBox\scripts\backup\verify-backup.ps1`" -CheckLast 1" -WorkingDirectory "C:\Path\To\MomsRecipeBox"
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 365)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "MomsRecipeBox-Health-Check" -Action $action -Trigger $trigger -Settings $settings -Description "Hourly health check of Mom's Recipe Box backups" -User "SYSTEM"
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure the task runs with appropriate permissions (SYSTEM user recommended)
2. **Docker Not Available**: Ensure Docker Desktop is set to start automatically
3. **Path Issues**: Use absolute paths in scheduled tasks
4. **MongoDB Container Not Running**: Ensure the container has restart policies set

### Task Debugging

Enable detailed logging in Task Scheduler:
1. Open Task Scheduler
2. Right-click on the task
3. Select "Properties"
4. Go to "Settings" tab
5. Check "If the running task does not end when requested, force it to stop"
6. Set "Stop the task if it runs longer than: 2 hours"

### Log Analysis

Check backup success/failure patterns:

```powershell
# Analyze backup logs for patterns
Get-Content "backups/backup.log" | Where-Object { $_ -match "SUCCESS|ERROR" } | Select-Object -Last 20

# Check Windows Event Log for scheduled task events
Get-WinEvent -FilterHashtable @{LogName="Microsoft-Windows-TaskScheduler/Operational"} | Where-Object {$_.Message -match "MomsRecipeBox"} | Select-Object TimeCreated, LevelDisplayName, Message | Sort-Object TimeCreated -Descending | Select-Object -First 10
```

## Best Practices

1. **Stagger Backup Times**: Don't run all backup types at the same time
2. **Monitor Disk Space**: Set up alerts for low disk space in backup directory
3. **Test Restores**: Regularly test restore procedures
4. **Update Retention**: Adjust retention policies based on available storage
5. **Security**: Protect backup directories with appropriate file permissions
6. **Documentation**: Keep this documentation updated when making changes

## Alternative Scheduling Options

### Using SCHTASKS Command

```cmd
REM Daily backup at 2 AM
schtasks /create /tn "MomsRecipeBox-Daily-Backup" /tr "powershell.exe -File \"C:\Path\To\backup-mongodb.ps1\" -Type full" /sc daily /st 02:00 /ru SYSTEM

REM Incremental backup every 4 hours
schtasks /create /tn "MomsRecipeBox-Incremental-Backup" /tr "powershell.exe -File \"C:\Path\To\backup-mongodb.ps1\" -Type incremental" /sc hourly /mo 4 /ru SYSTEM
```

### Using Windows Service

For more advanced scenarios, consider creating a Windows Service that manages backup operations and monitoring.

---

*Remember to update paths in the commands above to match your actual installation directory.*
