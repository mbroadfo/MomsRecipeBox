# Reset-MrbDatabase.ps1
# Completely resets the database to a clean state
param (
    [switch]$Force
)

$containerName = "mrb-postgres"
$volumeName = "postgres_data"
$backupDir = ".\db\backups"

if (-not $Force) {
    $confirm = Read-Host "This will completely reset your database and delete all data. Are you sure? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "Operation cancelled."
        exit 0
    }
}

Write-Host "Stopping and removing container..."
docker compose down

Write-Host "Removing Docker volume..."
# Get the actual volume name with project prefix
$actualVolumeName = docker volume ls --format "{{.Name}}" | Where-Object { $_ -like "*$volumeName" }

if ($actualVolumeName) {
    Write-Host "Found volume: $actualVolumeName"
    docker volume rm $actualVolumeName
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Volume removed successfully."
    } else {
        Write-Warning "Failed to remove volume: $actualVolumeName"
    }
} else {
    Write-Host "No volume found matching '*$volumeName'. This is normal if the volume was already removed or never created."
}

Write-Host "Cleaning old backups..."
if (Test-Path $backupDir) {
    $oldBackups = Get-ChildItem -Path $backupDir -Filter "*.sql"
    if ($oldBackups.Count -gt 0) {
        $oldDir = Join-Path $backupDir "old"
        if (-not (Test-Path $oldDir)) {
            New-Item -Path $oldDir -ItemType Directory | Out-Null
        }
        Move-Item -Path "$backupDir\*.sql" -Destination $oldDir -Force
        Write-Host "Moved $($oldBackups.Count) old backups to $oldDir"
    }
}

Write-Host "Starting fresh database..."
docker compose up -d

Write-Host "Database reset complete! Starting with fresh schema and sample data."