# Determine MongoDB mode from .env file or default to local
$envFilePath = ".\.env"
$mongodbMode = "local"  # Default mode
if (Test-Path $envFilePath) {
    $envContent = Get-Content $envFilePath
    foreach ($line in $envContent) {
        if ($line -match "^MONGODB_MODE=(.+)") {
            $mongodbMode = $Matches[1].Trim()
            # Clean up the comment if it exists in the value
            if ($mongodbMode -match "^(atlas|local)") {
                $mongodbMode = $Matches[1]
            }
        }
    }
}

Write-Host "Using MongoDB mode: $mongodbMode"

# If using Atlas mode, get MongoDB URI from AWS Secrets Manager
if ($mongodbMode -eq "atlas") {
    $getUriScript = ".\scripts\Get-MongoAtlasUri.ps1"
    if (Test-Path $getUriScript) {
        Write-Host "Getting MongoDB Atlas URI from AWS Secrets Manager using mrb-api profile..." -ForegroundColor Yellow
        # Set AWS profile for the secret retrieval
        $env:AWS_PROFILE = "mrb-api"
        $mongoUri = & $getUriScript
        if ($?) {
            Write-Host "Successfully retrieved MongoDB Atlas URI" -ForegroundColor Green
            # Set as environment variable for docker-compose
            $env:MONGODB_ATLAS_URI = $mongoUri
        } else {
            Write-Error "Failed to get MongoDB Atlas URI from AWS Secrets Manager"
            exit 1
        }
    } else {
        Write-Error "Get-MongoAtlasUri.ps1 script not found at $getUriScript"
        exit 1
    }
}

# Stop any existing containers - be more thorough
Write-Host "Stopping all app containers..." -ForegroundColor Yellow
docker-compose down

# Stop containers by profile to be sure
Write-Host "Stopping local profile containers..." -ForegroundColor Yellow
docker-compose --profile local down 2>$null
Write-Host "Stopping atlas profile containers..." -ForegroundColor Yellow
docker-compose --profile atlas down 2>$null

# Force remove any lingering app containers
docker container rm -f momsrecipebox-app 2>$null
docker container rm -f momsrecipebox-app-local 2>$null
docker container rm -f momsrecipebox-app-atlas 2>$null

# Also check for any containers still using port 3000
Write-Host "Checking for containers using port 3000..." -ForegroundColor Yellow
$containersOnPort3000 = docker ps --filter "publish=3000" --format "table {{.Names}}\t{{.Ports}}"
if ($containersOnPort3000) {
    Write-Host "Found containers using port 3000:" -ForegroundColor Red
    Write-Host $containersOnPort3000
    
    # Get container IDs using port 3000 and stop them
    $containerIds = docker ps --filter "publish=3000" -q
    if ($containerIds) {
        Write-Host "Stopping containers using port 3000..." -ForegroundColor Yellow
        docker stop $containerIds
        docker rm $containerIds
    }
}

Write-Host ""
Write-Host "All app containers stopped." -ForegroundColor Green
Write-Host ""
Write-Host "Starting with MongoDB mode: $mongodbMode" -ForegroundColor Green

# Build and start with the appropriate profile
docker-compose --profile $mongodbMode build
docker-compose --profile $mongodbMode up -d

# Print environment variables inside the container for debugging
Write-Host "Checking environment variables in the container:"
try {
    $containerName = "momsrecipebox-app-$mongodbMode"
    docker-compose --profile $mongodbMode exec $containerName node -e "console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY)"
} catch {
    Write-Host "Could not check environment variables. Container may not be running yet."
}
