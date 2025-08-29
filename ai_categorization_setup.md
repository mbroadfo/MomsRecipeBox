# AI Categorization Setup

## Overview

The shopping list feature includes an AI-powered ingredient categorization system that organizes ingredients by grocery store aisle for a more efficient shopping experience. The categorization only happens when the user switches to the "By Category" view in the shopping list.

## Configuration

For the AI-powered ingredient categorization to work, you'll need to add your OpenAI API key to the .env file.

1. Open the app/.env file
2. Add this line (replace with your actual OpenAI API key):

   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. Save the file
4. Restart your backend server

You can get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/) if you don't already have one.

## How It Works

1. The system only calls the OpenAI API when a user specifically switches to the "By Category" view
2. Results are cached to avoid duplicate API calls for the same set of ingredients
3. The UI shows a loading indicator while categorization is in progress
4. An "AI" badge appears in the category view toggle button when AI-powered categorization is being used

## Fallback Mechanism

The categorization feature will fall back to keyword matching if:

- The OpenAI API is unavailable
- There's an error with the API call
- The API key is not provided

## Performance Considerations

- API calls are only made when switching to the category view, not on initial page load
- Cached results are used for subsequent views with the same ingredients
- The keyword matching fallback mechanism is used automatically if needed
