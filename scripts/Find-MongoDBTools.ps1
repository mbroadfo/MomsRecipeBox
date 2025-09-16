# Find-MongoDBTools.ps1
# This script helps locate MongoDB Database Tools and optionally adds them to PATH

param(
    [Parameter(Mandatory=$false)]
    [switch]$AddToPath
)

Write-Host "Searching for MongoDB Database Tools..." -ForegroundColor Cyan

# List of possible locations
$possiblePaths = @(
    "C:\Program Files\MongoDB\Tools\100\bin",
    "C:\Program Files\MongoDB\Database Tools\100\bin",
    "C:\Program Files\MongoDB\Server\Tools\bin",
    "C:\Program Files\MongoDB\Tools\bin",
    "C:\Program Files\MongoDB\Server\6.0\bin",
    "C:\Program Files\MongoDB\Server\5.0\bin",
    "C:\Program Files\MongoDB\Server\4.4\bin"
)

# Try to find mongodump.exe
$foundPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path (Join-Path $path "mongodump.exe")) {
        $foundPath = $path
        break
    }
}

# If not found in common locations, try a deeper search
if (-not $foundPath) {
    Write-Host "Searching common directories for MongoDB tools (this might take a moment)..." -ForegroundColor Yellow
    
    $programFilesDirs = @(
        "C:\Program Files",
        "C:\Program Files (x86)"
    )
    
    foreach ($dir in $programFilesDirs) {
        if (Test-Path $dir) {
            $results = Get-ChildItem -Path $dir -Filter "mongodump.exe" -Recurse -ErrorAction SilentlyContinue -Force
            if ($results) {
                $foundPath = $results[0].DirectoryName
                break
            }
        }
    }
}

# Report results
if ($foundPath) {
    Write-Host "✅ Found MongoDB Database Tools at: $foundPath" -ForegroundColor Green
    
    # List all tools found
    $tools = Get-ChildItem -Path $foundPath -Filter "mongo*.exe" | Select-Object -ExpandProperty Name
    Write-Host "`nTools available:" -ForegroundColor Cyan
    foreach ($tool in $tools) {
        Write-Host " - $tool" -ForegroundColor Gray
    }
    
    # Check if it's already in PATH
    $pathEnv = [Environment]::GetEnvironmentVariable("Path", [System.EnvironmentVariableTarget]::User)
    $alreadyInPath = $pathEnv -split ";" | Where-Object { $_ -eq $foundPath }
    
    if ($alreadyInPath) {
        Write-Host "`nMongoDB Tools directory is already in your PATH" -ForegroundColor Green
    } else {
        Write-Host "`nMongoDB Tools directory is NOT in your PATH" -ForegroundColor Yellow
        
        if ($AddToPath) {
            # Add to PATH
            $newPath = $pathEnv + ";" + $foundPath
            [Environment]::SetEnvironmentVariable("Path", $newPath, [System.EnvironmentVariableTarget]::User)
            Write-Host "✅ Added MongoDB Tools directory to your PATH" -ForegroundColor Green
            Write-Host "Please restart your PowerShell session for the change to take effect" -ForegroundColor Yellow
        } else {
            Write-Host "To add it to your PATH, run this script with the -AddToPath parameter:" -ForegroundColor Cyan
            Write-Host "  .\Find-MongoDBTools.ps1 -AddToPath" -ForegroundColor Gray
            Write-Host "`nOr you can add it manually by updating your Path environment variable to include:" -ForegroundColor Cyan
            Write-Host "  $foundPath" -ForegroundColor Gray
        }
    }
    
    return $foundPath
} else {
    Write-Host "❌ Could not find MongoDB Database Tools" -ForegroundColor Red
    Write-Host "Please make sure you've installed MongoDB Database Tools from:" -ForegroundColor Yellow
    Write-Host "https://www.mongodb.com/try/download/database-tools" -ForegroundColor Yellow
    
    return $null
}