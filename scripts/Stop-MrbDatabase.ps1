# Stop-MrbDatabase.ps1

$containerName = "mrb-postgres"

Write-Host "Stopping container $containerName..."
docker stop $containerName

Write-Host "Removing container $containerName..."
docker rm $containerName
