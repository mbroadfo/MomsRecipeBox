# MomsRecipeBox - API Tier (2025)

## Overview

MomsRecipeBox API provides a complete backend for recipe management, including recipe storage, comments, favorites, and image handling. Built with a modern serverless architecture in mind, it can be run locally or deployed to AWS Lambda. The API includes comprehensive image handling with proper metadata management and cache control for optimal user experience.

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
- `app.js` — MongoDB connection helper (`getDb`)
- `lambda.js` — Router / Lambda entry
- `local_server.js` — Local HTTP server + Swagger UI
- `docs/swagger.yaml` — OpenAPI definitions
- `tests/` — End-to-end test modules for all API features
- `models/` — Data schemas and validation logic

## Favorites / Likes System

The API implements a scalable favorites system with the following characteristics:

| Aspect        | Implementation |
| ------------- | -------------- |
| Storage       | `favorites` collection (document per user+recipe) |
| Uniqueness    | Compound unique index `{ recipeId:1, userId:1 }` |
| Count display | `likes_count` field on `recipes` (denormalized) |
| Toggle logic  | Insert/delete favorite + `$inc` `likes_count` atomically |
| Response      | `{ liked, likes }` from like toggle endpoint |

The implementation ensures consistency between the favorites collection and the denormalized count on recipes.

## RESTful Routes & Handlers (Excerpt)

| File                  | Method | Route                      | Description |
|-----------------------|--------|---------------------------|-------------|
| `list_recipes.js`     | GET    | /recipes                  | List all recipes |
| `get_recipe.js`       | GET    | /recipes/{id}             | Get recipe (with `likes_count`) |
| `create_recipe.js`    | POST   | /recipes                  | Create recipe (`likes_count:0`) |
| `update_recipe.js`    | PUT    | /recipes/{id}             | Update recipe |
| `delete_recipe.js`    | DELETE | /recipes/{id}             | Delete recipe |
| `toggle_favorite.js`  | POST   | /recipes/{id}/like        | Toggle favorite (returns `{ liked, likes }`) |
| `post_comment.js`     | POST   | /recipes/{id}/comments    | Add comment |
| `update_comment.js`   | PUT    | /comments/{id}            | Update comment |
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

The API comes with a comprehensive test suite covering all major functionality. Run tests from the `app/tests` directory:

```powershell
npm install        # first time
npm test           # runs all tests
```

You can also run specific test modules:

```powershell
npm run test:recipes   # recipe CRUD operations
npm run test:comments  # comment functionality
npm run test:images    # image handling
npm run test:favorites # favorites/likes system
```

Each test module (`test_recipes.js`, `test_comments.js`, `test_images.js`, `test_favorites.js`) covers its respective functionality with end-to-end tests against a running API server.

## Technical Details

- **Favorites System**: Uses idempotent index creation and handles race conditions (duplicate inserts) with proper error handling to maintain count integrity.
- **Authentication**: Currently accepts user ID in request body. Designed to integrate with Auth0 JWT tokens.
- **Comments**: Implemented as a separate collection with references to recipes for scalability.
- **Images**: Supports both multipart form uploads and base64 JSON payloads. The `local_server.js` inspects `Content-Type` and dispatches to the appropriate handler for the unified `/recipes/{id}/image` route. All metadata values are properly converted to strings for S3 compatibility.

## Error Handling

All handlers catch and return 400/404/500 with JSON `{ message|error }`. Binary responses (images) set appropriate headers + optional inline disposition.

## Deployment Considerations

- Container built from AWS Lambda Node.js 18 base image — can deploy as Lambda function URL / API Gateway integration.
- For production, enforce auth middleware (e.g., verify JWT, extract `sub` -> `userId`).
- Add rate limiting / input validation (e.g., `zod`) for robustness.

## Features & Roadmap

| Feature | Status | Description |
|---------|--------|-------------|
| Recipe Management | Complete | Create, read, update, delete recipes with ingredients and instructions |
| Comments | Complete | Add, update, delete, and retrieve comments on recipes |
| Image Handling | Complete | Upload, update, retrieve, and delete images for recipes |
| Favorites System | Complete | Like/unlike recipes with proper count management |
| Auth Integration | Planned | Full Auth0 JWT integration for secure user identification |
| User Favorites Feed | Planned | Endpoint to list all recipes favorited by a user |
| Analytics | Planned | Endpoints to expose recipe popularity and engagement metrics |

---

For questions or contributions, update `swagger.yaml` and add tests to cover new behavior.
