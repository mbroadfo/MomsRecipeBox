# Getting Started with MomsRecipeBox

This guide will help you quickly set up and start using MomsRecipeBox. Whether you're a developer setting up the project for the first time or a user wanting to explore the features, this guide covers the essential steps.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** and **Docker Compose**: Required for containerized deployment
- **Node.js 18+**: For running npm commands and development tools
- **Git**: For cloning the repository
- **AWS Account** (optional): Required only for cloud features

## Quick Installation

1. **Clone the repository**:

```bash
git clone https://github.com/mbroadfo/MomsRecipeBox.git
cd MomsRecipeBox
```

1. **Configure environment variables**:

Create a `.env` file in the project root with the following basic configuration:

```bash
# Local MongoDB Configuration
MONGODB_MODE=local
MONGODB_LOCAL_ROOT_USER=admin
MONGODB_LOCAL_ROOT_PASSWORD=supersecret
MONGODB_DB_NAME=momsrecipebox

# Application Mode
APP_MODE=local
```

1. **Start the application**:

```bash
# Start local development environment (recommended)
npm run dev:local

# Alternative: Start containers manually
npm run start:local
```

1. **Verify the installation**:

Access the application at [http://localhost:3000](http://localhost:3000)

For API documentation, visit [http://localhost:3001/docs](http://localhost:3001/docs)

## Database Configuration

MomsRecipeBox supports two database options:

### Local MongoDB (Default)

The default configuration uses a local MongoDB container with Docker Compose.

### MongoDB Atlas (Cloud Option)

To use MongoDB Atlas instead of the local database:

1. Create a MongoDB Atlas account and organization
2. Configure credentials in AWS Secrets Manager or environment variables
3. Switch to Atlas mode:

```bash
# Start with Atlas mode (modern approach)
npm run dev:atlas

# Alternative: Use legacy PowerShell script  
.\scripts\Toggle-MongoDbConnection.ps1 -Mode atlas
```

For detailed MongoDB setup instructions, see [MongoDB Guide](../technical/mongodb_guide.md).

## AI Recipe Assistant Setup

To enable the AI Recipe Assistant feature, you'll need at least one AI provider API key.

Add the following to your `.env` file with at least one of these keys:

```bash
# AI Provider API Keys (at least one required)
GOOGLE_API_KEY=your_google_api_key     # Recommended primary
OPENAI_API_KEY=your_openai_api_key     # Popular alternative
GROQ_API_KEY=your_groq_api_key         # Fast option
ANTHROPIC_API_KEY=your_anthropic_key   # High quality option
DEEPSEEK_API_KEY=your_deepseek_key     # Cost-effective option
```

For detailed AI setup instructions, see [AI Recipe Assistant Guide](./ai_recipe_assistant.md).

## Testing the Application

Run the end-to-end tests to verify all functionality:

```bash
# Run all tests with npm automation
npm run test:all

# Alternative: Run tests manually
cd app/tests
npm install
npm test
```

To run specific test modules:

```bash
# Test recipe functionality
npm run test:recipes

# Test shopping list functionality  
npm run test:shopping

# Manual test execution
cd app/tests
node test_recipes.js
node test_shopping_list.js
```

## Basic Usage Guide

### Creating a Recipe

1. Click "Add Recipe" in the top toolbar
2. Fill in recipe details (title, ingredients, instructions, etc.)
3. Optionally use the AI Assistant to help create or import a recipe
4. Upload an image if available
5. Click "Save Recipe"

### Using the Shopping List

1. Open a recipe and check ingredients you need
2. Click "Add Selected to Shopping List"
3. Navigate to Shopping List to view and manage items
4. Check off items as you purchase them
5. Use "Clear Purchased" to remove checked items

### Using the AI Recipe Assistant

1. Open "Add Recipe" page
2. Click on the AI Assistant icon
3. Type a recipe request or paste a recipe URL
4. Review and edit the AI-generated recipe
5. Click "Apply to Form" to use the recipe

## Next Steps

- Explore the [API Documentation](../../app/README.md) for backend details
- Learn about [Database Management](../technical/mongodb_guide.md)
- Set up [Backup & Recovery](../technical/backup_recovery.md) procedures
- Configure the [Admin Dashboard](./admin_dashboard.md)

## Troubleshooting

### Common Issues

- **Database Connection Errors**: Verify MongoDB is running with `docker ps`
- **Missing API Keys**: Check environment variables for AI providers
- **Application Not Starting**: Check Docker logs with `docker compose logs app`

### Getting Help

- Check detailed documentation in the `docs` directory
- Review error messages in the browser console or Docker logs
- See the [Contributing Guide](../development/contributing.md) for reporting issues
