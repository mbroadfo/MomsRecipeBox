# AI Services Technical Documentation

This document provides comprehensive technical details about the AI services implementation in MomsRecipeBox, including the architecture, provider integration, API endpoints, and monitoring capabilities.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [AI Provider System](#ai-provider-system)
3. [API Endpoints](#api-endpoints)
4. [Provider Factory Pattern](#provider-factory-pattern)
5. [System Messages and Prompting](#system-messages-and-prompting)
6. [Error Handling and Rate Limiting](#error-handling-and-rate-limiting)
7. [Monitoring and Status](#monitoring-and-status)
8. [Implementation Details](#implementation-details)
9. [Future Enhancements](#future-enhancements)
10. [Related Documentation](#related-documentation)

## Architecture Overview

The MomsRecipeBox AI system is designed with reliability, flexibility, and maintainability in mind. Key architectural features include:

- **Multi-Provider Support**: Five AI providers integrated for reliability and fallback options
- **Provider Factory Pattern**: Centralized management of providers with dynamic selection
- **Standardized Interfaces**: Consistent interfaces regardless of the underlying provider
- **Rate Limit Management**: Intelligent tracking and handling of provider rate limits
- **Comprehensive Error Handling**: Robust error categorization and recovery mechanisms
- **Status Monitoring**: Real-time provider status and performance monitoring

The system is implemented as a modular component with well-defined interfaces, making it easy to extend with new providers or capabilities.

## AI Provider System

### Supported Providers

| Provider | Model | API Key Format | Features | Strengths |
|----------|-------|----------------|----------|-----------|
| **Google Gemini** | `gemini-2.5-flash` | `AIza...` | Primary provider | High accuracy, good at parsing web content |
| **OpenAI** | `gpt-3.5-turbo` | `sk-...` | Reliable fallback | Consistent responses, good conversation flow |
| **Groq** | `llama-3.1-8b-instant` | `gsk_...` | Fast responses | Very fast inference, free tier available |
| **Anthropic Claude** | `claude-3-haiku-20240307` | `sk-ant-...` | High-quality reasoning | Excellent instruction following |
| **DeepSeek** | `deepseek-chat` | `sk-...` | Cost-effective option | Good performance-to-cost ratio |

### Provider Selection Logic

The system automatically selects providers using this priority order:

1. **User Selection**: If a specific provider is requested via the UI
2. **Auto Selection**: Uses this priority order for automatic selection:
   - Google Gemini (primary choice if available)
   - OpenAI (reliable fallback)
   - Groq (fast alternative)
   - Anthropic Claude (high-quality option)
   - DeepSeek (cost-effective choice)

If a provider is rate-limited or unavailable, the system automatically falls back to the next available provider.

### File Structure

```text
app/ai_providers/
├── base_provider.js          # Base class with shared functionality
├── provider_factory.js       # Provider management and selection
├── google_provider.js        # Google Gemini implementation
├── openai_provider.js        # OpenAI GPT implementation
├── groq_provider.js          # Groq Llama implementation
├── anthropic_provider.js     # Anthropic Claude implementation
├── deepseek_provider.js      # DeepSeek implementation
└── index.js                  # Export all providers
```

## API Endpoints

The AI services expose three main endpoints:

### 1. Chat Endpoint

```http
POST /ai/chat
```

Handles conversational recipe creation with AI.

**Request Body:**

```json
{
  "message": "Create a chocolate chip cookie recipe",
  "history": [
    {"role": "user", "content": "previous message"},
    {"role": "assistant", "content": "previous response"}
  ],
  "provider": "google",  // Optional, defaults to auto-selection
  "user_id": "user_123"  // For tracking user conversations
}
```

**Response:**

```json
{
  "success": true,
  "message": "AI response text...",
  "provider": "google",  // Which provider was used
  "recipeData": {        // Optional, if recipe detected
    "title": "Chocolate Chip Cookies",
    "ingredients": ["2 cups flour", "1 cup sugar", "..."],
    "instructions": ["Preheat oven to 350°F", "Mix ingredients", "..."]
  }
}
```

### 2. Extract Endpoint

```http
POST /ai/extract
```

Extracts recipe data from a URL or pasted content.

**Request Body (URL Extraction):**

```json
{
  "url": "https://example.com/recipe",
  "provider": "google",  // Optional
  "user_id": "user_123"  // For tracking
}
```

**Request Body (Pasted Content):**

```json
{
  "url": "pasted:The pasted recipe content goes here...",
  "provider": "google",  // Optional
  "user_id": "user_123"  // For tracking
}
```

**Response:**

```json
{
  "success": true,
  "message": "I've extracted the recipe...",
  "provider": "google",  // Which provider was used
  "recipeData": {
    "title": "Recipe Title",
    "ingredients": ["Ingredient 1", "Ingredient 2", "..."],
    "instructions": ["Step 1", "Step 2", "..."],
    "cookTime": "30 minutes",
    "prepTime": "15 minutes",
    "servings": 4,
    "imageUrl": "https://example.com/image.jpg"  // If found
  }
}
```

### 3. Create Recipe Endpoint

```http
POST /ai/create-recipe
```

Creates a recipe directly in the database from AI conversation data.

**Request Body:**

```json
{
  "recipeData": {
    "title": "Chocolate Chip Cookies",
    "ingredients": ["2 cups flour", "1 cup sugar", "..."],
    "instructions": ["Preheat oven to 350°F", "Mix ingredients", "..."]
  },
  "imageUrl": "https://example.com/cookie.jpg",  // Optional
  "user_id": "user_123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Recipe created successfully",
  "recipe": {
    "_id": "recipe_id",
    "title": "Chocolate Chip Cookies",
    "...": "..." // Full recipe object
  }
}
```

## Provider Factory Pattern

The `AIProviderFactory` class manages all AI providers with intelligent selection and fallback capabilities:

### Key Components

- **Provider Registry**: Map of provider names to implementation classes
- **Provider Initialization**: Lazy initialization of providers with API key validation
- **Rate Limit Tracking**: Runtime tracking of rate-limited providers
- **Provider Selection**: Logic for choosing the best available provider
- **Configuration Validation**: Checks for valid API keys and environment setup

### Usage Example

```javascript
import { AIProviderFactory } from '../ai_providers/index.js';

// Get the best available provider
const aiProvider = AIProviderFactory.getProvider(selectedModel);

// Use provider for recipe extraction
const response = await aiProvider.handleUrlExtraction(url, content);
```

## System Messages and Prompting

All providers use identical system messages defined in the `BaseAIProvider` class to ensure consistent output formatting across different AI models:

### Key Message Templates

- **getRecipeStructure()**: Standardized recipe format template
- **getUrlExtractionSystemMessage()**: Instructions for extracting recipes from web content
- **getChatSystemMessage()**: Instructions for recipe chat assistance
- **getPastedContentSystemMessage()**: Instructions for processing pasted recipe content
- **getDetailedExtractionPrompt()**: Detailed formatting rules for providers requiring specific instructions

This centralization ensures:

- **Consistency**: All providers return identically formatted recipes
- **Maintainability**: Recipe format changes only need to be made in one place
- **Quality**: Unified, well-tested prompts across all providers
- **Extensibility**: New providers can be added easily using existing templates

## Error Handling and Rate Limiting

### Error Categories

The system defines these error categories for comprehensive handling:

- **authentication**: Invalid API key
- **authorization**: Access denied
- **rate_limit**: Rate limit exceeded (auto-tracked)
- **service_error**: Provider service issues (5xx errors)
- **network**: Connection failures
- **timeout**: Request timeouts
- **unknown**: Other errors

### Rate Limit Management

- **Detection**: Automatically detects rate limit errors from provider responses
- **Tracking**: Maintains a runtime registry of rate-limited providers
- **Expiry**: Calculates and tracks rate limit expiry times
- **Fallback**: Automatically excludes rate-limited providers from selection
- **Reset**: Removes providers from the rate-limited list after expiry

### Retry Logic

- **Exponential Backoff**: Implements increasing delays between retries
- **Maximum Retries**: Configurable retry limits for different operations
- **Success Tracking**: Records successful recovery from transient errors
- **Circuit Breaking**: Prevents excessive retries when a provider is consistently failing

## Monitoring and Status

The API includes a dedicated admin endpoint for AI services monitoring:

```http
GET /admin/ai-services-status
```

### Status Response Format

```json
{
  "success": true,
  "timestamp": "2025-09-10T22:15:56.103Z",
  "testPerformed": false,  // Basic status check
  "overallStatus": "configured",
  "summary": {
    "total": 5,
    "operational": 0,
    "configured": 5,
    "errors": 0,
    "rateLimited": 0,
    "unavailable": 0
  },
  "providers": [
    {
      "name": "google",
      "displayName": "Google Gemini",
      "status": "configured",
      "isConfigured": true,
      "apiKeyValid": true,
      "model": "gemini-2.5-flash"
    },
    // Other providers...
  ]
}
```

### Live Testing

With query parameter `?test=basic`:

```json
{
  "success": true,
  "timestamp": "2025-09-10T22:16:19.211Z",
  "testPerformed": true,
  "overallStatus": "operational",
  "summary": {
    "total": 5,
    "operational": 5,
    "configured": 0,
    "errors": 0,
    "rateLimited": 0,
    "unavailable": 0
  },
  "providers": [
    {
      "name": "google",
      "displayName": "Google Gemini",
      "status": "operational",
      "responseTime": 370,  // ms
      "isConfigured": true,
      "apiKeyValid": true,
      "model": "gemini-2.5-flash"
    },
    // Other providers with actual test results...
  ]
}
```

### Status Values

- **operational**: Provider tested and responding correctly
- **configured**: API key present and valid format, ready for testing
- **rate_limited**: Provider temporarily rate limited with expiry time
- **error**: Provider encountered error during testing (with error categorization)
- **unavailable**: No valid API key configured

## Implementation Details

### Provider Base Class

The `BaseAIProvider` class defines the interface and shared functionality for all providers:

```javascript
class BaseAIProvider {
  constructor() {
    this.name = 'base';
    this.displayName = 'Base Provider';
    // ... other common properties
  }

  // Check if provider is available based on environment configuration
  isAvailable() { /* ... */ }

  // Handle chat conversation
  async handleChat(message, history) { /* ... */ }

  // Extract recipe from URL
  async handleUrlExtraction(url, content) { /* ... */ }

  // Handle pasted content
  async handlePastedContent(content) { /* ... */ }

  // Standard system messages for all providers
  getRecipeStructure() { /* ... */ }
  getChatSystemMessage() { /* ... */ }
  getUrlExtractionSystemMessage() { /* ... */ }
  getPastedContentSystemMessage() { /* ... */ }
}
```

### Provider Factory Implementation

The factory manages provider initialization and selection:

```javascript
class AIProviderFactory {
  static providers = {};
  static rateLimitedProviders = {};

  // Get provider by name or best available
  static getProvider(name = null) { /* ... */ }

  // Register rate limited provider
  static registerRateLimited(name, expiryTime) { /* ... */ }

  // Check if provider is rate limited
  static isRateLimited(name) { /* ... */ }

  // Get list of available providers
  static getAvailableProviders() { /* ... */ }

  // Check provider status
  static async checkProviderStatus(name) { /* ... */ }

  // Get status of all providers
  static async getAllProvidersStatus(test = false) { /* ... */ }
}
```

## Future Enhancements

Planned enhancements for the AI services system:

1. **Response Time Tracking**: Add persistent timing metrics for each provider
2. **Historical Status**: Track provider reliability over time
3. **Alert Thresholds**: Configure alerts for provider failures
4. **Batch Testing**: Test multiple providers in parallel for faster results
5. **Provider Health Scores**: Calculate reliability metrics based on success rates
6. **Response Time Trends**: Track performance changes over time
7. **Performance Alerting**: Notify when response times exceed thresholds

## Related Documentation

- [AI Recipe Assistant User Guide](../guides/ai_recipe_assistant.md) - User-focused documentation
- [Admin Dashboard Guide](../guides/admin_dashboard.md) - Administrative monitoring
- [App API Documentation](../../app/README.md) - Backend API details
