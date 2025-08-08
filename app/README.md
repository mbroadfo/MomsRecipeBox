# MomsRecipeBox - API Tier (2025)

## Quick Reference: Rebuilding the App Tier

For best results after making changes to the app-tier (code, dependencies, Dockerfile), use the following workflow:

```bash
# Stop and remove all containers, networks, and volumes
docker compose down --remove-orphans -v

# Rebuild the app container from scratch
docker compose build --no-cache app

# Start all services in detached mode
docker compose up -d
```

This ensures a clean environment and that all changes are reflected in the running containers. For rapid iteration on code only, you may use `docker compose restart app` instead.

This directory contains the ESM-based, containerized backend for the MomsRecipeBox API. All route handlers are modular, use centralized MongoDB logic, and follow RESTful conventions.

## Directory Overview

- `handlers/` — Each file is a Lambda-style handler for a single HTTP endpoint (see below).
- `app.js` — Centralized MongoDB connection logic (`getDb`).
- `lambda.js` — Entrypoint for AWS Lambda and local server, routes requests to handlers.
- `local_server.js` — Custom HTTP server for local development and Swagger UI.
- `Dockerfile` — AWS Lambda Node.js 18 base image for containerization.
- `docs/swagger.yaml` — OpenAPI definitions for all endpoints.
- `tests/` — End-to-end test scripts for API validation, including recipe and image operations.

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

### Image API Endpoints

| File Name             | Method | Route                          | Description                       |
|-----------------------|--------|-------------------------------|-----------------------------------|
| `upload_image.js`     | PUT    | /recipes/{id}/image           | Upload a recipe image via multipart/form-data |
| `update_image.js`     | PUT    | /recipes/{id}/image           | Upload/update a recipe image via base64 JSON |
| `get_image.js`        | GET    | /recipes/{id}/image           | Retrieve a recipe's image         |
| `delete_image.js`     | DELETE | /recipes/{id}/image           | Remove an image from a recipe     |

## Key Features & Principles

- **ESM Only:** All code uses modern ES modules (`import/export`).
- **Centralized DB Logic:** All handlers use `getDb()` from `app.js`.
- **RESTful API:** All endpoints use path parameters, not query strings.
- **Containerized:** Runs in AWS Lambda base image, local dev via Docker Compose.
- **Swagger UI:** Available at `/api-docs` (see `local_server.js`).
- **Graceful Error Handling:** Handlers ensure missing collections or invalid queries are handled gracefully.
- **Flexible Image Support:** APIs for uploading images via multipart/form-data or base64 JSON, retrieving, and deleting recipe images (PNG/JPG formats).

## Local Development & Testing

- Start the app tier via Docker Compose with `docker compose up app`.
- API endpoints and contracts are defined in `docs/swagger.yaml`.

### Full Lifecycle Testing

The API is validated end-to-end using Node.js test scripts (following the `test_*.js` naming convention). These tests cover the complete lifecycle of recipes and images.

**Recipe Lifecycle Test:**

**What it does:**

- Creates a recipe
- Fetches the recipe
- Adds a comment
- Updates the recipe
- Likes/unlikes the recipe
- Deletes the comment
- Deletes the recipe

**Image API Test:**

**What it does:**

- Creates a test recipe
- Uploads a PNG image to the recipe
- Retrieves the image to verify
- Updates with a JPG image
- Deletes the image
- Cleans up test data and resources

**How to run:**

```bash
# Navigate to the tests directory
cd app/tests

# Install test dependencies if it's your first time running tests
npm install

# Run all tests
npm test

# Run only recipe tests (runs test_recipes.js)
npm run test:recipes

# Run only image tests (runs test_images.js)
npm run test:images
```

These tests will output the result of each API operation and report any failures. Ensure the app tier is running before executing the tests.

## Contributing

- Add new handlers in `handlers/` following the established conventions.
- Use ESM imports and centralized DB logic.
- Update `swagger.yaml` for any new endpoints.
- Add appropriate tests for new functionality in the `tests/` directory, following the `test_*.js` naming convention.
- For image-related APIs, use dedicated test assets rather than production images.

---

For questions or to contribute, contact the MomsRecipeBox dev team or refer to `swagger.yaml` in the `/docs` folder for endpoint definitions.
