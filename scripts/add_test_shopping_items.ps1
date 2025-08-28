# Set up a new HTTP endpoint to add test shopping list items
# This script will create a new endpoint in local_server.js 
# to let us easily add test items to the shopping list

# First, check if the local server is available
try {
    Invoke-WebRequest -Uri "http://localhost:3000/recipes?limit=1" -TimeoutSec 2 | Out-Null
    Write-Host "Local server is running"
}
catch {
    Write-Host "Local server not responding. Please make sure it's running"
    Write-Host "Error: $_"
    exit 1
}

# Create a test recipe with shopping list items
$userId = "auth0|testuser"
$recipePayload = @{
    title = "Test Recipe for Shopping List"
    description = "A test recipe created via script"
    tags = @("test", "automated")
    visibility = "public"
    owner_id = $userId
    ingredients = @(
        @{
            name = "Flour"
            quantity = "2 cups"
            position = 1
        },
        @{
            name = "Sugar"
            quantity = "1/2 cup"
            position = 2
        },
        @{
            name = "Eggs"
            quantity = "2 large"
            position = 3
        },
        @{
            name = "Milk"
            quantity = "1 cup"
            position = 4
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Creating test recipe..."
$recipeResponse = Invoke-RestMethod -Uri "http://localhost:3000/recipes" -Method Post -Body $recipePayload -ContentType "application/json"
$recipeId = $recipeResponse._id
Write-Host "Created recipe with ID: $recipeId"

# Add items to shopping list
$shoppingListPayload = @{
    user_id = $userId
    items = @(
        @{
            ingredient = "2 cups Flour"
            recipe_id = $recipeId
            recipe_title = "Test Recipe for Shopping List"
        },
        @{
            ingredient = "1/2 cup Sugar"
            recipe_id = $recipeId
            recipe_title = "Test Recipe for Shopping List"
        },
        @{
            ingredient = "2 large Eggs"
            recipe_id = $recipeId
            recipe_title = "Test Recipe for Shopping List"
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Adding items to shopping list..."
$shoppingListResponse = Invoke-RestMethod -Uri "http://localhost:3000/shopping-list/add" -Method Post -Body $shoppingListPayload -ContentType "application/json"
Write-Host "Response:" ($shoppingListResponse | ConvertTo-Json -Depth 5)
Write-Host "Items added successfully"

Write-Host "--------------------------------------------"
Write-Host "Success! The shopping list has been updated."
Write-Host "Please refresh your browser to see the items."
Write-Host "--------------------------------------------"
