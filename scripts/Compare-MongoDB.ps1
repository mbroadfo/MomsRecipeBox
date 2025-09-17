# Compare-MongoDB.ps1
#
# This script compares the contents of a local MongoDB with MongoDB Atlas to verify they are in sync.
# It demonstrates using environment variables to connect to both databases and validates connectivity.
#
# Usage:
# .\scripts\Compare-MongoDB.ps1 [-LocalUri <string>] [-AtlasUri <string>] [-DatabaseName <string>] [-DetailedOutput]
#
# Connection Configuration:
# 1. For Atlas connection, add one of the following to your .env file:
#    - MONGODB_ATLAS_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/dbname
#    - Or individual settings:
#      MONGODB_ATLAS_HOST=cluster.mongodb.net
#      MONGODB_ATLAS_USER=username 
#      MONGODB_ATLAS_PASSWORD=password
#    - If you have MONGODB_MODE=atlas and MONGODB_URI set to Atlas URI, those will be used
#
# 2. For Local connection (these are usually already in your .env):
#    - MONGODB_ROOT_USER and MONGODB_ROOT_PASSWORD for authentication

param (
    [Parameter(Mandatory = $false)]
    [string]$LocalUri = "",
    
    [Parameter(Mandatory = $false)]
    [string]$AtlasUri = "",
    
    [Parameter(Mandatory = $false)]
    [string]$DatabaseName = "moms_recipe_box",
    
    [Parameter(Mandatory = $false)]
    [switch]$DetailedOutput
)

# Print script banner
function Show-Banner {
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host "  MongoDB Comparison Test: Local vs Atlas" -ForegroundColor Cyan
    Write-Host "===================================================" -ForegroundColor Cyan
    Write-Host ""
}

# Load environment variables from .env file
function Import-EnvFile {
    param (
        [string]$EnvFilePath = ".env"
    )
    
    if (Test-Path $EnvFilePath) {
        Get-Content $EnvFilePath | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim()
                # Remove quotes if present
                if ($value -match '^"(.*)"$' -or $value -match "^'(.*)'$") {
                    $value = $matches[1]
                }
                # Set environment variable
                [Environment]::SetEnvironmentVariable($key, $value)
                if ($DetailedOutput) {
                    Write-Host "Loaded env var: $key" -ForegroundColor DarkGray
                }
            }
        }
        return $true
    } else {
        Write-Warning "Environment file not found: $EnvFilePath"
        return $false
    }
}

# Check if mongodb tools are installed and return path to mongosh
function Find-MongoTools {
    try {
        # Check if mongosh is installed
        $mongoshPath = Get-Command mongosh -ErrorAction Stop | Select-Object -ExpandProperty Source
        return $mongoshPath
    }
    catch {
        # Check common installation paths
        $commonPaths = @(
            "C:\Program Files\MongoDB\Server\*\bin\mongosh.exe",
            "C:\Program Files\MongoDB\Tools\*\bin\mongosh.exe",
            "$env:LOCALAPPDATA\MongoDB\*\bin\mongosh.exe"
        )
        
        foreach ($path in $commonPaths) {
            $mongoshPath = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | 
                Sort-Object -Property FullName -Descending | 
                Select-Object -First 1 -ExpandProperty FullName
            
            if ($mongoshPath) {
                return $mongoshPath
            }
        }
        
        Write-Error "MongoDB Shell (mongosh) is not installed or not in PATH. Please install it from: https://www.mongodb.com/try/download/shell"
        return $null
    }
}

# Construct the MongoDB connection strings based on environment variables or parameters
function Get-ConnectionStrings {
    param (
        [string]$LocalUriParam,
        [string]$AtlasUriParam,
        [string]$DbName
    )
    
    $localUri = ""
    $atlasUri = ""
    
    # First priority: use parameters if provided
    if ($LocalUriParam) {
        $localUri = $LocalUriParam
        Write-Host "Using provided Local MongoDB URI" -ForegroundColor DarkGray
    }
    
    if ($AtlasUriParam) {
        $atlasUri = $AtlasUriParam
        Write-Host "Using provided Atlas MongoDB URI" -ForegroundColor DarkGray
    }
    
    # Second priority: use environment variables if available
    if (-not $localUri) {
        # For local MongoDB
        $localUser = $env:MONGODB_ROOT_USER
        $localPassword = $env:MONGODB_ROOT_PASSWORD
        $localHost = "localhost:27017"
        
        if ($localUser -and $localPassword) {
            $localUri = "mongodb://$localUser`:$localPassword@$localHost/$DbName`?authSource=admin"
            Write-Host "Constructed Local MongoDB URI from environment variables" -ForegroundColor DarkGray
        } else {
            $localUri = "mongodb://localhost:27017/$DbName"
            Write-Host "Using default Local MongoDB URI" -ForegroundColor DarkGray
        }
    }
    
    if (-not $atlasUri) {
        # For MongoDB Atlas
        # First check if a full connection string is provided
        if ($env:MONGODB_ATLAS_URI) {
            $atlasUri = $env:MONGODB_ATLAS_URI
            Write-Host "Using MONGODB_ATLAS_URI environment variable" -ForegroundColor DarkGray
        }
        # Check for MONGODB_MODE and MONGODB_URI in case it's already set for Atlas
        elseif ($env:MONGODB_MODE -eq "atlas" -and $env:MONGODB_URI -and $env:MONGODB_URI -like "*mongodb+srv://*") {
            $atlasUri = $env:MONGODB_URI
            Write-Host "Using MONGODB_URI environment variable (Atlas mode)" -ForegroundColor DarkGray
        }
        # Otherwise try to build from components
        elseif ($env:MONGODB_ATLAS_HOST -and $env:MONGODB_ATLAS_USER -and $env:MONGODB_ATLAS_PASSWORD) {
            $atlasUri = "mongodb+srv://$($env:MONGODB_ATLAS_USER):$($env:MONGODB_ATLAS_PASSWORD)@$($env:MONGODB_ATLAS_HOST)/$DbName`?retryWrites=true&w=majority"
            Write-Host "Constructed Atlas MongoDB URI from environment variables" -ForegroundColor DarkGray
        } else {
            Write-Warning "No MongoDB Atlas connection information found in your .env file."
            Write-Host ""
            Write-Host "Please add one of the following to your .env file:" -ForegroundColor Yellow
            Write-Host "1. MONGODB_ATLAS_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/dbname" -ForegroundColor Yellow
            Write-Host "   -- OR --" -ForegroundColor Yellow
            Write-Host "2. All of these individual components:" -ForegroundColor Yellow
            Write-Host "   MONGODB_ATLAS_HOST=cluster.mongodb.net" -ForegroundColor Yellow
            Write-Host "   MONGODB_ATLAS_USER=username" -ForegroundColor Yellow
            Write-Host "   MONGODB_ATLAS_PASSWORD=password" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Alternatively, provide the Atlas URI directly when running the script:" -ForegroundColor Cyan
            Write-Host '.\scripts\Compare-MongoDB.ps1 -AtlasUri "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/dbname"' -ForegroundColor Cyan
            Write-Host ""
            return $null, $null
        }
    }
    
    return $localUri, $atlasUri
}

# Test MongoDB connection and return database information
function Test-MongoConnection {
    param (
        [string]$ConnectionString,
        [string]$ConnectionName,
        [string]$DbName,
        [string]$MongoshPath
    )
    
    Write-Host "Testing $ConnectionName connection..." -ForegroundColor Yellow
    
    try {
        # Create a temporary JavaScript file for mongosh to execute
        $tempScriptPath = [System.IO.Path]::GetTempFileName() + ".js"
        
        $mongoshScript = @"
            try {
                // Connect to the database
                const client = Mongo("$ConnectionString");
                const db = client.getDB("$DbName");
                
                // Execute serverStatus command to verify connection
                const status = db.adminCommand({ serverStatus: 1 });
                
                // Get database stats
                const dbStats = db.stats();
                
                // Get list of collections
                const collections = db.getCollectionNames();
                
                // Create result object
                const result = {
                    status: "connected",
                    version: status.version,
                    dbStats: dbStats,
                    collections: collections,
                    collectionStats: {}
                };
                
                // Get stats for each collection
                collections.forEach(collName => {
                    const count = db.getCollection(collName).countDocuments();
                    const stats = db.getCollection(collName).stats();
                    result.collectionStats[collName] = {
                        count: count,
                        size: stats.size,
                        avgObjSize: stats.avgObjSize
                    };
                });
                
                // Output as JSON
                print(JSON.stringify(result, null, 2));
            } catch (err) {
                print(JSON.stringify({ 
                    status: "error", 
                    error: err.message 
                }, null, 2));
            }
"@
        
        # Write script to temp file
        Set-Content -Path $tempScriptPath -Value $mongoshScript
        
        # Execute mongosh with the script
        $result = & $MongoshPath --quiet --norc --file $tempScriptPath
        
        # Parse JSON result
        $dbInfo = $result | ConvertFrom-Json
        
        # Clean up temp script
        Remove-Item -Path $tempScriptPath -Force
        
        if ($dbInfo.status -eq "error") {
            Write-Host "❌ Failed to connect to $ConnectionName database: $($dbInfo.error)" -ForegroundColor Red
            return $null
        }
        
        Write-Host "✅ Successfully connected to $ConnectionName database (MongoDB v$($dbInfo.version))" -ForegroundColor Green
        Write-Host "   - Collections: $($dbInfo.collections.Count)" -ForegroundColor Green
        Write-Host "   - Database Size: $([math]::Round($dbInfo.dbStats.dataSize / 1MB, 2)) MB" -ForegroundColor Green
        
        return $dbInfo
    }
    catch {
        Write-Host "❌ Error connecting to $ConnectionName database: $_" -ForegroundColor Red
        return $null
    }
}

# Compare database statistics between local and Atlas
function Compare-Databases {
    param (
        [PSObject]$LocalDb,
        [PSObject]$AtlasDb
    )
    
    Write-Host ""
    Write-Host "Comparing databases..." -ForegroundColor Cyan
    
    # Compare number of collections
    $localCollections = $LocalDb.collections
    $atlasCollections = $AtlasDb.collections
    
    # Convert to sorted arrays for comparison
    $localCollections = @($localCollections | Sort-Object)
    $atlasCollections = @($atlasCollections | Sort-Object)
    
    # Compare collections
    $collectionsMatch = $true
    $onlyInLocal = @($localCollections | Where-Object { $atlasCollections -notcontains $_ })
    $onlyInAtlas = @($atlasCollections | Where-Object { $localCollections -notcontains $_ })
    
    Write-Host ""
    Write-Host "Collection Comparison:" -ForegroundColor Cyan
    Write-Host "=====================" -ForegroundColor Cyan
    
    if ($onlyInLocal.Count -gt 0 -or $onlyInAtlas.Count -gt 0) {
        $collectionsMatch = $false
        
        if ($onlyInLocal.Count -gt 0) {
            Write-Host "❌ Collections only in Local: $($onlyInLocal -join ', ')" -ForegroundColor Red
        }
        
        if ($onlyInAtlas.Count -gt 0) {
            Write-Host "❌ Collections only in Atlas: $($onlyInAtlas -join ', ')" -ForegroundColor Red
        }
    } else {
        Write-Host "✅ Both databases have the same collections" -ForegroundColor Green
    }
    
    # Compare document counts for each collection
    $documentsMatch = $true
    $sharedCollections = @($localCollections | Where-Object { $atlasCollections -contains $_ })
    
    Write-Host ""
    Write-Host "Document Count Comparison:" -ForegroundColor Cyan
    Write-Host "=========================" -ForegroundColor Cyan
    
    $comparisonTable = @()
    
    foreach ($coll in $sharedCollections) {
        $localCount = $LocalDb.collectionStats.$coll.count
        $atlasCount = $AtlasDb.collectionStats.$coll.count
        $match = $localCount -eq $atlasCount
        
        if (-not $match) {
            $documentsMatch = $false
        }
        
        $row = [PSCustomObject]@{
            Collection = $coll
            LocalCount = $localCount
            AtlasCount = $atlasCount
            Match = if ($match) { "✅" } else { "❌" }
            Difference = [int]$atlasCount - [int]$localCount
        }
        
        $comparisonTable += $row
    }
    
    # Display comparison table
    $comparisonTable | Format-Table -AutoSize
    
    # Overall match assessment
    Write-Host ""
    Write-Host "Overall Assessment:" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    
    if ($collectionsMatch -and $documentsMatch) {
        Write-Host "✅ DATABASES ARE IN SYNC" -ForegroundColor Green
        Write-Host "   Both databases have identical collections and document counts" -ForegroundColor Green
    } else {
        Write-Host "❌ DATABASES ARE NOT IN SYNC" -ForegroundColor Red
        
        if (-not $collectionsMatch) {
            Write-Host "   - Collections mismatch: The databases have different collections" -ForegroundColor Red
        }
        
        if (-not $documentsMatch) {
            Write-Host "   - Document counts mismatch: Some collections have different document counts" -ForegroundColor Red
        }
    }
}

# Main execution flow
Show-Banner

# Load environment variables from .env file
Import-EnvFile

# Find MongoDB tools
$mongoshPath = Find-MongoTools
if (-not $mongoshPath) {
    exit 1
}

# Get connection strings
$localUri, $atlasUri = Get-ConnectionStrings -LocalUriParam $LocalUri -AtlasUriParam $AtlasUri -DbName $DatabaseName

if (-not $localUri -or -not $atlasUri) {
    if (-not $localUri) {
        Write-Error "Missing Local MongoDB connection information."
    } else {
        Write-Error "Missing Atlas MongoDB connection information. See instructions above for configuring your .env file."
    }
    exit 1
}

# Test connections and get database information
$localDbInfo = Test-MongoConnection -ConnectionString $localUri -ConnectionName "Local" -DbName $DatabaseName -MongoshPath $mongoshPath
$atlasDbInfo = Test-MongoConnection -ConnectionString $atlasUri -ConnectionName "Atlas" -DbName $DatabaseName -MongoshPath $mongoshPath

if (-not $localDbInfo -or -not $atlasDbInfo) {
    Write-Error "Failed to connect to one or both databases. Please check your connection strings and network connectivity."
    exit 1
}

# Compare databases
Compare-Databases -LocalDb $localDbInfo -AtlasDb $atlasDbInfo

Write-Host ""
Write-Host "Test completed successfully!" -ForegroundColor Cyan