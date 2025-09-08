/**
 * Base class for AI providers
 * Implements common functionality and defines required interface
 */
export class BaseAIProvider {
  /**
   * Get standardized recipe structure format
   */
  static getRecipeStructure() {
    return `Title: [Recipe Title]
Subtitle: [Recipe subtitle or tagline, if present]
Description: [Full description]
Author: [Recipe author, if present]
Source: [Original source or website name]
Yield: [Number of servings]
Time: [Total preparation and cooking time]
Prep Time: [Preparation time only]
Cook Time: [Cooking time only]
Ingredients:
- [Ingredient 1 with quantity]
- [Ingredient 2 with quantity]

Instructions:
1. [Step 1]
2. [Step 2]

Notes: [Any additional notes or tips]
Tags: [Comma-separated list of categories]
Nutrition: [Nutritional information if available]`;
  }

  /**
   * Get system message for URL extraction
   */
  static getUrlExtractionSystemMessage() {
    return `You are a recipe extraction assistant. Extract recipe information from the provided content and format it exactly as follows:

${BaseAIProvider.getRecipeStructure()}

If any section is not available in the content, skip that section entirely. For tags, include relevant cooking method, meal type, dietary restrictions, cuisine type, or difficulty level.`;
  }

  /**
   * Get system message for chat assistance
   */
  static getChatSystemMessage() {
    return `You are a helpful recipe assistant. Help users with recipe-related questions, cooking tips, and recipe creation. If you provide a complete recipe, format it as follows:

${BaseAIProvider.getRecipeStructure()}

Be helpful, friendly, and provide practical cooking advice.`;
  }

  /**
   * Get system message for pasted content processing
   */
  static getPastedContentSystemMessage() {
    return `You are a recipe extraction assistant. Clean up and properly format the provided recipe content. Format it exactly as follows:

${BaseAIProvider.getRecipeStructure()}

Clean up any formatting issues and ensure the recipe is well-structured.`;
  }

  /**
   * Get detailed extraction prompt for web content (used by providers that need more specific instructions)
   */
  static getDetailedExtractionPrompt() {
    return `IMPORTANT: You are extracting a recipe from content. Your ONLY task is to output a structured recipe.

FORMATTING RULES:
1. Start your response EXACTLY with "Title:" - do not include ANY text before this
2. Follow the recipe structure exactly as shown below
3. Do not include ANY explanatory text, introductions, or commentary
4. Do not include phrases like "Here's the recipe" or "I've extracted"
5. If information for a field is not present, omit that field entirely

RECIPE STRUCTURE:
${BaseAIProvider.getRecipeStructure()}`;
  }

  /**
   * Check if this provider is available (has valid API keys)
   */
  isAvailable() {
    return false; // To be implemented by child classes
  }

  /**
   * Get provider configuration
   */
  getConfig() {
    return {
      name: 'Base Provider',
      endpoint: '',
      model: '',
      headers: {},
    };
  }

  /**
   * Log API operation
   */
  logApiOperation(operation, message) {
    console.log(`[${this.getConfig().name}] [${operation}] ${message}`);
  }

  /**
   * Format messages for this provider's API
   */
  formatMessages(systemMessage, userMessages) {
    return userMessages; // Default implementation, override in provider classes
  }

  /**
   * Format payload for this provider's API
   */
  formatPayload(prompt, messages = null) {
    // To be implemented by child classes
    throw new Error('Not implemented');
  }

  /**
   * Extract response from API response
   */
  extractResponseFromData(data) {
    // To be implemented by child classes
    throw new Error('Not implemented');
  }

  /**
   * Make request to the API
   */
  async makeRequest(endpoint, payload, headers) {
    // To be implemented by child classes
    throw new Error('Not implemented');
  }

  /**
   * Handle URL extraction
   */
  async handleUrlExtraction(url, textContent) {
    // To be implemented by child classes
    throw new Error('Not implemented');
  }

  /**
   * Handle chat message
   */
  async handleChatMessage(message, history) {
    // To be implemented by child classes
    throw new Error('Not implemented');
  }

  /**
   * Handle pasted recipe content
   */
  async handlePastedRecipeContent(content) {
    // To be implemented by child classes
    throw new Error('Not implemented');
  }
}
