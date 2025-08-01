## Quick Reference: Rebuilding the App Tier

For best results after making changes to the app-tier (code, dependencies, Dockerfile), use the following workflow:

```powershell
docker compose down --remove-orphans -v   # Stop and remove all containers, networks, and volumes
docker compose build --no-cache app       # Rebuild the app container from scratch
docker compose up -d                     # Start all services in detached mode
```

This ensures a clean environment and that all changes are reflected in the running containers. For rapid iteration on code only, you may use `docker compose restart app` instead.

# MomsRecipeBox - API Tier (2025)

This directory contains the ESM-based, containerized backend for the MomsRecipeBox API. All route handlers are modular, use centralized MongoDB logic, and follow RESTful conventions.

## Directory Overview

- `handlers/` — Each file is a Lambda-style handler for a single HTTP endpoint (see below).
- `app.js` — Centralized MongoDB connection logic (`getDb`).
- `lambda.js` — Entrypoint for AWS Lambda and local server, routes requests to handlers.
- `local_server.js` — Custom HTTP server for local development and Swagger UI.
- `Dockerfile` — AWS Lambda Node.js 18 base image for containerization.
- `docs/swagger.yaml` — OpenAPI definitions for all endpoints.

## Handler Structure

Each handler exports an async function and receives an `event` object:

```js
export default async function handler(event) {
  // Extract path parameters, body, etc.
  // Validate input
  // Use centralized getDb() for database access
  // Return { statusCode, body }
}
```

## RESTful Routes & Handlers

| File Name             | Method | Route                          | Description                       |
|-----------------------|--------|-------------------------------|-----------------------------------|
| `list_recipes.js`     | GET    | /recipes                      | List all recipes                   |
| `get_recipe.js`       | GET    | /recipes/{id}                 | Get a recipe by ID                 |
| `create_recipe.js`    | POST   | /recipes                      | Create a new recipe                |
| `update_recipe.js`    | PUT    | /recipes/{id}                 | Update an existing recipe          |
| `delete_recipe.js`    | DELETE | /recipes/{id}                 | Delete a recipe and its comments   |
| `post_comment.js`     | POST   | /recipes/{id}/comments        | Add a comment to a recipe          |
| `update_comment.js`   | PUT    | /comments/{id}                | Update a comment                   |
| `delete_comment.js`   | DELETE | /comments/{id}                | Delete a comment by ID             |
| `post_like.js`        | POST   | /recipes/{id}/like            | Like or unlike a recipe            |

## Key Features & Principles

- **ESM Only:** All code uses modern ES modules (`import/export`).
- **Centralized DB Logic:** All handlers use `getDb()` from `app.js`.
- **RESTful API:** All endpoints use path parameters, not query strings.
- **Containerized:** Runs in AWS Lambda base image, local dev via Docker Compose.
- **Swagger UI:** Available at `/api-docs` (see `local_server.js`).
- **No Legacy Code:** All obsolete files and logic (e.g., recipes.js, SQL, Express) have been removed.


## Local Development & Testing

- Start the app tier with `Start-MrbApp.ps1` (PowerShell) or via Docker Compose.
- API endpoints and contracts are defined in `docs/swagger.yaml`.

### Full Lifecycle Testing

The API is validated end-to-end using a PowerShell script:

**Script:** `app/tests/Post-TestRecipe.ps1`

**What it does:**
- Creates a recipe
- Fetches the recipe
- Adds a comment
- Updates the recipe
- Likes/unlikes the recipe
- Deletes the comment
- Deletes the recipe

**How to run:**

```powershell
cd app/tests
./Post-TestRecipe.ps1
```

This script will output the result of each API operation and report any failures. Ensure the app tier is running before executing the test.

## Contributing

- Add new handlers in `handlers/` following the established conventions.
- Use ESM imports and centralized DB logic.
- Update `swagger.yaml` for any new endpoints.

---

For questions or to contribute, contact the MomsRecipeBox dev team or refer to `swagger.yaml` in the `/docs` folder for endpoint definitions.
