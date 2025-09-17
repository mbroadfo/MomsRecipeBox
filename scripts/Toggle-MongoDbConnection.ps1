# Toggle-MongoDbConnection.ps1
# This script toggles between local Docker MongoDB and MongoDB Atlas connections
# It will update the .env file and restart the application container

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('local', 'atlas')]
    [string]$Mode,
    
    [Parameter(Mandatory = $false)]
    [switch]$ShowCurrent,
    
    [Parameter(Mandatory = $false)]
    [switch]$NoRestart
)

# ASCII art banner
function Show-Banner {
    $bannerText = @"
 ╔═════════════════════════════════════════════╗
 ║ MongoDB Connection Manager for MomsRecipeBox ║
 ╚═════════════════════════════════════════════╝
"@
    Write-Host $bannerText -ForegroundColor Cyan
}

# Function to get current MongoDB mode from .env file
function Get-CurrentMode {
    if (-not (Test-Path .env)) {
        Write-Host "❌ .env file not found. Creating it from .env.example..." -ForegroundColor Yellow
        if (Test-Path .env.example) {
            Copy-Item .env.example .env
            Write-Host "✅ Created .env file from template" -ForegroundColor Green
        } else {
            Write-Error "Neither .env nor .env.example files exist!"
            exit 1
        }
    }

    $envContent = Get-Content .env -ErrorAction SilentlyContinue
    $modeMatch = $envContent | Where-Object { $_ -match "MONGODB_MODE=(.+)" }
    if ($modeMatch) {
        $mode = $Matches[1]
        return $mode
    }
    return "local" # Default if not found
}

# Function to update the .env file with the new MongoDB mode
function Update-EnvFile {
    param (
        [string]$Mode
    )
    
    $envFile = ".env"
    
    # If .env doesn't exist but .env.example does, create it from example
    if (-not (Test-Path $envFile) -and (Test-Path ".env.example")) {
        Copy-Item ".env.example" $envFile
        Write-Host "Created .env from template file" -ForegroundColor Green
    } elseif (-not (Test-Path $envFile)) {
        Write-Error "No .env or .env.example file found!"
        exit 1
    }
    
    $envContent = Get-Content $envFile
    
    # Check if MONGODB_MODE exists in the file
    $modeExists = $false
    $newContent = @()
    
    foreach ($line in $envContent) {
        if ($line -match "^MONGODB_MODE=") {
            $newContent += "MONGODB_MODE=$Mode"
            $modeExists = $true
        } else {
            $newContent += $line
        }
    }
    
    # If MONGODB_MODE wasn't in the file, add it
    if (-not $modeExists) {
        $newContent += "MONGODB_MODE=$Mode"
    }
    
    # Write updated content back to file
    $newContent | Set-Content $envFile
    Write-Host "✅ Updated .env file with MONGODB_MODE=$Mode" -ForegroundColor Green
}

# Function to restart the app container
function Restart-AppContainer {
    Write-Host "Restarting application container..." -ForegroundColor Yellow
    
    try {
        if ($Mode -eq "local") {
            # For local mode, make sure MongoDB container is included
            docker-compose --profile local stop app
            docker-compose --profile local up -d
            
            # Check if MongoDB container is running
            $mongoStatus = docker ps --filter "name=momsrecipebox-mongo" --format "{{.Status}}"
            if ($mongoStatus) {
                Write-Host "✅ Local MongoDB container is running" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Local MongoDB container is not running. Starting it..." -ForegroundColor Yellow
                docker-compose --profile local up -d mongo
            }
        } else {
            # For Atlas mode, exclude MongoDB container
            docker-compose --profile atlas stop app
            docker-compose --profile atlas up -d app
        }
        
        Write-Host "✅ App container restarted successfully" -ForegroundColor Green
    } catch {
        Write-Error "Failed to restart containers: $_"
        exit 1
    }
}

# Check if Docker is running
function Test-DockerRunning {
    try {
        $dockerStatus = docker info 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Docker is not running. Please start Docker and try again."
            exit 1
        }
    } catch {
        Write-Error "Docker command failed. Make sure Docker is installed and running."
        exit 1
    }
}

# Show assistance for MongoDB Atlas setup
function Show-AtlasHelp {
    Write-Host "`nMongoDB Atlas Configuration Help:" -ForegroundColor Cyan
    Write-Host "------------------------------"
    Write-Host "To configure MongoDB Atlas connection, make sure your .env file includes:" -ForegroundColor Yellow
    Write-Host "MONGODB_ATLAS_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/moms_recipe_box?retryWrites=true&w=majority"
    Write-Host "- OR -"
    Write-Host "MONGODB_ATLAS_HOST=cluster.mongodb.net"
    Write-Host "MONGODB_ATLAS_USER=username"
    Write-Host "MONGODB_ATLAS_PASSWORD=your_password"
    Write-Host "MONGODB_DB_NAME=moms_recipe_box"
    
    Write-Host "`nYou can get your connection details from MongoDB Atlas dashboard" -ForegroundColor Yellow
    Write-Host "or by running: cd ./infra; terraform output mongodb_srv_address" -ForegroundColor Yellow
}

# Main execution
Show-Banner

# Check if Docker is running
Test-DockerRunning

# If no mode is specified, get the current mode
$currentMode = Get-CurrentMode

if ($ShowCurrent) {
    Write-Host "Current MongoDB connection mode: " -NoNewline
    Write-Host "$currentMode" -ForegroundColor Green
    
    # Show additional info based on current mode
    if ($currentMode -eq "local") {
        Write-Host "`nUsing local Docker MongoDB container"
        $mongoStatus = docker ps --filter "name=momsrecipebox-mongo" --format "{{.Status}}" 2>$null
        if ($mongoStatus) {
            Write-Host "MongoDB container status: " -NoNewline
            Write-Host "Running" -ForegroundColor Green
        } else {
            Write-Host "MongoDB container status: " -NoNewline
            Write-Host "Not running" -ForegroundColor Red
            Write-Host "You can start it with: docker-compose --profile local up -d mongo"
        }
    } else {
        Write-Host "`nUsing MongoDB Atlas cloud database"
        Write-Host "Make sure you have properly configured Atlas credentials in your .env file"
        
        # Check if Atlas configuration exists in .env
        $envContent = Get-Content .env -ErrorAction SilentlyContinue
        $atlasConfigured = $envContent | Where-Object { $_ -match "MONGODB_ATLAS_URI=" -or ($_ -match "MONGODB_ATLAS_HOST=" -and $_ -match "MONGODB_ATLAS_USER=") }
        
        if ($atlasConfigured) {
            Write-Host "Atlas configuration: " -NoNewline
            Write-Host "Found" -ForegroundColor Green
        } else {
            Write-Host "Atlas configuration: " -NoNewline
            Write-Host "Not found" -ForegroundColor Red
            Show-AtlasHelp
        }
    }
    
    exit 0
}

# If no mode is provided, toggle between modes
if (-not $Mode) {
    if ($currentMode -eq "local") {
        $Mode = "atlas"
        Write-Host "Toggling from local to Atlas MongoDB..."
    } else {
        $Mode = "local"
        Write-Host "Toggling from Atlas to local MongoDB..."
    }
} else {
    # If mode is the same as current, no change needed
    if ($Mode -eq $currentMode) {
        Write-Host "Already using $Mode MongoDB mode. No change needed." -ForegroundColor Green
        exit 0
    }
    Write-Host "Setting MongoDB mode to: $Mode"
}

# Update .env file with new mode
Update-EnvFile -Mode $Mode

# If Atlas mode and no Atlas config, show help
if ($Mode -eq "atlas") {
    $envContent = Get-Content .env -ErrorAction SilentlyContinue
    $atlasConfigured = $envContent | Where-Object { $_ -match "MONGODB_ATLAS_URI=" -or ($_ -match "MONGODB_ATLAS_HOST=" -and $_ -match "MONGODB_ATLAS_USER=") }
    
    if (-not $atlasConfigured) {
        Write-Host "`n⚠️  Warning: MongoDB Atlas configuration not found in .env file" -ForegroundColor Yellow
        Show-AtlasHelp
    }
}

# Restart app container unless -NoRestart is specified
if (-not $NoRestart) {
    Restart-AppContainer
    
    Write-Host "`n✅ MongoDB connection mode set to: " -NoNewline
    Write-Host "$Mode" -ForegroundColor Green
    
    if ($Mode -eq "atlas") {
        Write-Host "`nTo verify connection, check logs with: docker-compose logs -f app"
    } else {
        Write-Host "`nTo verify connection, visit: http://localhost:8081 (MongoDB Express)"
    }
} else {
    Write-Host "`n✅ MongoDB connection mode set to: " -NoNewline
    Write-Host "$Mode" -ForegroundColor Green
    Write-Host "Container not restarted (NoRestart flag used)"
    Write-Host "Run docker-compose up -d to apply changes"
}