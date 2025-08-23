# MomsRecipeBox - API Tier (2025)

## Update Summary (Recent Changes)

- **Test Suite Organization** (Aug 2025):
  - Split tests into separate files for better maintainability
  - Created dedicated `test_comments.js` for comment API testing
  - Updated `test_recipes.js` to focus solely on recipe operations
  - Added all test modules to main test script in package.json

- **Favorites Implementation** (Earlier):
  - Added scalable favorites model (`favorites` collection + denormalized `likes_count`)
  - New handler: `toggle_favorite.js` replaces legacy like handler for `POST /recipes/{id}/like`
  - Removed obsolete `post_like.js` (favorites model fully migrated)
  - `create_recipe.js` initializes `likes_count: 0` on new recipes
  - `get_recipe.js` ensures `likes_count` present and adds placeholder `liked` field (per-user like pending auth integration)
  - Added end-to-end test `test_favorites.js` validating multi-user toggle & count integrity

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

## Directory Overview

- `handlers/` — Lambda-style handlers (one per endpoint).
- `toggle_favorite.js` — Favorites/like toggle (authoritative).
- `app.js` — MongoDB connection helper (`getDb`).
- `lambda.js` — Router / Lambda entry (routes `/recipes/:id/like` to `toggle_favorite`).
- `local_server.js` — Local HTTP server + Swagger UI support.
- `docs/swagger.yaml` — OpenAPI definitions.
- `tests/` — E2E scripts (`test_recipes.js`, `test_images.js`, `test_comments.js`, `test_favorites.js`).

## Favorites / Likes Model

| Aspect        | Implementation |
| ------------- | -------------- |
| Storage       | `favorites` collection (document per user+recipe) |
| Uniqueness    | Compound unique index `{ recipeId:1, userId:1 }` |
| Count display | `likes_count` field on `recipes` (denormalized) |
| Toggle logic  | Insert/delete favorite + `$inc` `likes_count` safely |
| Response      | `{ liked, likes }` from `toggle_favorite.js` |

`get_recipe.js` backfills `likes_count` if missing (migration safety) by counting favorites.

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

From `app/tests`:

```powershell
npm install        # first time
npm test           # runs all tests (recipes, images, comments, favorites)
npm run test:recipes   # run recipe tests only
npm run test:images    # run image tests only
npm run test:comments  # run comment tests only
npm run test:favorites # run favorites tests only
```

### Test Modules

- `test_recipes.js` - Tests basic recipe CRUD and like operations
- `test_comments.js` - Tests comment functionality (create, read, update, delete)
- `test_images.js` - Tests image upload, retrieval, update, and deletion
- `test_favorites.js` - Tests the favorites/likes functionality

#### Favorites Test Sequence

1. Create recipe → expects 201.
2. User A like → `{ liked:true, likes:1 }`.
3. User A unlike → `{ liked:false }`.
4. User A like again → `{ liked:true }`.
5. User B like → `{ liked:true, likes:2 }`.
6. Fetch recipe → `likes_count === 2 }`.

## Implementation Notes

- Idempotent index creation inside `toggle_favorite.js` (cheap after first run).
- Race handling: duplicate insert (code 11000) treated as liked; count remains correct.
- Future enhancement: derive `userId` from Auth0 JWT; remove need for explicit `user_id` body field.
- `liked` per-user state currently always `false` on GET (no auth context); UI initializes heart off unless toggled.

## Image Handling

Supports both multipart and base64 JSON payloads. `local_server.js` inspects `Content-Type` and dispatches to appropriate handler for unified `/recipes/{id}/image` route.

## Error Handling

All handlers catch and return 400/404/500 with JSON `{ message|error }`. Binary responses (images) set appropriate headers + optional inline disposition.

## Deployment Considerations

- Container built from AWS Lambda Node.js 18 base image — can deploy as Lambda function URL / API Gateway integration.
- For production, enforce auth middleware (e.g., verify JWT, extract `sub` -> `userId`).
- Add rate limiting / input validation (e.g., `zod`) for robustness.

## TODO / Next Steps

| Area        | Action |
|-------------|--------|
| Auth        | Integrate Auth0 verification & user context extraction |
| Favorites   | Add listing & filtering endpoints (e.g., user favorites feed) |
| Metrics     | Expose like/favorite analytics endpoint (optional) |
| Caching     | Consider caching hot recipe data + counts (Redis) if needed |

---

For questions or contributions, update `swagger.yaml` and add tests to cover new behavior.
