# Stop-MrbDatabase.ps1
$containerName = "mrb-postgres"
$backupDir = "./db/backups"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupDir/mrb_dev_backup_$timestamp.sql"

# Ensure backup directory exists
if (-not (Test-Path -Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

Write-Host "Creating database backup..."

# Use docker exec without PowerShell redirection to avoid encoding issues
$backupContent = docker exec $containerName pg_dump -U mrb_admin --data-only mrb_dev

if ($LASTEXITCODE -ne 0) {
    Write-Warning "Backup failed. Skipping container shutdown."
    exit 1
}

# Write as UTF-8 without BOM
[System.IO.File]::WriteAllLines($backupFile, $backupContent, [System.Text.UTF8Encoding]::new($false))

Write-Host "Backup completed: $backupFile"

Write-Host "Stopping container $containerName..."
docker stop $containerName