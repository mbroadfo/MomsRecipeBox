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
$testScript = ".\db\tests\test_recipe_lifecycle.sql"
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
    $latestBackup = GetLatestBackupFile
    if ($isNewVolume -and -not $latestBackup) {
        Write-Host "Docker volume '$volumeName' not found and no backup exists. Creating volume and initializing DB with init.sql..."
    } elseif ($isNewVolume -and $latestBackup) {
        Write-Host "Docker volume '$volumeName' not found. Creating volume and will restore from backup..."
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
    if ($isNewVolume -and $latestBackup) {
        $containerBackupPath = "/tmp/restore.sql"
        Write-Host "Restoring from latest backup: $($latestBackup.FullName)"
        docker cp $($latestBackup.FullName) "$containerName`:$containerBackupPath"
        docker exec -i $containerName psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -f $containerBackupPath
    }
    # Run test script
    if (Test-Path $testScript) {
        $containerTestPath = "/tmp/test_script.sql"
        Write-Host "Running database lifecycle tests from: $testScript"
        docker cp $testScript "$containerName`:$containerTestPath"
        docker exec -i $containerName psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -f $containerTestPath
    } else {
        Write-Warning "Test script $testScript not found."
    }
}
function StopDatabase {
    if (-not (Test-Path $backupDir)) {
        New-Item -Path $backupDir -ItemType Directory | Out-Null
    }
    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $backupFile = Join-Path $backupDir "mrb_dev_backup_${timestamp}.sql"
    Write-Host "Creating database backup..."
    
    # Use docker exec without PowerShell redirection to avoid encoding issues
    $backupContent = docker exec $containerName pg_dump -U $env:POSTGRES_USER --data-only $env:POSTGRES_DB
    if ($LASTEXITCODE -eq 0) {
        # Write as UTF-8 without BOM
        [System.IO.File]::WriteAllLines($backupFile, $backupContent, [System.Text.UTF8Encoding]::new($false))
        Write-Host "Backup completed: $backupFile"
    } else {
        Write-Error "Backup failed with exit code $LASTEXITCODE"
        return
    }
    
    Write-Host "Stopping container $containerName..."
    docker compose down
}
switch ($Action) {
    "start" { StartDatabase }
    "stop"  { StopDatabase }
}