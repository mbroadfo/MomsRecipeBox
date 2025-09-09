# Simple MongoDB Backup for Mom's Recipe Box
param(
    [Parameter(Mandatory=$false)]
    [string]$Operation = "backup"
)

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = ".\backups\backup_$timestamp"

Write-Host "=== Mom's Recipe Box Database Backup ==="
Write-Host "Time: $(Get-Date)"
Write-Host "Operation: $Operation"

if ($Operation -eq "backup") {
    Write-Host "Creating backup directory..."
    if (!(Test-Path ".\backups")) {
        New-Item -ItemType Directory -Path ".\backups" -Force | Out-Null
    }
    
    Write-Host "Running mongodump..."
    docker exec momsrecipebox-mongo mongodump --host localhost:27017 --username admin --password supersecret --authenticationDatabase admin --db moms_recipe_box --out /tmp/backup_output
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Copying backup from container..."
        docker cp momsrecipebox-mongo:/tmp/backup_output/moms_recipe_box $backupDir
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Cleaning up container..."
            docker exec momsrecipebox-mongo rm -rf /tmp/backup_output
            
            Write-Host "✓ SUCCESS: Backup created at $backupDir"
            Write-Host "Backup contains the following files:"
            Get-ChildItem -Path $backupDir | ForEach-Object { Write-Host "  - $($_.Name)" }
        } else {
            Write-Host "✗ ERROR: Failed to copy backup from container"
        }
    } else {
        Write-Host "✗ ERROR: mongodump failed"
    }
} elseif ($Operation -eq "status") {
    Write-Host "Checking backup status..."
    if (Test-Path ".\backups") {
        $backups = Get-ChildItem -Path ".\backups" -Directory
        Write-Host "Found $($backups.Count) backup(s):"
        $backups | Sort-Object CreationTime -Descending | ForEach-Object {
            Write-Host "  - $($_.Name) ($(Get-Date $_.CreationTime -Format 'yyyy-MM-dd HH:mm'))"
        }
    } else {
        Write-Host "No backups found - backup directory does not exist"
    }
} else {
    Write-Host "Usage: .\basic-backup.ps1 -Operation [backup|status]"
}

Write-Host "=== Complete ==="
