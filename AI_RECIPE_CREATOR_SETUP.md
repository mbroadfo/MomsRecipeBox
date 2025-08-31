# AI Recipe Creator Setup

The AI Recipe Creator feature allows users to build recipes with the help of a pre-prompted AI assistant. This document explains how to set up the feature and the required configuration.

## Prerequisites

- An OpenAI API key (GPT-4 or higher recommended)
- Node.js 18+ environment
- MongoDB database

## Configuration

1. Create or update the `.env` file in your app directory with your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Feature Overview

The AI Recipe Creator provides:

1. **AI Chat Interface**: Enables conversational recipe creation with a pre-prompted AI
2. **URL Extraction**: Analyzes recipe URLs and extracts structured recipe data
3. **Direct Content Pasting**: Processes raw recipe content copied directly from websites
4. **Ingredient-Based Creation**: Suggests recipes based on available ingredients
5. **Recipe Modification**: Helps adapt existing recipes with substitutions or variations

## Technical Implementation

The feature consists of these components:

1. **Frontend**: A chat interface in the Add Recipe page (`RecipeAIChat.tsx`)
2. **Backend API**: Unified AI endpoints for recipe creation and extraction
   - `/ai/chat`: Handles recipe creation conversations
   - `/ai/extract`: Processes recipe URLs and pasted content for extraction
3. **Recipe Parser**: Converts AI-generated text into a structured recipe object

## API Endpoints

### POST /ai/chat

Handles conversational recipe creation with AI.

**Request Body:**

```json
{
  "message": "Create a chocolate chip cookie recipe",
  "history": [
    {"role": "user", "content": "previous message"},
    {"role": "assistant", "content": "previous response"}
  ],
  "user_id": "user_123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "AI response text...",
  "recipeData": {
    "title": "Chocolate Chip Cookies",
    "ingredients": [...],
    "steps": [...]
  }
}
```

### POST /ai/extract

Extracts recipe data from a URL or pasted content.

**Request Body (URL Extraction):**

```json
{
  "url": "https://example.com/recipe",
  "user_id": "user_123"
}
```

**Request Body (Pasted Content):**

```json
{
  "url": "pasted:The pasted recipe content goes here...",
  "user_id": "user_123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "I've extracted the recipe...",
  "recipeData": {
    "title": "Recipe Title",
    "ingredients": [...],
    "steps": [...]
  }
}
```

## Using the Feature

1. Navigate to "Add Recipe" page
2. The AI assistant will appear automatically
3. Chat with the AI to create a recipe using one of these methods:
   - Ask the AI to create a recipe with specific ingredients or cuisine
   - Provide a URL to a recipe you want to extract
   - Paste the entire recipe content directly into the chat
4. When the AI has generated a complete recipe, it will offer to apply it to the form
5. Review and edit the recipe as needed before saving

## Troubleshooting

- **AI Not Responding**: Verify the OpenAI API key is valid and properly set in the .env file
- **URL Extraction Failing**: Some websites block scraping; try pasting the recipe content directly
- **Pasted Content Not Parsing**: Ensure the pasted content contains sufficient recipe information
- **Incomplete Recipes**: The AI works best with clear, specific requests - try providing more details
- **Special Characters in Pasted Content**: If seeing strange formatting after pasting, try removing special characters

## Future Enhancements

- Support for recipe image generation
- Multi-language recipe support
- Integration with nutritional calculation API
- Enhanced formatting for complex recipes with multiple sections
