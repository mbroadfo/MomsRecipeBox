# MomsRecipeBox - API Tier

## Overview

MomsRecipeBox API Tier provides a RESTful backend service for storing, retrieving, and managing recipes along with their associated comments, images, and favorites. The application follows a modular architecture with dedicated handlers for each endpoint, making it easy to maintain and extend functionality.

## Quick Reference: Rebuilding the App Tier

```powershell
# Stop & clean
docker compose down --remove-orphans -v

# Rebuild only app
docker compose build --no-cache app

# Start services
docker compose up -d
```

For rapid iteration on code only (no dependency changes):

```powershell
docker compose restart app
```

## Directory Structure

- `handlers/` — Lambda-style handlers (one per endpoint)
- `models/` — Schema definitions and data validation
- `app.js` — MongoDB connection helper (`getDb`)
- `lambda.js` — Router / Lambda entry
- `local_server.js` — Local HTTP server + Swagger UI support
- `docs/` — API documentation including `swagger.yaml`
- `tests/` — End-to-end test scripts
- `utils/` — Utility functions

## Data Models and Implementation

### Comments System

Comments are stored as separate documents in a dedicated `comments` collection, providing better scalability, performance, and flexibility compared to embedded comments.

| Aspect        | Implementation |
| ------------- | -------------- |
| Storage       | `comments` collection (document per comment) |
| References    | `recipeId` field linking to recipe |
| Structure     | `{ _id, recipeId, user_id, content, created_at, updated_at }` |
| Indexes       | `recipeId` for efficient retrieval by recipe |
| API           | Standalone endpoints for CRUD operations |

Example comment document:

```javascript
{
  _id: ObjectId("5f8d0f3e1c9d440000d1f3f5"),
  recipeId: ObjectId("5f8d0f3e1c9d440000d1f3f4"),
  user_id: "auth0|123456789",
  content: "This recipe looks delicious!",
  created_at: ISODate("2025-08-19T10:30:00.000Z"),
  updated_at: ISODate("2025-08-19T11:15:00.000Z")
}
```

When retrieving a recipe, the `get_recipe.js` handler automatically includes associated comments from the collection in the recipe response. This design allows for:

- Better performance when dealing with large numbers of comments
- Independent access to comments without loading the entire recipe
- Easier comment management and moderation
- Simplified pagination and filtering capabilities

MongoDB indexes are created on the `recipeId` field for efficient retrieval of all comments for a specific recipe.

## Favorites / Likes Model

| Aspect        | Implementation |
| ------------- | -------------- |
| Storage       | `favorites` collection (document per user+recipe) |
| Uniqueness    | Compound unique index `{ recipeId:1, userId:1 }` |
| Count display | `likes_count` field on `recipes` (denormalized) |
| Toggle logic  | Insert/delete favorite + `$inc` `likes_count` safely |
| Response      | `{ liked, likes }` from `toggle_favorite.js` |

`get_recipe.js` backfills `likes_count` if missing (migration safety) by counting favorites.

## API Endpoints

| File                  | Method | Route                      | Description |
|-----------------------|--------|---------------------------|-------------|
| `list_recipes.js`     | GET    | /recipes                  | List all recipes |
| `get_recipe.js`       | GET    | /recipes/{id}             | Get recipe (with comments & likes) |
| `create_recipe.js`    | POST   | /recipes                  | Create recipe |
| `update_recipe.js`    | PUT    | /recipes/{id}             | Update recipe |
| `delete_recipe.js`    | DELETE | /recipes/{id}             | Delete recipe |
| `toggle_favorite.js`  | POST   | /recipes/{id}/like        | Toggle favorite (returns `{ liked, likes }`) |
| `post_comment.js`     | POST   | /recipes/{id}/comments    | Add comment to a recipe |
| `get_comment.js`      | GET    | /comments/{id}            | Get individual comment |
| `update_comment.js`   | PUT    | /comments/{id}            | Update comment content |
| `delete_comment.js`   | DELETE | /comments/{id}            | Delete comment |
| `upload_image.js`     | PUT    | /recipes/{id}/image       | Upload image (multipart) |
| `update_image.js`     | PUT    | /recipes/{id}/image       | Update image (base64 JSON) |
| `get_image.js`        | GET    | /recipes/{id}/image       | Retrieve image |
| `delete_image.js`     | DELETE | /recipes/{id}/image       | Delete image |

## Handler Pattern

```js
export default async function handler(event) {
  // validate input
  // const db = await getDb();
  // perform operation
  return { statusCode: 200, body: JSON.stringify(payload) };
}
```

## Testing

From `app/tests`:

```powershell
npm install        # first time
npm test           # runs all tests
node test_recipes.js      # run recipe tests only
node test_comments.js     # run comments test suite
node test_favorites.js    # run favorites test only
node test_images.js       # run image tests only
```

### Comments Test Flow

The `test_comments.js` script tests all comment functionality:

1. Create recipe for testing
2. POST comment to a recipe
3. GET comment by ID
4. GET recipe with comments
5. PUT (update) comment
6. DELETE comment

### Favorites Test Flow

The `test_favorites.js` script validates the favorites functionality:

1. Create recipe
2. User A like → `{ liked:true, likes:1 }`
3. User A unlike → `{ liked:false }`
4. User A like again → `{ liked:true }`
5. User B like → `{ liked:true, likes:2 }`
6. Fetch recipe → `likes_count === 2`

## Image Handling

The API supports both multipart form data and base64-encoded JSON payloads for image uploads. The `local_server.js` inspects the `Content-Type` header and routes the request to the appropriate handler for the unified `/recipes/{id}/image` endpoint.

## Error Handling

All handlers include robust error handling and return appropriate HTTP status codes (400/404/500) with JSON error messages. Binary responses (like images) set the appropriate headers and content disposition.

## Deployment Options

- The container is built from AWS Lambda Node.js 18 base image and can be deployed as a Lambda function URL or with API Gateway integration
- For local development, the application uses an Express-like HTTP server

## Security Considerations

- For production deployment, enforce authentication middleware (e.g., verify JWT, extract user ID)
- Add rate limiting and input validation for increased robustness
- Implement proper access control for comment operations

## Future Enhancements

| Area        | Potential Improvements |
|-------------|------------------------|
| Auth        | Integrate Auth0 verification & user context extraction |
| Comments    | Add pagination and filtering capabilities for recipes with many comments |
| Favorites   | Add listing & filtering endpoints (e.g., user favorites feed) |
| Metrics     | Expose like/comment analytics endpoint |
| Caching     | Consider caching hot recipe data + counts (Redis) |

---

For questions or contributions, update `swagger.yaml` and add tests to cover new behavior.
