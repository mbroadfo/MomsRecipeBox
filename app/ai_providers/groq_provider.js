import axios from 'axios';
import { BaseAIProvider } from './base_provider.js';
import https from 'https';

/**
 * Groq Provider
 */
export class GroqProvider extends BaseAIProvider {
  /**
   * Check if this provider is available (has valid API keys)
   */
  isAvailable() {
    return process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_');
  }

  /**
   * Get provider configuration
   */
  getConfig() {
    return {
      name: 'Groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      // Use llama-3.1-8b-instant which should be available on Groq (newer model)
      model: 'llama-3.1-8b-instant',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Format messages for Groq's API (OpenAI compatible)
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
   * Format payload for Groq's API with absolute minimal configuration
   */
  formatPayload(messages, temperature = 0.7) {
    // Extremely minimal approach - use exactly the format from Groq API docs
    const cleanMessages = [];
    
    // Take only the latest user message
    const latestUserMessage = messages.filter(msg => msg.role === "user").slice(-1)[0];
    
    if (latestUserMessage) {
      // Truncate to a very short message
      cleanMessages.push({
        role: "user",
        content: latestUserMessage.content.substring(0, 300)
      });
    } else {
      // Fallback if no user message
      cleanMessages.push({
        role: "user",
        content: "Hello"
      });
    }
    
    // Absolute minimum required payload for Groq API
    return {
      model: this.getConfig().model,
      messages: cleanMessages
    };
  }

  /**
   * Extract response from API response
   */
  extractResponseFromData(data) {
    // Groq response format may vary slightly
    let response = data?.choices?.[0]?.message?.content;
    if (!response && data?.choices?.[0]?.text) {
      // Alternative format sometimes used by Groq
      response = data.choices[0].text;
    }
    
    if (!response) {
      console.error("Invalid Groq API response format:", data);
      throw new Error("Invalid API response format");
    }
    
    return response;
  }

  /**
   * Make request to the API using native https module for better debugging
   */
  async makeRequest(systemMessage, userMessages, temperature = 0.7) {
    const config = this.getConfig();
    
    // Create messages array
    const messages = [];
    
    // Add system message if provided
    if (systemMessage) {
      messages.push({
        role: "system",
        content: systemMessage
      });
    }
    
    // Add user messages
    if (userMessages && userMessages.length > 0) {
      for (const msg of userMessages) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    } else {
      // Fallback message if none provided
      messages.push({
        role: "user",
        content: "Hello, please provide a recipe."
      });
    }
    
    // Create the actual payload for recipe extraction
    const payload = {
      model: config.model,
      messages: messages,
      temperature: temperature,
      max_tokens: 2000  // Allow more tokens for full recipe extraction
    };
    
    // Convert payload to string
    const payloadString = JSON.stringify(payload);
    
    console.log('Groq API Request Payload:', payloadString);
    
    // Use a Promise to wrap the HTTPS request
    return new Promise((resolve, reject) => {
      try {
        const options = {
          hostname: 'api.groq.com',
          path: '/openai/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Length': Buffer.byteLength(payloadString)
          }
        };
        
        console.log('Groq API Request Options:', JSON.stringify(options, (key, value) => 
          key === 'Authorization' ? '***REDACTED***' : value
        ));
        
        // Create the request
        const req = https.request(options, (res) => {
          console.log(`Groq API Status Code: ${res.statusCode}`);
          
          let data = '';
          
          // A chunk of data has been received
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          // The whole response has been received
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsedData = JSON.parse(data);
                const content = parsedData.choices[0]?.message?.content || "No response content";
                console.log(`Groq API Success Response (truncated): ${content.substring(0, 200)}...`);
                resolve(content);
              } catch (error) {
                console.error('Error parsing Groq API response:', error);
                reject(new Error(`Failed to parse Groq API response: ${error.message}`));
              }
            } else {
              // Error response
              console.error(`Groq API Error Response: ${data}`);
              
              // Try to parse the error response for more details
              let errorDetails = "";
              try {
                const errorJson = JSON.parse(data);
                if (errorJson.error && errorJson.error.message) {
                  errorDetails = errorJson.error.message;
                }
              } catch (e) {
                errorDetails = data;
              }
              
              if (res.statusCode === 404) {
                reject(new Error(`Groq API 404 - Model not found. Details: ${errorDetails}`));
              } else if (res.statusCode === 401) {
                reject(new Error(`Groq API 401 - Unauthorized. Please check your API key.`));
              } else if (res.statusCode === 400) {
                reject(new Error(`Groq API 400 - Bad Request. Details: ${errorDetails}`));
              } else if (res.statusCode === 429) {
                const error = new Error(`Groq API 429 - Rate limit exceeded. Details: ${errorDetails}`);
                error.isRateLimit = true;
                reject(error);
              } else {
                reject(new Error(`Groq API Error (${res.statusCode}): ${errorDetails}`));
              }
            }
          });
        });
        
        // Handle request errors
        req.on('error', (error) => {
          console.error(`Groq API Request Error: ${error.message}`);
          reject(new Error(`Groq API request failed: ${error.message}`));
        });
        
        // Send the payload
        req.write(payloadString);
        req.end();
        
      } catch (error) {
        console.error('Error making Groq API request:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle URL extraction with structured prompt for recipe extraction
   */
  async handleUrlExtraction(url, textContent) {
    const systemMessage = BaseAIProvider.getUrlExtractionSystemMessage();

    // Truncate content to avoid token limits but keep more than before
    const truncatedContent = textContent.substring(0, 3000);
    
    const prompt = `Extract recipe from this content: ${truncatedContent}`;
    
    return await this.makeRequest(systemMessage, [
      { role: 'user', content: prompt }
    ]);
  }

  /**
   * Handle chat message with structured prompt for recipe assistance
   */
  async handleChatMessage(message, history) {
    const systemMessage = BaseAIProvider.getChatSystemMessage();

    return await this.makeRequest(systemMessage, [
      { role: 'user', content: message }
    ]);
  }

  /**
   * Handle pasted recipe content with structured prompt
   */
  async handlePastedRecipeContent(content) {
    const systemMessage = BaseAIProvider.getPastedContentSystemMessage();

    const prompt = `Clean up and format this recipe content: ${content.substring(0, 3000)}`;
    
    return await this.makeRequest(systemMessage, [
      { role: 'user', content: prompt }
    ]);
  }
}
