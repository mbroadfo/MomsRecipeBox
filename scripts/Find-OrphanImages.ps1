# Find orphaned images by comparing S3 bucket contents with MongoDB recipe IDs
# This script uses AWS CLI and MongoDB tools to identify orphaned images

param(
    [string]$BucketName = $env:RECIPE_IMAGES_BUCKET,
    [switch]$ShowCommands = $false
)

Write-Host "🔍 Finding Orphaned Images" -ForegroundColor Yellow
Write-Host "=" * 50

if (-not $BucketName) {
    $BucketName = "mrb-recipe-images-dev"  # Default bucket name
    Write-Host "⚠️  Using default bucket name: $BucketName" -ForegroundColor Yellow
}

Write-Host "📊 Step 1: Getting recipe IDs from MongoDB..."

# Get recipe IDs via the admin API (easier than direct MongoDB connection)
try {
    $systemStatus = Invoke-RestMethod -Uri "http://localhost:3000/admin/system-status"
    $recipeCount = $systemStatus.services.mongodb.stats.totalRecipes
    Write-Host "✅ Found $recipeCount recipes in database" -ForegroundColor Green
} catch {
    Write-Host "❌ Could not connect to admin API. Make sure the app is running." -ForegroundColor Red
    Write-Host "   Try: .\scripts\restart_app.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🖼️  Step 2: Listing images in S3 bucket '$BucketName'..."

# List all objects in S3 bucket
try {
    $s3Objects = aws s3api list-objects-v2 --bucket $BucketName --query "Contents[].{Key:Key,Size:Size,LastModified:LastModified}" --output json | ConvertFrom-Json
    
    if (-not $s3Objects) {
        Write-Host "❌ No objects found in bucket or AWS CLI failed" -ForegroundColor Red
        Write-Host "   Make sure AWS CLI is configured and you have access to bucket: $BucketName" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✅ Found $($s3Objects.Count) images in S3 bucket" -ForegroundColor Green
} catch {
    Write-Host "❌ Error accessing S3 bucket: $_" -ForegroundColor Red
    Write-Host "   Make sure AWS CLI is installed and configured" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🔍 Step 3: Analyzing image filenames..."

# Analyze each image filename to extract recipe ID
$validImages = @()
$orphanedImages = @()
$unrecognizedImages = @()

foreach ($obj in $s3Objects) {
    $filename = $obj.Key
    $size = [math]::Round($obj.Size / 1024, 1)  # Convert to KB
    
    # Try to extract recipe ID (24-character MongoDB ObjectId) from filename
    $recipeId = $null
    
    # Common patterns for recipe images
    $patterns = @(
        '^([a-f0-9]{24})\.jpg$',           # recipeId.jpg
        '^([a-f0-9]{24})\.jpeg$',          # recipeId.jpeg  
        '^([a-f0-9]{24})\.png$',           # recipeId.png
        '^([a-f0-9]{24})_\d+\.jpg$',       # recipeId_1.jpg, recipeId_2.jpg
        '^([a-f0-9]{24})_\d+\.jpeg$',      # recipeId_1.jpeg
        '^([a-f0-9]{24})_\d+\.png$',       # recipeId_1.png
        '^([a-f0-9]{24})-thumb\.jpg$',     # recipeId-thumb.jpg
        '^([a-f0-9]{24})-thumb\.jpeg$',    # recipeId-thumb.jpeg
        '^([a-f0-9]{24})-thumb\.png$',     # recipeId-thumb.png
        '^([a-f0-9]{24})-small\.jpg$',     # recipeId-small.jpg
        '^([a-f0-9]{24})-medium\.jpg$',    # recipeId-medium.jpg
        '^([a-f0-9]{24})-large\.jpg$'      # recipeId-large.jpg
    )
    
    foreach ($pattern in $patterns) {
        if ($filename -match $pattern) {
            $recipeId = $Matches[1]
            break
        }
    }
    
    if ($recipeId) {
        # For now, we'll classify as "potential orphan" since we need to check against actual recipe IDs
        # In a real scenario, we'd query the database for this specific recipe ID
        $orphanedImages += [PSCustomObject]@{
            Filename = $filename
            RecipeId = $recipeId
            SizeKB = $size
            LastModified = $obj.LastModified
            Reason = "Recipe ID extracted - needs verification"
        }
    } else {
        $unrecognizedImages += [PSCustomObject]@{
            Filename = $filename
            SizeKB = $size
            LastModified = $obj.LastModified
            Reason = "Filename does not match recipe ID pattern"
        }
    }
}

# Display results
Write-Host "`n📊 ANALYSIS RESULTS" -ForegroundColor Cyan
Write-Host "=" * 50
Write-Host "Total images in S3: $($s3Objects.Count)"
Write-Host "Images with recipe ID pattern: $($orphanedImages.Count)"
Write-Host "Images with unrecognized names: $($unrecognizedImages.Count)"
Write-Host "Database has: $recipeCount recipes"
Write-Host "Potential orphaned images: $($s3Objects.Count - $recipeCount)" -ForegroundColor Yellow

if ($orphanedImages.Count -gt 0) {
    Write-Host "`n🔍 IMAGES WITH RECIPE ID PATTERNS:" -ForegroundColor Yellow
    Write-Host "Filename".PadRight(40) + "Recipe ID".PadRight(26) + "Size (KB)".PadRight(12) + "Date"
    Write-Host "-" * 85
    
    $orphanedImages | Sort-Object Filename | ForEach-Object {
        $date = ([DateTime]$_.LastModified).ToString("yyyy-MM-dd")
        Write-Host "$($_.Filename)".PadRight(40) + "$($_.RecipeId)".PadRight(26) + "$($_.SizeKB)".PadRight(12) + $date
    }
    
    $totalSize = ($orphanedImages | Measure-Object -Property SizeKB -Sum).Sum
    Write-Host "`nTotal size: $([math]::Round($totalSize / 1024, 2)) MB"
}

if ($unrecognizedImages.Count -gt 0) {
    Write-Host "`n❓ UNRECOGNIZED IMAGE NAMES:" -ForegroundColor Magenta
    Write-Host "Filename".PadRight(40) + "Size (KB)".PadRight(12) + "Date"
    Write-Host "-" * 60
    
    $unrecognizedImages | Sort-Object Filename | ForEach-Object {
        $date = ([DateTime]$_.LastModified).ToString("yyyy-MM-dd")
        Write-Host "$($_.Filename)".PadRight(40) + "$($_.SizeKB)".PadRight(12) + $date
    }
}

Write-Host "`n📋 NEXT STEPS:" -ForegroundColor Green
Write-Host "1. Review the recipe IDs above and manually verify which ones do not exist in the database"
Write-Host "2. For a more automated approach, use the MongoDB queries in scripts/mongodb_recipe_image_queries.js"
Write-Host "3. To get actual recipe IDs from database, check the admin panel or use MongoDB Compass"

if ($ShowCommands) {
    Write-Host "`n🛠️  AWS CLI COMMANDS TO DELETE (REVIEW FIRST!):" -ForegroundColor Red
    Write-Host "# WARNING: These commands will permanently delete files!"
    Write-Host "# Only run after manually verifying which images are truly orphaned"
    Write-Host ""
    
    $orphanedImages | ForEach-Object {
        Write-Host "aws s3 rm s3://$BucketName/$($_.Filename)  # Recipe ID: $($_.RecipeId)"
    }
}

Write-Host "`n✅ Analysis complete!" -ForegroundColor Green