# Load environment
$envPath = Join-Path -Path $PSScriptRoot -ChildPath "..\.env.local"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^\s*([^#=]+?)\s*=\s*(.+)\s*$") {
            $key, $value = $matches[1], $matches[2]
            [System.Environment]::SetEnvironmentVariable($key, $value)
        }
    }
    Write-Host ".env.local variables loaded." -ForegroundColor Green
} else {
    Write-Warning ".env.local not found at $envPath"
}

$ErrorActionPreference = "Stop"

# Stop only the app container
$containerName = "momsrecipebox-app"
if (docker ps -q -f name=$containerName) {
    Write-Host "Stopping existing app container..."
    docker stop $containerName | Out-Null
    docker rm $containerName | Out-Null
}

Write-Host "Starting app container..."
docker compose up --build --detach app

Start-Sleep -Seconds 5

$containerStatus = docker inspect -f '{{.State.Status}}' $containerName 2>$null
if ($containerStatus -ne 'running') {
    Write-Warning "$containerName is not running. Dumping logs:"
    docker logs $containerName
} else {
    Write-Host "$containerName is running successfully." -ForegroundColor Green
}
