# MomsRecipeBox - API Tier

## Overview

MomsRecipeBox API provides a complete backend for recipe management, including recipe storage, comments, favorites, image handling, and shopping lists. Built with a modern serverless architecture in mind, it can be run locally or deployed to AWS Lambda.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run locally (for development only)
npm run start

# OR restart the application in containers (recommended)
cd ..
npm run restart
```

For a complete setup guide, see the [Getting Started Guide](../docs/guides/getting_started.md).

## Key Features

- **Recipe Management**: Create, read, update, delete recipes with ingredients and instructions. Recipe deletion includes automatic cleanup of associated S3 images to prevent orphaned storage.
- **AI Recipe Assistant**: Chat interface to help create recipes from URLs or text ([AI Services Documentation](../docs/technical/ai_services.md))
- **Shopping List**: Add, update, delete shopping list items; mark as checked or clear list ([Shopping List Documentation](../docs/technical/shopping_list.md))
- **Image Handling**: Upload, update, retrieve, and delete images for recipes
- **Favorites System**: Like/unlike recipes with proper count management
- **Comments**: Add, update, delete, and retrieve comments on recipes
- **Admin System**: User management, system monitoring, and administrative controls ([Admin API Documentation](../docs/admin_api.md))

## Environment Setup

The application uses **container-native secret retrieval** for enhanced security. Environment configuration is handled through deployment profiles that automatically fetch secrets from AWS Secrets Manager at runtime.

### 🔒 **Security Model**

**Container Mode (Recommended):**

- Secrets automatically retrieved from AWS Secrets Manager at container startup
- No secrets stored in files - only configuration placeholders in profile files
- Enhanced security with runtime-only secret access

**Host Development Mode:**

- Scripts automatically fetch secrets from AWS when needed
- Seamless development experience with secure credential management

### Configuration Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `MONGODB_URI` | AWS Secrets Manager | Database connection (runtime retrieval) |
| `AUTH0_DOMAIN` | AWS Secrets Manager | Auth0 tenant configuration (runtime retrieval) |
| `AUTH0_M2M_CLIENT_ID` | AWS Secrets Manager | Auth0 Management API access (runtime retrieval) |
| `AUTH0_M2M_CLIENT_SECRET` | AWS Secrets Manager | Auth0 Management API secret (runtime retrieval) |
| `RECIPE_IMAGES_BUCKET` | Profile Config | S3 bucket for image storage |
| `AWS_REGION` | Profile Config | AWS region configuration |
| AI Provider Keys | AWS Secrets Manager | AI service credentials (runtime retrieval) |

**Note:** For deployment profile configuration, see the [Profile Management Guide](../docs/technical/deployment_profiles.md).

## Directory Structure

- `handlers/` — Lambda-style handlers (one per endpoint)
- `app.js` — MongoDB connection helper (`getDb`)
- `lambda.js` — Router / Lambda entry
- `local_server.js` — Local HTTP server + Swagger UI
- `tests/` — End-to-end test modules for all API features
- `models/` — Data schemas and validation logic
- `ai_providers/` — AI service provider implementations

## Testing

The API comes with a comprehensive test suite covering all major functionality:

```bash
# Install test dependencies
cd tests
npm install

# Run all tests
npm test

# Run specific test modules
node test_recipes.js
node test_shopping_list.js
```

## API Endpoints

For a complete list of API endpoints, see the [API Reference](../docs/api_reference.md) or run the local server with Swagger UI:

```bash
npm run start
# Open http://localhost:3000/api-docs in your browser
```

## Deployment

The API can be deployed in two modes:

1. **Local Development**: Using Docker Compose with the included configuration
2. **AWS Lambda**: Deployed as a Lambda function with API Gateway integration

For detailed deployment instructions, see the [Deployment Guide](../docs/technical/deployment.md).

## Contributing

To contribute to the API tier:

1. Create a new handler in the `handlers/` directory following the handler pattern
2. Add tests for your handler in the `tests/` directory
3. Update the OpenAPI specification in `docs/swagger.yaml`
4. Submit a pull request

For more information, see the [Contributing Guide](../docs/development/contributing.md).
