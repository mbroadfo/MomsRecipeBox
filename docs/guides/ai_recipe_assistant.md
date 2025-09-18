# AI Recipe Assistant Guide

The AI Recipe Assistant is a powerful feature in MomsRecipeBox that helps you create, modify, and extract recipes using artificial intelligence. This guide explains how to use the feature and configure its components.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Getting Started](#getting-started)
4. [Usage Scenarios](#usage-scenarios)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)
7. [Related Documentation](#related-documentation)

## Overview

The AI Recipe Assistant integrates multiple AI providers (Google Gemini, OpenAI, Groq, Anthropic, and DeepSeek) to help you:

- Create recipes from scratch through conversation
- Extract recipes from URLs automatically
- Process pasted recipe content
- Suggest recipes based on available ingredients
- Refine existing recipes with substitutions or variations

## Features

### Multi-Provider Support

The assistant supports five different AI providers for reliability and flexibility:

| Provider | Strengths | Notes |
|----------|-----------|-------|
| Google Gemini | Primary provider, excellent at recipe extraction | Recommended first choice |
| OpenAI | Reliable fallback, good conversation flow | Popular alternative |
| Groq | Fast responses, good for quick extractions | Speed-focused option |
| Anthropic Claude | High-quality responses, good reasoning | Quality-focused option |
| DeepSeek | Cost-effective option, good performance | Budget-friendly option |

### Key Capabilities

- **URL Extraction**: Paste any recipe URL to automatically extract the recipe
- **Image Processing**: Automatically finds and extracts images from recipe URLs
- **Conversational Creation**: Build recipes through natural conversation
- **Content Parsing**: Process pasted recipe content from any source
- **Ingredient-Based Creation**: Get recipe suggestions based on ingredients you have
- **Direct Creation**: Create recipes without filling forms manually
- **Recipe Modification**: Adapt existing recipes with substitutions or variations

## Getting Started

### Prerequisites

To use the AI Recipe Assistant, you'll need at least one AI provider API key configured in your environment.

### Configuration

Add at least one of these API keys to your `.env` file:

```
# AI Provider API Keys (at least one required)
GOOGLE_API_KEY=your_google_api_key     # Recommended primary
OPENAI_API_KEY=your_openai_api_key     # Popular alternative
GROQ_API_KEY=your_groq_api_key         # Fast option
ANTHROPIC_API_KEY=your_anthropic_key   # High quality option
DEEPSEEK_API_KEY=your_deepseek_key     # Cost-effective option
```

### Accessing the Assistant

The AI Assistant is available in the recipe creation workflow:

1. Navigate to "Add Recipe" in the application
2. Look for the AI Assistant icon/button (usually near the recipe form)
3. Click to open the assistant panel

## Usage Scenarios

### Scenario 1: Creating a Recipe from Scratch

1. Open the AI Assistant panel
2. Type a request like "Create a chocolate chip cookie recipe"
3. Chat with the AI to refine the recipe details
4. When satisfied, click "Apply to Form" to populate the recipe form
5. Review and edit as needed before saving

### Scenario 2: Extracting a Recipe from a URL

1. Open the AI Assistant panel
2. Paste a recipe URL (e.g., "https://example.com/recipe")
3. The AI will automatically:
   - Extract the recipe details (title, ingredients, instructions)
   - Download and process any recipe images
   - Format the content properly
4. Review the extracted recipe and click "Apply to Form"
5. Make any final adjustments before saving

### Scenario 3: Processing Pasted Recipe Content

1. Open the AI Assistant panel
2. Paste the entire recipe text copied from a website or document
3. The AI will parse and structure the content into proper recipe format
4. Review and click "Apply to Form" when satisfied
5. Edit as needed before saving

### Scenario 4: Recipe Suggestions Based on Ingredients

1. Open the AI Assistant panel
2. Type something like "What can I make with chicken, broccoli, and rice?"
3. The AI will suggest recipe options based on your ingredients
4. Choose a suggestion you like and ask for the complete recipe
5. Apply to the form and save when ready

## Configuration

### Getting API Keys

#### Google Gemini API Key (Recommended)

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Create an account if needed
3. Enable the Gemini API
4. Generate an API key (starts with "AIza")

#### OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account if needed
3. Add payment information (required)
4. Create a new API key (starts with "sk-")

#### Groq API Key

1. Visit [Groq Console](https://console.groq.com/)
2. Create an account
3. Generate an API key (starts with "gsk_")

#### Anthropic Claude API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create an account
3. Add payment information
4. Create an API key (starts with "sk-ant-")

#### DeepSeek API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Create an account
3. Generate an API key (starts with "sk-")

### Advanced Configuration

For advanced configuration options, you can modify these environment variables:

```
# AI Provider Selection
AI_DEFAULT_PROVIDER=google  # Options: google, openai, groq, anthropic, deepseek

# Request Timeouts
AI_REQUEST_TIMEOUT=30000    # Milliseconds before request times out

# Rate Limit Management
AI_RATE_LIMIT_WINDOW=60000  # Milliseconds for rate limit window
```

## Troubleshooting

### Common Issues

#### No AI Providers Available

**Problem**: "No AI providers available" error message
**Solution**: Add at least one valid AI provider API key to your `.env` file

#### Rate Limit Reached

**Problem**: "Rate limit exceeded" error message
**Solution**: 
- Wait a few minutes and try again
- Add keys for multiple providers for fallback options
- Upgrade to a higher tier with your AI provider

#### Extraction Failing

**Problem**: Recipe not properly extracted from URL
**Solution**:
- Try another URL from the same site
- Copy and paste the recipe content directly instead
- Try using a different AI provider

#### Provider Not Working

**Problem**: Specific AI provider not responding
**Solution**:
- Verify the API key is correct and active
- Check the provider's status page for outages
- Switch to a different provider temporarily

## Related Documentation

- [Technical AI Services Documentation](../technical/ai_services.md) - Implementation details
- [MongoDB Guide](../technical/mongodb_guide.md) - Database configuration
- [Getting Started Guide](./getting_started.md) - General application setup