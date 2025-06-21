# Stop-MrbDatabase.ps1
$projectName = (Get-Item ".").Name.ToLower()
$containerName = "${projectName}-db"

Write-Host "Stopping container $containerName..."
docker stop $containerName

Write-Host "Removing container $containerName..."
docker rm $containerName
