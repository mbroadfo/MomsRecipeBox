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
Subtitle: [A brief descriptive tagline or cooking method summary - always include this]
Description: [Full description - do NOT include the word "Description:" in this content]
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

IMPORTANT: Do NOT repeat field labels in the content. Write only the actual content after each field label. For example:
- CORRECT: "Description: This delicious soup is perfect for winter."
- INCORRECT: "Description: Description: This delicious soup is perfect for winter."

ALWAYS include a subtitle - if the recipe doesn't have an explicit subtitle, create a brief descriptive tagline (e.g., "Rich and creamy comfort food", "Quick weeknight dinner", "Traditional Italian pasta dish"). 

If any other section is not available in the content, skip that section entirely. For tags, include relevant cooking method, meal type, dietary restrictions, cuisine type, or difficulty level.`;
  }

  /**
   * Get system message for chat assistance
   */
  static getChatSystemMessage() {
    return `You are a helpful recipe assistant. When users ask for recipes or mention ingredients they want to use, ALWAYS provide a complete, structured recipe using this EXACT format:

${BaseAIProvider.getRecipeStructure()}

ALWAYS include a subtitle - create a brief descriptive tagline for the dish (e.g., "Rich and creamy comfort food", "Quick weeknight dinner", "Traditional Italian pasta dish").

IMPORTANT: When users mention ingredients or ask for recipe suggestions, respond with a complete recipe in the above format. Start immediately with "Title:" - do NOT include conversational text before the recipe format.

For general cooking questions not requesting a specific recipe, you may provide helpful advice in a conversational manner.`;
  }

  /**
   * Get system message for pasted content processing
   */
  static getPastedContentSystemMessage() {
    return `You are a recipe extraction assistant. Clean up and properly format the provided recipe content. Format it exactly as follows:

${BaseAIProvider.getRecipeStructure()}

IMPORTANT: Do NOT repeat field labels in the content. Write only the actual content after each field label. For example:
- CORRECT: "Description: This delicious soup is perfect for winter."
- INCORRECT: "Description: Description: This delicious soup is perfect for winter."

ALWAYS include a subtitle - if the recipe doesn't have an explicit subtitle, create a brief descriptive tagline (e.g., "Rich and creamy comfort food", "Quick weeknight dinner", "Traditional Italian pasta dish").

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
5. If information for a field is not present, omit that field entirely (EXCEPT subtitle - always include a subtitle)
6. CRITICAL: Do NOT repeat field labels in the content. For example, if you write "Description: This delicious soup...", write ONLY "This delicious soup..." after the colon.
7. ALWAYS include a subtitle - if the recipe doesn't have an explicit subtitle, create a brief descriptive tagline (e.g., "Rich and creamy comfort food", "Quick weeknight dinner", "Traditional Italian pasta dish").

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
