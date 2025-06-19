. "$PSScriptRoot\Load-Env.ps1"

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
