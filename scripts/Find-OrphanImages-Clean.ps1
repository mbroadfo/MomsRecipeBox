# Find orphaned images by comparing S3 images with actual recipe IDs from database
# This script identifies images that don't correspond to any recipe in the database

Write-Host "Find Orphaned Images - Final Analysis" -ForegroundColor Cyan
Write-Host "=" * 60

# Get S3 images (excluding default.png)
Write-Host "Getting S3 images from mrb-recipe-images-dev bucket..."
$s3Images = aws s3 ls s3://mrb-recipe-images-dev/ --profile mrb-api | Where-Object { 
    $_ -match '\.(jpg|jpeg|png|gif|webp)$' -and $_ -notmatch 'default\.png' 
} | ForEach-Object {
    ($_ -split '\s+')[-1]  # Get just the filename
}

Write-Host "Found $($s3Images.Count) images in S3 (excluding default.png)"

# Get recipe IDs from database via API
Write-Host "Getting recipe IDs from database..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/admin/recipe-ids" -Method GET
    $recipeIds = $response.recipeIds
    Write-Host "Found $($recipeIds.Count) recipes in database"
} catch {
    Write-Host "Failed to get recipe IDs from database: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Extract ObjectId patterns from S3 images (24-character hex strings)
$imageIds = @()
foreach ($image in $s3Images) {
    if ($image -match '^([a-f0-9]{24})\.(jpg|jpeg|png|gif|webp)$') {
        $imageIds += $matches[1]
    }
}

Write-Host "Found $($imageIds.Count) images with ObjectId patterns"

# Find orphaned images
$orphanedImages = @()
$validImages = @()

foreach ($imageId in $imageIds) {
    if ($recipeIds -contains $imageId) {
        $validImages += $imageId
    } else {
        $orphanedImages += $imageId
    }
}

# Results
Write-Host ""
Write-Host "ANALYSIS RESULTS" -ForegroundColor Yellow
Write-Host "=" * 40

Write-Host "Total S3 images (excluding default.png): $($s3Images.Count)"
Write-Host "Total recipes in database: $($recipeIds.Count)"
Write-Host "Valid images (match recipe IDs): $($validImages.Count)"
Write-Host "Orphaned images (no matching recipe): $($orphanedImages.Count)"

if ($orphanedImages.Count -gt 0) {
    Write-Host ""
    Write-Host "ORPHANED IMAGES TO DELETE:" -ForegroundColor Red
    Write-Host "-" * 30
    
    $totalSize = 0
    foreach ($orphanId in $orphanedImages) {
        # Find the actual filename with extension
        $orphanFile = $s3Images | Where-Object { $_ -match "^$orphanId\." }
        if ($orphanFile) {
            Write-Host "   $orphanFile"
            
            # Get file size
            $fileInfo = aws s3 ls "s3://mrb-recipe-images-dev/$orphanFile" --profile mrb-api
            if ($fileInfo -match '\s+(\d+)\s+') {
                $totalSize += [int]$matches[1]
            }
        }
    }
    
    # Convert size to MB
    $sizeMB = [math]::Round($totalSize / 1MB, 2)
    Write-Host ""
    Write-Host "Total size of orphaned images: $sizeMB MB" -ForegroundColor Yellow
    
    # Generate deletion commands
    Write-Host ""
    Write-Host "DELETE COMMANDS:" -ForegroundColor Yellow
    Write-Host "-" * 15
    Write-Host "# Individual deletions:"
    foreach ($orphanId in $orphanedImages) {
        $orphanFile = $s3Images | Where-Object { $_ -match "^$orphanId\." }
        if ($orphanFile) {
            Write-Host "aws s3 rm s3://mrb-recipe-images-dev/$orphanFile --profile mrb-api"
        }
    }
    
} else {
    Write-Host "No orphaned images found! All S3 images correspond to recipes in the database." -ForegroundColor Green
}

Write-Host ""
Write-Host "Analysis complete!" -ForegroundColor Green