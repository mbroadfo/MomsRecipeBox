# Simple script to find orphaned images
param([string]$BucketName = "mrb-recipe-images-dev")

Write-Host "Finding Orphaned Images" -ForegroundColor Yellow
Write-Host "=" * 50

# Step 1: Get recipe count from admin API
Write-Host "Step 1: Getting recipe count from MongoDB..."
try {
    $systemStatus = Invoke-RestMethod -Uri "http://localhost:3000/admin/system-status"
    $recipeCount = $systemStatus.services.mongodb.stats.totalRecipes
    Write-Host "Found $recipeCount recipes in database" -ForegroundColor Green
} catch {
    Write-Host "Could not connect to admin API. Make sure app is running." -ForegroundColor Red
    exit 1
}

# Step 2: List S3 images
Write-Host "`nStep 2: Listing images in S3 bucket '$BucketName'..."
try {
    $s3Objects = aws s3api list-objects-v2 --bucket $BucketName --query "Contents[].{Key:Key,Size:Size,LastModified:LastModified}" --output json | ConvertFrom-Json
    Write-Host "Found $($s3Objects.Count) images in S3 bucket" -ForegroundColor Green
} catch {
    Write-Host "Error accessing S3 bucket" -ForegroundColor Red
    exit 1
}

# Step 3: Analyze filenames
Write-Host "`nStep 3: Analyzing image filenames..."
$imagesWith24CharIds = @()
$otherImages = @()

foreach ($obj in $s3Objects) {
    $filename = $obj.Key
    $size = [math]::Round($obj.Size / 1024, 1)
    
    # Check if filename starts with 24-character hex string (MongoDB ObjectId)
    if ($filename -match '^([a-f0-9]{24})') {
        $recipeId = $Matches[1]
        $imagesWith24CharIds += [PSCustomObject]@{
            Filename = $filename
            RecipeId = $recipeId
            SizeKB = $size
            LastModified = $obj.LastModified
        }
    } else {
        $otherImages += [PSCustomObject]@{
            Filename = $filename
            SizeKB = $size
            LastModified = $obj.LastModified
        }
    }
}

# Display results
Write-Host "`nANALYSIS RESULTS" -ForegroundColor Cyan
Write-Host "Total images in S3: $($s3Objects.Count)"
Write-Host "Images with recipe ID pattern: $($imagesWith24CharIds.Count)"
Write-Host "Images with other names: $($otherImages.Count)"
Write-Host "Database has: $recipeCount recipes"
Write-Host "Potential orphaned images: $($s3Objects.Count - $recipeCount)" -ForegroundColor Yellow

if ($imagesWith24CharIds.Count -gt 0) {
    Write-Host "`nIMAGES WITH RECIPE ID PATTERNS:" -ForegroundColor Yellow
    $imagesWith24CharIds | Sort-Object RecipeId | ForEach-Object {
        $date = ([DateTime]$_.LastModified).ToString("yyyy-MM-dd")
        Write-Host "$($_.Filename) | $($_.RecipeId) | $($_.SizeKB) KB | $date"
    }
}

if ($otherImages.Count -gt 0) {
    Write-Host "`nIMAGES WITH OTHER NAMES:" -ForegroundColor Magenta
    $otherImages | ForEach-Object {
        $date = ([DateTime]$_.LastModified).ToString("yyyy-MM-dd") 
        Write-Host "$($_.Filename) | $($_.SizeKB) KB | $date"
    }
}

Write-Host "`nTo identify actual orphans, compare the recipe IDs above with your database" -ForegroundColor Green