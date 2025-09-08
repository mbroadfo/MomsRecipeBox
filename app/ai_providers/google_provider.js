import axios from 'axios';
import { BaseAIProvider } from './base_provider.js';

/**
 * Google Gemini AI Provider
 */
export class GoogleGeminiProvider extends BaseAIProvider {
  /**
   * Check if this provider is available (has valid API keys)
   */
  isAvailable() {
    return process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.startsWith('AIza');
  }

  /**
   * Get provider configuration
   */
  getConfig() {
    return {
      name: 'Google Gemini',
      endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
      apiKey: process.env.GOOGLE_API_KEY,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Format a conversation for Google's API
   */
  formatConversation(systemMessage, messages) {
    // Google Gemini format is different, we need to combine everything into a single prompt
    let googlePrompt = "";
    
    // Add system message as a preamble
    if (systemMessage) {
      googlePrompt += systemMessage + "\n\n";
    }
    
    // Add conversation history
    for (const msg of messages) {
      googlePrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
    }
    
    return googlePrompt;
  }

  /**
   * Format payload for Google's API
   */
  formatPayload(prompt, temperature = 0.7, maxTokens = 1024) {
    return {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: maxTokens
      }
    };
  }

  /**
   * Extract response from API response
   */
  extractResponseFromData(data) {
    const response = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!response) {
      console.error("Invalid Google API response format:", data);
      throw new Error("Invalid Google API response format");
    }
    
    return response;
  }

  /**
   * Make request to the API
   */
  async makeRequest(prompt, temperature = 0.7, maxTokens = 1024) {
    const config = this.getConfig();
    const payload = this.formatPayload(prompt, temperature, maxTokens);
    
    // For Google API, the key is sent as a query parameter
    const requestUrl = `${config.endpoint}?key=${config.apiKey}`;
    
    this.logApiOperation('REQUEST', 'Making API request to Google Gemini');
    console.log('Google Gemini Request - Temperature:', temperature, 'MaxTokens:', maxTokens);
    
    try {
      const response = await axios.post(
        requestUrl,
        payload,
        {
          headers: config.headers,
          timeout: 60000 // 60 second timeout
        }
      );
      
      this.logApiOperation('RESPONSE', 'Response received successfully');
      
      // Log the raw response data for debugging
      console.log('Google API raw response structure:', Object.keys(response.data));
      
      if (response.data.candidates && response.data.candidates.length > 0) {
        console.log('First candidate structure:', Object.keys(response.data.candidates[0]));
        if (response.data.candidates[0].content) {
          console.log('Content structure:', Object.keys(response.data.candidates[0].content));
          if (response.data.candidates[0].content.parts && response.data.candidates[0].content.parts.length > 0) {
            console.log('First part sample:', response.data.candidates[0].content.parts[0].text.substring(0, 100) + '...');
          }
        }
      }
      
      const extractedText = this.extractResponseFromData(response.data);
      console.log('Extracted text length:', extractedText.length);
      console.log('Extracted text first 100 chars:', extractedText.substring(0, 100));
      
      return extractedText;
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
    console.log("===== GOOGLE GEMINI URL EXTRACTION =====");
    console.log("URL:", url);
    
    const prompt = `${BaseAIProvider.getDetailedExtractionPrompt()}

Web Page Content:
${textContent.substring(0, 8000)} // Limit to 8k characters to stay within token limits`;
    
    const googlePrompt = "You are a precise recipe extraction assistant that strictly follows formatting instructions. You must start your response EXACTLY with 'Title:' and include NO text before that. This is critical for recipe parsing. Format the recipe exactly as requested with no additional commentary or explanation.\n\n" + prompt;
    
    console.log("Sending request to Google Gemini API...");
    const rawResponse = await this.makeRequest(googlePrompt, 0.3, 2048);
    console.log("Received raw response length:", rawResponse.length);
    console.log("Raw response first 200 chars:", JSON.stringify(rawResponse.substring(0, 200)));
    
    // Clean up the response: Google Gemini often adds explanatory text
    let cleanedResponse = rawResponse.trim();
    
    // Remove any prefacing text before "Title:"
    const titleIndex = cleanedResponse.indexOf("Title:");
    if (titleIndex > 0) {
      console.log("Found 'Title:' at position", titleIndex, "- trimming preceding text");
      console.log("Text being removed:", JSON.stringify(cleanedResponse.substring(0, titleIndex)));
      cleanedResponse = cleanedResponse.substring(titleIndex);
    } else if (titleIndex === -1) {
      console.error("ERROR: 'Title:' not found in Google Gemini response!");
      console.log("Full response:", JSON.stringify(rawResponse));
      
      // Attempt aggressive recovery - look for other potential section headers
      const sections = ["Description:", "Ingredients:", "Instructions:", "Steps:"];
      for (const section of sections) {
        const sectionIndex = cleanedResponse.indexOf(section);
        if (sectionIndex >= 0) {
          console.log(`'Title:' not found but found '${section}' at position ${sectionIndex}`);
          
          // If we found "Ingredients:" or another section, insert a placeholder title
          cleanedResponse = "Title: Recipe from " + url + "\n\n" + cleanedResponse;
          console.log("Added placeholder title to response");
          break;
        }
      }
    }
    
    // Further cleanup - ensure proper section separation
    cleanedResponse = cleanedResponse
      // Make sure each section header is on its own line
      .replace(/([A-Z][a-z]+):/g, '\n$1:')
      // Remove multiple blank lines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Ensure ingredients and instructions have proper formatting
      .replace(/Ingredients:(?!\s*\n)/g, 'Ingredients:\n')
      .replace(/Instructions:(?!\s*\n)/g, 'Instructions:\n');
    
    console.log("Final cleaned response structure:");
    console.log("- Starts with:", cleanedResponse.substring(0, 100).replace(/\n/g, '\\n'));
    
    // Perform detailed structure validation
    console.log("Structure validation:");
    console.log("- Contains 'Title:':", cleanedResponse.includes("Title:"));
    console.log("- Contains 'Description:':", cleanedResponse.includes("Description:"));
    console.log("- Contains 'Ingredients:':", cleanedResponse.includes("Ingredients:"));
    console.log("- Contains 'Instructions:':", cleanedResponse.includes("Instructions:") || cleanedResponse.includes("Steps:"));
    
    // Validate the response format - does it have key sections?
    if (!cleanedResponse.includes("Title:") || 
        !cleanedResponse.includes("Ingredients:") || 
        (!cleanedResponse.includes("Instructions:") && !cleanedResponse.includes("Steps:"))) {
      
      console.error("ERROR: Response is missing critical recipe sections!");
      console.log("Full cleaned response:", cleanedResponse);
      
      // Attempt one more emergency correction - force structure
      if (!cleanedResponse.includes("Title:")) {
        cleanedResponse = "Title: Recipe from " + url + "\n\n" + cleanedResponse;
      }
    }
    
    console.log("===== END GOOGLE GEMINI URL EXTRACTION =====");
    return cleanedResponse;
  }

  /**
   * Handle chat message
   */
  async handleChatMessage(message, history) {
    console.log("===== GOOGLE GEMINI CHAT MESSAGE =====");
    
    const systemMessage = BaseAIProvider.getChatSystemMessage();
    
    const formattedConversation = this.formatConversation(systemMessage, [
      ...history,
      { role: 'user', content: message }
    ]);
    
    console.log("Sending chat request to Google Gemini API...");
    const rawResponse = await this.makeRequest(formattedConversation, 0.7, 1024);
    console.log("Received chat response length:", rawResponse.length);
    
    // Check if this contains a recipe
    const hasRecipe = rawResponse.includes("Title:") && 
                      rawResponse.includes("Ingredients:") && 
                      (rawResponse.includes("Instructions:") || rawResponse.includes("Steps:"));
    
    console.log("Chat response contains recipe:", hasRecipe);
    
    if (hasRecipe) {
      // Extract just the recipe part for better parsing
      const titleIndex = rawResponse.indexOf("Title:");
      
      if (titleIndex >= 0) {
        console.log("Chat response contains recipe at position", titleIndex, "- cleaning up");
        
        if (titleIndex > 0) {
          console.log("Text before recipe:", rawResponse.substring(0, titleIndex));
        }
        
        const cleanedResponse = rawResponse.substring(titleIndex)
          // Make sure each section header is on its own line
          .replace(/([A-Z][a-z]+):/g, '\n$1:')
          // Remove multiple blank lines
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          // Ensure ingredients and instructions have proper formatting
          .replace(/Ingredients:(?!\s*\n)/g, 'Ingredients:\n')
          .replace(/Instructions:(?!\s*\n)/g, 'Instructions:\n');
        
        console.log("Cleaned chat recipe response starts with:", cleanedResponse.substring(0, 100).replace(/\n/g, '\\n'));
        console.log("===== END GOOGLE GEMINI CHAT MESSAGE =====");
        return cleanedResponse;
      }
    }
    
    console.log("Returning standard chat response");
    console.log("===== END GOOGLE GEMINI CHAT MESSAGE =====");
    return rawResponse;
  }

  /**
   * Handle pasted recipe content
   */
  async handlePastedRecipeContent(content) {
    console.log("===== GOOGLE GEMINI PASTED RECIPE CONTENT =====");
    
    const prompt = `${BaseAIProvider.getDetailedExtractionPrompt()}

Copy/pasted Content:
${content.substring(0, 8000)} // Limit to 8k characters to stay within token limits`;
    
    const googlePrompt = "You are a precise recipe extraction assistant that strictly follows formatting instructions. You must start your response EXACTLY with 'Title:' and include NO text before that. This is critical for recipe parsing. Format the recipe exactly as requested with no additional commentary or explanation.\n\n" + prompt;
    
    console.log("Sending pasted content request to Google Gemini API...");
    const rawResponse = await this.makeRequest(googlePrompt, 0.3, 2048);
    console.log("Received pasted content response length:", rawResponse.length);
    console.log("Raw response first 200 chars:", JSON.stringify(rawResponse.substring(0, 200)));
    
    // Clean up the response: Google Gemini often adds explanatory text
    let cleanedResponse = rawResponse.trim();
    
    // Remove any prefacing text before "Title:"
    const titleIndex = cleanedResponse.indexOf("Title:");
    if (titleIndex > 0) {
      console.log("Found 'Title:' at position", titleIndex, "- trimming preceding text");
      console.log("Text being removed:", JSON.stringify(cleanedResponse.substring(0, titleIndex)));
      cleanedResponse = cleanedResponse.substring(titleIndex);
    } else if (titleIndex === -1) {
      console.error("ERROR: 'Title:' not found in Google Gemini response for pasted content!");
      console.log("First 300 chars of raw response:", JSON.stringify(rawResponse.substring(0, 300)));
      
      // Attempt aggressive recovery - look for other potential section headers
      const sections = ["Description:", "Ingredients:", "Instructions:", "Steps:"];
      for (const section of sections) {
        const sectionIndex = cleanedResponse.indexOf(section);
        if (sectionIndex >= 0) {
          console.log(`'Title:' not found but found '${section}' at position ${sectionIndex}`);
          
          // If we found "Ingredients:" or another section, insert a placeholder title
          cleanedResponse = "Title: Extracted Recipe\n\n" + cleanedResponse;
          console.log("Added placeholder title to response");
          break;
        }
      }
    }
    
    // Further cleanup - ensure proper section separation
    cleanedResponse = cleanedResponse
      // Make sure each section header is on its own line
      .replace(/([A-Z][a-z]+):/g, '\n$1:')
      // Remove multiple blank lines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Ensure ingredients and instructions have proper formatting
      .replace(/Ingredients:(?!\s*\n)/g, 'Ingredients:\n')
      .replace(/Instructions:(?!\s*\n)/g, 'Instructions:\n');
    
    console.log("Final cleaned response structure:");
    console.log("- Starts with:", cleanedResponse.substring(0, 100).replace(/\n/g, '\\n'));
    
    // Perform detailed structure validation
    console.log("Structure validation:");
    console.log("- Contains 'Title:':", cleanedResponse.includes("Title:"));
    console.log("- Contains 'Description:':", cleanedResponse.includes("Description:"));
    console.log("- Contains 'Ingredients:':", cleanedResponse.includes("Ingredients:"));
    console.log("- Contains 'Instructions:':", cleanedResponse.includes("Instructions:") || cleanedResponse.includes("Steps:"));
    
    console.log("===== END GOOGLE GEMINI PASTED RECIPE CONTENT =====");
    return cleanedResponse;
  }
}
