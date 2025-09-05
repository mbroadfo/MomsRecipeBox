# MomsRecipeBox - API Tier (2025)

## Overview

MomsRecipeBox API provides a complete backend for recipe management, including recipe storage, comments, favorites, image handling, and shopping lists. Built with a modern serverless architecture in mind, it can be run locally or deployed to AWS Lambda. The API includes comprehensive image handling with proper metadata management and cache control for optimal user experience.

## Environment Setup

Before running the application, create a `.env` file in the project root directory with the following variables:

```bash
# MongoDB Configuration
MONGODB_ROOT_USER=admin
MONGODB_ROOT_PASSWORD=password123
MONGODB_DB_NAME=momsrecipebox
MONGODB_URI=mongodb://admin:password123@localhost:27017/momsrecipebox?authSource=admin

# Application Mode
APP_MODE=local

# OpenAI API Key for AI Recipe Assistant
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# AWS S3 Configuration for Image Storage
RECIPE_IMAGES_BUCKET=your_s3_bucket_name
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-west-2

# Auth0 Configuration (required for admin features)
AUTH0_DOMAIN=your_auth0_domain
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret
AUTH0_AUDIENCE=your_auth0_audience
```

### Required Environment Variables

| Variable | Required | Purpose | Notes |
|----------|----------|---------|-------|
| `MONGODB_URI` | Yes | Database connection | Must match Docker MongoDB credentials |
| `OPENAI_API_KEY` | Yes | AI Recipe Assistant | Required for `/ai/chat` and `/ai/extract` endpoints |
| `RECIPE_IMAGES_BUCKET` | Yes | Image storage | S3 bucket name for recipe images |
| `AWS_ACCESS_KEY_ID` | Yes | S3 access | AWS credentials for image upload/download |
| `AWS_SECRET_ACCESS_KEY` | Yes | S3 access | AWS credentials for image upload/download |
| `AWS_REGION` | Yes | S3 region | AWS region where your S3 bucket is located |
| `AUTH0_*` | Yes* | Authentication | Required for admin features and production, optional for basic development |

### Getting API Keys

1. **OpenAI API Key**: 
   - Visit https://platform.openai.com/api-keys
   - Create a new API key
   - Add billing information (required for API access)

2. **AWS S3 Setup**:
   - Create an S3 bucket for recipe images
   - Create an IAM user with S3 permissions
   - Generate access key and secret key for the IAM user

3. **Auth0 Setup** (Optional):
   - Create an Auth0 application
   - Configure domain, client ID, and audience

## Quick Reference: Rebuilding the App Tier

```powershell
# Stop & clean
docker compose down --remove-orphans -v

# Rebuild only app
docker compose build --no-cache app

# Start services
docker compose up -d

# Restart app after environment changes
.\scripts\restart_app.ps1
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

## Shopping List System

The API includes a comprehensive shopping list system with the following features:

| Aspect        | Implementation |
| ------------- | -------------- |
| Storage       | `shopping_lists` collection (one document per user) |
| Item Structure| Array of items with ingredient, recipe reference, checked status |
| Operations    | Add items, update status, delete items, clear list, mark all as checked |
| Item Context  | Each item maintains reference to source recipe (id and title) |
| Response      | Shopping list operations return appropriate success/error messages |
| Field Naming  | Supports dual field naming patterns (`ingredient`/`name`, `recipe_id`/`recipeId`) for compatibility |

The shopping list implementation allows users to:

- Add multiple ingredients from recipes to their shopping list
- Mark items as checked when purchased
- Remove individual items or clear the entire list
- Track which recipe each ingredient came from
- Field naming compatibility ensures both frontend and backend work seamlessly regardless of naming conventions

## AI Recipe Assistant

The API includes an AI-powered recipe assistant with the following capabilities, enabling users to quickly create recipes with minimal effort:

| Aspect        | Implementation |
| ------------- | -------------- |
| Chat Interface| Interactive conversation with AI to build recipes |
| URL Extraction| Automatic detection and extraction of recipe data from URLs |
| Image Extraction| Automatically finds and downloads recipe images from websites with intelligent selection |
| Recipe Structure| Parses conversational input into structured recipe format |
| API Endpoints | `/ai/chat` for conversation, `/ai/extract` for URL processing |
| Integration   | Seamlessly works with recipe creation workflow |
| Recipe Creation| Automatically creates a recipe in the database when ready |
| Image Processing| Downloads, stores, and associates images with newly created recipes |
| Error Handling| Robust retry mechanism with exponential backoff for API calls |
| Rate Limiting | Graceful handling of API rate limits with helpful user feedback |

The AI Recipe Assistant provides:

- Natural language interface for recipe creation
- Automatic extraction of ingredients, instructions, and metadata from URLs
- Automatic extraction and processing of recipe images from websites
- Support for direct copy/paste of recipe content from websites
- Interactive refinement of recipe details
- Structured output compatible with the recipe creation form
- Smart detection of recipe components from conversational text
- Automated recipe creation with proper formatting of all fields
- Support for image downloading and association with new recipes
- Intelligent recipe metadata extraction including tags, cooking times, and servings
- Direct recipe creation from the chat interface without form-filling
- Image handling that extracts, downloads, uploads to S3, and associates with recipes

## Admin System

The admin system provides comprehensive user management and system monitoring capabilities with JWT-based authentication and role-based access control.

### Admin Features

- **User Management**: List, invite, and delete users
- **User Statistics**: Dashboard with user counts and activity metrics
- **System Monitoring**: Real-time connectivity tests for S3 and AI services
- **Role-based Access**: Secure admin-only endpoints with JWT validation
- **Audit Trail**: Comprehensive logging of admin operations

### Admin Endpoints

| Method | Route | Description | Auth Required |
|--------|-------|-------------|---------------|
| GET | `/admin/users` | List all users with pagination and search | Admin JWT |
| POST | `/admin/users/invite` | Invite new users via email | Admin JWT |
| DELETE | `/admin/users/{userId}` | Delete user and associated data | Admin JWT |
| GET | `/admin/system-status` | Check S3, AI, and system connectivity | Admin JWT |

### Admin Authentication

The admin system uses Auth0 JWT tokens with role-based access control:

```javascript
// Users must have app_metadata.role = "admin" in their JWT token
{
  "sub": "auth0|user123",
  "app_metadata": {
    "role": "admin"
  },
  // ... other JWT claims
}
```

### System Status Monitoring

The admin dashboard includes real-time connectivity tests for:

- **Admin API**: Validates JWT authentication and database connectivity
- **S3 Storage**: Tests bucket access and IAM permissions for image operations
- **AI Services**: Verifies connectivity to configured AI providers:
  - Google Gemini (primary)
  - Groq (fallback)
  - DeepSeek (fallback)
  - OpenAI (fallback)

### Testing Admin Endpoints

Admin endpoints can be tested using the provided test suite:

```bash
# Run admin API tests
cd app/admin/tests
node run-tests.js
```

The test suite includes:
- JWT token generation and validation
- User management operations
- Error handling and edge cases
- System status monitoring
- Role-based access control verification

## RESTful Routes & Handlers (Excerpt)

| File                          | Method | Route                      | Description |
|-------------------------------|--------|----------------------------|-------------|
| `list_recipes.js`             | GET    | /recipes                   | List all recipes |
| `get_recipe.js`               | GET    | /recipes/{id}              | Get recipe (with `likes_count`) |
| `create_recipe.js`            | POST   | /recipes                   | Create recipe (`likes_count:0`) |
| `update_recipe.js`            | PUT    | /recipes/{id}              | Update recipe |
| `delete_recipe.js`            | DELETE | /recipes/{id}              | Delete recipe |
| `toggle_favorite.js`          | POST   | /recipes/{id}/like         | Toggle favorite (returns `{ liked, likes }`) |
| `post_comment.js`             | POST   | /recipes/{id}/comments     | Add comment |
| `update_comment.js`           | PUT    | /comments/{id}             | Update comment |
| `delete_comment.js`           | DELETE | /comments/{id}             | Delete comment |
| `upload_image.js`             | PUT    | /recipes/{id}/image        | Upload image (multipart) |
| `update_image.js`             | PUT    | /recipes/{id}/image        | Update image (base64 JSON) |
| `get_image.js`                | GET    | /recipes/{id}/image        | Retrieve image |
| `delete_image.js`             | DELETE | /recipes/{id}/image        | Delete image |
| `get_shopping_list.js`        | GET    | /shopping-list             | Get user's shopping list |
| `add_shopping_list_items.js`  | POST   | /shopping-list/add         | Add items to shopping list |
| `update_shopping_list_item.js`| PUT    | /shopping-list/item/{id}   | Update shopping list item |
| `delete_shopping_list_item.js`| DELETE | /shopping-list/item/{id}   | Delete shopping list item |
| `clear_shopping_list.js`      | POST   | /shopping-list/clear       | Clear shopping list or mark all as checked |
| `ai_recipe_assistant.js`      | POST   | /ai/chat                   | Send message to AI recipe assistant |
| `ai_recipe_assistant.js`      | POST   | /ai/extract                | Extract recipe data from URL |
| `ai_recipe_assistant.js`      | POST   | /ai/create-recipe          | Create recipe from AI conversation data |

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
npm run test:shopping  # shopping list functionality
```

Each test module (`test_recipes.js`, `test_comments.js`, `test_images.js`, `test_favorites.js`, `test_shopping_list.js`) covers its respective functionality with end-to-end tests against a running API server.

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
| Shopping List | Complete | Add, update, delete shopping list items; mark as checked or clear list |
| AI Recipe Assistant | Complete | Chat interface to help create recipes and extract recipe data from URLs |
| Admin System | Complete | User management, system monitoring, and administrative controls |
| Admin Authentication | Complete | JWT-based role authentication with Auth0 integration |
| System Status Monitoring | Complete | Real-time connectivity tests for S3, AI services, and database |
| Auth Integration | Planned | Full Auth0 JWT integration for secure user identification |
| User Favorites Feed | Planned | Endpoint to list all recipes favorited by a user |
| Analytics | Planned | Endpoints to expose recipe popularity and engagement metrics |

---

For questions or contributions, update `swagger.yaml` and add tests to cover new behavior.
