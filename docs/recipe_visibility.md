# Recipe Visibility Guide

## Recipe Visibility Model

The Mom's Recipe Box application uses a visibility system to control which recipes are displayed to users:

### Visibility Types

- **Public**: Visible to all users (12 recipes in the database)
- **Private**: Only visible to the owner (35 recipes in the database)
- **Undefined/Null**: Treated as public for backward compatibility (20 recipes in the database)

### Recipe Ownership

Recipes in the database have the following ownership patterns:

- No owner specified (undefined/null owner): 53 recipes
- Owner "auth0|test-user": 8 recipes
- Owner "demo-user": 6 recipes

### Visibility Rules

When listing recipes, the application follows these rules:

1. If a specific visibility filter is provided, use only that filter
2. Otherwise, show recipes that match ANY of these conditions:
   - Public recipes (regardless of owner)
   - Private recipes owned by the current user
   - Recipes with undefined/null visibility (legacy support)

### Default User

The application uses "demo-user" as the default user ID when no user is logged in.

## Visibility Distribution

Based on our database analysis, here's the breakdown:

| Visibility | Owner | Count | Example |
|------------|-------|-------|---------|
| undefined | undefined | 20 | Easy Baked Polenta |
| private | undefined | 29 | Fav Test |
| private | demo-user | 6 | New Recipe (includes Apple Pandowdy) |
| public | undefined | 4 | Beef Short Rib Ragu |
| public | auth0\|test-user | 8 | Creamy Mushroom Garlic Soup |

## Troubleshooting Visibility Issues

If recipes aren't showing up as expected:

1. Check the recipe's `visibility` field (should be "public", "private", or undefined)
2. Check the recipe's `owner_id` field (should match the current user for private recipes)
3. Verify the user ID being passed in the API request (defaults to "demo-user")
4. Ensure the list_recipes handler is applying the visibility rules correctly
