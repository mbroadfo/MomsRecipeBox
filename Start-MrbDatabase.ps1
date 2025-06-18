# Start-MrbDatabase.ps1
# Usage: ./Start-MrbDatabase.ps1 -Action start|stop

param (
    [ValidateSet("start", "stop")]
    [string]$Action = "start"
)

$ErrorActionPreference = "Stop"
$envFile = ".\.env.ps1"
$volumeName = "postgres_data"
$containerName = "mrb-postgres"
$backupDir = ".\db\backups"

# Load environment variables
if (Test-Path $envFile) {
    . $envFile
} else {
    Write-Warning ".env.ps1 not found. Environment variables may be missing."
}

function VolumeExists {
    docker volume ls --format '{{.Name}}' | Select-String -Quiet "^$volumeName$"
}

function GetLatestBackupFile {
    if (Test-Path $backupDir) {
        return Get-ChildItem -Path $backupDir -Filter "mrb_dev_backup_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    }
    return $null
}

function StartDatabase {
    $isNewVolume = -not (VolumeExists)
    if ($isNewVolume) {
        Write-Host "Docker volume '$volumeName' not found. Creating volume and initializing DB..."
    } else {
        Write-Host "Docker volume '$volumeName' found. Skipping init script."
    }

    docker compose up -d

    Write-Host "Waiting for PostgreSQL container to become healthy..."
    for ($i = 0; $i -lt 10; $i++) {
        $status = docker inspect --format='{{json .State.Health.Status}}' $containerName 2>$null
        if ($status -eq '"healthy"') {
            Write-Host "PostgreSQL is ready."
            break
        }
        Start-Sleep -Seconds 3
    }

    if ($isNewVolume) {
        $latestBackup = GetLatestBackupFile
        if ($latestBackup) {
            Write-Host "Restoring from latest backup: $($latestBackup.FullName)"
            Get-Content $latestBackup.FullName | docker exec -i $containerName psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB
        } else {
            Write-Warning "No backup found to restore."
        }
    }
}

function StopDatabase {
    if (-not (Test-Path $backupDir)) {
        New-Item -Path $backupDir -ItemType Directory | Out-Null
    }

    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $backupFile = Join-Path $backupDir "mrb_dev_backup_${timestamp}.sql"

    Write-Host "Creating database backup..."
    docker exec $containerName pg_dump -U $env:POSTGRES_USER $env:POSTGRES_DB > $backupFile
    Write-Host "Backup completed: $backupFile"

    Write-Host "Stopping container $containerName..."
    docker compose down
}

switch ($Action) {
    "start" { StartDatabase }
    "stop"  { StopDatabase }
}
