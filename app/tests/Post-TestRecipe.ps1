# Post-TestRecipe.ps1
# Full lifecycle test: Create, Retrieve, Comment, Like, Update, and Delete

$baseUrl = "http://localhost:3000"

$recipe = @{
    owner_id = "auth0|testuser"
    visibility = "public"
    status = "published"
    title = "Test Recipe from PowerShell"
    subtitle = "Delicious automation"
    description = "A sample recipe to verify API connectivity"
    image_url = "https://example.com/test-image.jpg"
    tags = @("powershell", "test", "automation")
    sections = @(
        @{ section_type = "Instructions"; content = "Mix everything together."; position = 1 },
        @{ section_type = "Notes"; content = "Tastes better warm."; position = 2 }
    )
    ingredients = @(
        @{ name = "Flour"; quantity = "2 cups"; position = 1 },
        @{ name = "Sugar"; quantity = "1 cup"; position = 2 },
        @{ name = "Salt"; quantity = "1 tsp"; position = 3 }
    )
}

$bodyJson = $recipe | ConvertTo-Json -Depth 5
Write-Host "`nPosting new recipe..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "$baseUrl/recipes" -Method POST -ContentType "application/json" -Body $bodyJson
$response | ConvertTo-Json -Depth 5
$recipe_id = $response._id


Start-Sleep -Seconds 1

Write-Host "`nFetching single recipe with expand=full..."
$singleRecipe = Invoke-RestMethod -Uri "$baseUrl/recipes/$recipe_id?expand=full" -Method GET
$singleRecipe | ConvertTo-Json -Depth 5 | Write-Output


# Post a comment
Write-Host "`nPosting a comment..."
$comment = @{ author_id = "auth0|testuser"; content = "This is a test comment" } | ConvertTo-Json
$commentResponse = Invoke-RestMethod -Uri "$baseUrl/recipes/$recipe_id/comments" -Method POST -ContentType "application/json" -Body $comment
$comment_id = $commentResponse._id
$commentResponse | ConvertTo-Json -Depth 5 | Write-Output


# Update the comment
Write-Host "`nUpdating the comment..."
$updateComment = @{ content = "Updated comment content" } | ConvertTo-Json
$updateResponse = Invoke-RestMethod -Uri "$baseUrl/comments/$comment_id" -Method PUT -ContentType "application/json" -Body $updateComment
$updateResponse | ConvertTo-Json -Depth 5 | Write-Output


# Like the recipe
Write-Host "`nToggling like on the recipe..."
$likeToggle = @{ user_id = "auth0|testuser" } | ConvertTo-Json
$likeResponse = Invoke-RestMethod -Uri "$baseUrl/recipes/$recipe_id/like" -Method POST -ContentType "application/json" -Body $likeToggle
$likeResponse | ConvertTo-Json -Depth 5 | Write-Output


# Toggle like again to unlike
Write-Host "`nToggling like off the recipe..."
$unlikeResponse = Invoke-RestMethod -Uri "$baseUrl/recipes/$recipe_id/like" -Method POST -ContentType "application/json" -Body $likeToggle
$unlikeResponse | ConvertTo-Json -Depth 5 | Write-Output


# Delete the comment
Write-Host "`nDeleting the comment..."
$deleteCommentResponse = Invoke-RestMethod -Uri "$baseUrl/comments/$comment_id" -Method DELETE
$deleteCommentResponse | ConvertTo-Json -Depth 5 | Write-Output


# Delete the recipe
Write-Host "`nDeleting the recipe..."
$deleteRecipeResponse = Invoke-RestMethod -Uri "$baseUrl/recipes/$recipe_id" -Method DELETE
$deleteRecipeResponse | ConvertTo-Json -Depth 5 | Write-Output
