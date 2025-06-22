# Start-MrbDatabase.ps1
# Usage: ./Start-MrbDatabase.ps1 -Action start|stop
param (
    [ValidateSet("start", "stop")]
    [string]$Action = "start"
)

$ErrorActionPreference = "Stop"
$envFile = ".\.env.ps1"
$projectName = (Get-Item ".").Name.ToLower()
$containerName = "momsrecipebox-db"
$volumeName = "${projectName}_pgdata"
$testScript = ".\db\tests\test_recipe_lifecycle.sql"
$initScript = ".\db\init.sql"

# Load environment variables
if (Test-Path $envFile) {
    . $envFile
} else {
    Write-Warning ".env.ps1 not found. Environment variables may be missing."
}

function VolumeExists {
    $actualVolumeName = docker compose config --format json | ConvertFrom-Json | ForEach-Object { $_.volumes.pgdata.name }
    if (-not $actualVolumeName) {
        $actualVolumeName = "${projectName}_pgdata"
    }
    docker volume ls --format '{{.Name}}' | Select-String -Quiet "^$actualVolumeName$"
}

function IsVolumeEmpty {
    $tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
    $scriptContent = @'
#!/bin/sh
if [ "$(ls -A /var/lib/postgresql/data 2>/dev/null)" ]; then
    echo not-empty
else
    echo empty
fi
'@ -replace "`r`n", "`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($tempScript, $scriptContent, $utf8NoBom)

    Write-Host "Debug: Checking if volume '$VolumeName' is empty..."

    try {
        $result = docker run --rm -v "${VolumeName}:/var/lib/postgresql/data" -v "${tempScript}:/check.sh:ro" busybox sh /check.sh
        Write-Host "Debug: Volume check result: '$result'"
    } catch {
        Write-Warning "Error while checking volume content: $_"
        return $false
    } finally {
        if (Test-Path $tempScript) {
            Remove-Item $tempScript -Force
        }
    }

    if (-not $result) {
        Write-Warning "Debug: Volume inspection returned no result. Assuming not empty."
        return $false
    }

    return $result.Trim() -eq "empty"
}

function WaitForRoleCreation {
    $maxAttempts = 30
    for ($i = 0; $i -lt $maxAttempts; $i++) {
        $output = docker exec $containerName psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -tAc "SELECT 1 FROM pg_roles WHERE rolname='mrb_admin';" 2>$null
        if ($output -match "1") {
            Write-Host "mrb_admin role found."
            return $true
        }
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
    Write-Host ""
    return $false
}

function WaitForTableCreation {
    $maxAttempts = 20
    for ($i = 0; $i -lt $maxAttempts; $i++) {
        $output = docker exec $containerName psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -tAc "SELECT 1 FROM information_schema.tables WHERE table_name = 'recipes';"
        if ($output -match "1") {
            Write-Host "Table 'recipes' found."
            return $true
        }
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 2
    }
    Write-Host ""
    return $false
}

function ExecuteSqlScript($scriptPath) {
    $containerPath = "/tmp/$(Split-Path $scriptPath -Leaf)"
    docker cp $scriptPath "${containerName}:${containerPath}"
    docker exec $containerName sh -c "psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -f $containerPath"
}

function StartDatabase {
    $volumeExists = VolumeExists
    $isNewVolume = $false

    if (-not $volumeExists) {
        Write-Host "Creating new Docker volume: $volumeName"
        docker volume create $volumeName | Out-Null
        $isNewVolume = $true
    } else {
        $isEmpty = IsVolumeEmpty
        if ($isEmpty) {
            Write-Host "Existing volume is empty and will be initialized."
            $isNewVolume = $true
        } else {
            Write-Host "Using existing PostgreSQL volume with data."
        }
    }

    Write-Host "Starting PostgreSQL container..."
    docker compose up -d mrb-postgres

    Write-Host "Waiting for PostgreSQL container to become healthy..."
    $maxHealthChecks = 20
    for ($i = 0; $i -lt $maxHealthChecks; $i++) {
        $status = docker inspect --format='{{json .State.Health.Status}}' $containerName 2>$null
        if ($status -eq '"healthy"') {
            Write-Host "PostgreSQL is ready and healthy."
            break
        }
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 3
    }
    Write-Host ""

    if ($isNewVolume) {
        Write-Host "Running database initialization script..."
        ExecuteSqlScript $initScript
    }

    Write-Host "Checking for 'mrb_admin' role..."
    if (-not (WaitForRoleCreation)) {
        Write-Error "mrb_admin role not found. Initialization failed."
        return
    }

    Write-Host "Verifying that the database '$env:POSTGRES_DB' exists before running tests..."
    $dbExists = docker exec $containerName psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -tAc "SELECT 1 FROM pg_database WHERE datname = '$($env:POSTGRES_DB)';"
    if (-not $dbExists -or $dbExists.Trim() -ne "1") {
        Write-Error "Database '$($env:POSTGRES_DB)' does not exist or check failed. Aborting tests."
        return
    }

    if (-not (WaitForTableCreation)) {
        Write-Error "Schema not ready. Aborting tests."
        return
    }

    # === Recipe Seeding Step ===
    $seedScript = ".\db\seed-recipes.cjs"
    if (Test-Path $seedScript) {
        Write-Host "Seeding database with standard recipes from JSON files..."
        $env:NODE_ENV = "development"
        $seedOutput = & node $seedScript 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Standard recipes seeded successfully."
        } else {
            Write-Warning "⚠️ Recipe seeding failed. Output:"
            Write-Host $seedOutput
        }
    } else {
        Write-Warning "Seed script $seedScript not found. Skipping recipe seeding."
    }

    if (Test-Path $testScript) {
        $containerTestPath = "/tmp/test_script.sql"
        Write-Host "Running database lifecycle tests from: $testScript"
        docker cp $testScript "${containerName}:${containerTestPath}"
        $testResult = docker exec $containerName sh -c "psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -f $containerTestPath"
        Write-Host $testResult
        Write-Host "Database tests completed successfully."
    } else {
        Write-Warning "Test script $testScript not found. Skipping tests."
    }
}

function StopDatabase {
    Write-Host "Stopping container $containerName..."
    docker stop $containerName 2>$null
    Write-Host "Removing container $containerName..."
    docker rm $containerName 2>$null
    Write-Host "Database stopped and container removed."
}

switch ($Action) {
    "start" { StartDatabase }
    "stop" { StopDatabase }
}
