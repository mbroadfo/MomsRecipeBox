import axios from 'axios';
import { BaseAIProvider } from './base_provider.js';

/**
 * OpenAI Provider
 */
export class OpenAIProvider extends BaseAIProvider {
  /**
   * Check if this provider is available (has valid API keys)
   */
  isAvailable() {
    return process.env.OPENAI_API_KEY && 
      (process.env.OPENAI_API_KEY.startsWith('sk-proj-') || process.env.OPENAI_API_KEY.startsWith('sk-'));
  }

  /**
   * Get provider configuration
   */
  getConfig() {
    return {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Format messages for OpenAI's API
   */
  formatMessages(systemMessage, userMessages) {
    const messages = [];
    
    // Add system message
    if (systemMessage) {
      messages.push({
        role: "system",
        content: systemMessage
      });
    }
    
    // Add user messages
    for (const msg of userMessages) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    return messages;
  }

  /**
   * Format payload for OpenAI's API
   */
  formatPayload(messages, temperature = 0.7) {
    return {
      model: this.getConfig().model,
      messages: messages,
      temperature: temperature
    };
  }

  /**
   * Extract response from API response
   */
  extractResponseFromData(data) {
    const response = data?.choices?.[0]?.message?.content;
    
    if (!response) {
      console.error("Invalid OpenAI API response format:", data);
      throw new Error("Invalid API response format");
    }
    
    return response;
  }

  /**
   * Make request to the API
   */
  async makeRequest(systemMessage, userMessages, temperature = 0.7) {
    const config = this.getConfig();
    const messages = this.formatMessages(systemMessage, userMessages);
    const payload = this.formatPayload(messages, temperature);
    
    this.logApiOperation('REQUEST', `Making API request to OpenAI with model ${config.model}`);
    
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
      0.3 // Lower temperature for more consistent results
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
      0.7 // Slightly more creative for recipe generation
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
      0.3 // Lower temperature for more consistent results
    );
  }
}
