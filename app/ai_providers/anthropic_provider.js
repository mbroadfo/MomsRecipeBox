import axios from 'axios';
import { BaseAIProvider } from './base_provider.js';

/**
 * Anthropic Provider
 */
export class AnthropicProvider extends BaseAIProvider {
  /**
   * Check if this provider is available (has valid API keys)
   */
  isAvailable() {
    return process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-');
  }

  /**
   * Get provider configuration
   */
  getConfig() {
    return {
      name: 'Anthropic Claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      model: 'claude-3-haiku-20240307',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Format payload for Anthropic's API
   */
  formatPayload(systemMessage, userMessages, maxTokens = 4000) {
    return {
      model: this.getConfig().model,
      max_tokens: maxTokens,
      messages: userMessages,
      system: systemMessage
    };
  }

  /**
   * Extract response from API response
   */
  extractResponseFromData(data) {
    const response = data?.content?.[0]?.text;
    
    if (!response) {
      console.error("Invalid Anthropic API response format:", data);
      throw new Error("Invalid API response format");
    }
    
    return response;
  }

  /**
   * Make request to the API
   */
  async makeRequest(systemMessage, userMessages, maxTokens = 4000) {
    const config = this.getConfig();
    const payload = this.formatPayload(systemMessage, userMessages, maxTokens);
    
    this.logApiOperation('REQUEST', `Making API request to Anthropic with model ${config.model}`);
    
    try {
      const response = await axios.post(
        config.endpoint,
        payload,
        {
          headers: config.headers,
          timeout: 60000 // 60 second timeout
        }
      );
      
      this.logApiOperation('RESPONSE', 'Response received successfully');
      
      return this.extractResponseFromData(response.data);
    } catch (error) {
      this.logApiOperation('ERROR', `API request error: ${error.message}`);
      if (error.response?.data) {
        this.logApiOperation('ERROR_DETAILS', JSON.stringify(error.response.data));
      }
      throw error;
    }
  }

  /**
   * Handle URL extraction
   */
  async handleUrlExtraction(url, textContent) {
    const systemMessage = BaseAIProvider.getUrlExtractionSystemMessage();
    
    const prompt = `Web Page Content:
${textContent.substring(0, 8000)} // Limit to 8k characters to stay within token limits`;
    
    return await this.makeRequest(
      systemMessage, 
      [{ role: 'user', content: prompt }],
      4000
    );
  }

  /**
   * Handle chat message
   */
  async handleChatMessage(message, history) {
    const systemMessage = BaseAIProvider.getChatSystemMessage();
    
    return await this.makeRequest(
      systemMessage,
      [...history, { role: 'user', content: message }],
      4000
    );
  }

  /**
   * Handle pasted recipe content
   */
  async handlePastedRecipeContent(content) {
    const systemMessage = BaseAIProvider.getPastedContentSystemMessage();
    
    const prompt = `Copy/pasted Content:
${content.substring(0, 8000)} // Limit to 8k characters to stay within token limits`;
    
    return await this.makeRequest(
      systemMessage,
      [{ role: 'user', content: prompt }],
      4000
    );
  }
}
