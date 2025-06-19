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

function StartDatabase {
    docker compose up -d mrb-postgres

    Write-Host "Waiting for PostgreSQL container to become healthy..."
    for ($i = 0; $i -lt 10; $i++) {
        $status = docker inspect --format='{{json .State.Health.Status}}' $containerName 2>$null
        if ($status -eq '"healthy"') {
            Write-Host "PostgreSQL is ready."
            break
        }
        Start-Sleep -Seconds 3
    }

    # Ensure mrb_admin role exists before running tests, allow more time for init.sql to run
    $roleReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        $output = docker exec $containerName psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='mrb_admin';"
        if ($output -match "1") {
            $roleReady = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $roleReady) {
        Write-Error "mrb_admin role not found after waiting 30 seconds. Aborting tests."
        return
    }

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
    Write-Host "Stopping container $containerName..."
    docker stop $containerName

    Write-Host "Removing container $containerName..."
    docker rm $containerName
}

switch ($Action) {
    "start" { StartDatabase }
    "stop"  { StopDatabase }
}
