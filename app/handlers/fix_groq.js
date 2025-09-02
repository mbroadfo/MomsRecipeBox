// This is a test file to check our AI API integrations

// Use ES Module syntax
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testGoogle() {
  try {
    console.log("Testing Google Gemini API...");
    
    // Get the API key from environment
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("No GOOGLE_API_KEY found in environment");
      return;
    }
    
    const endpoint = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent';
    
    const payload = {
      contents: [
        {
          parts: [
            {
              text: "Hello, can you give me a simple recipe for chocolate chip cookies?"
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    };
    
    // For Google API, the key is sent as a query parameter
    const requestUrl = `${endpoint}?key=${apiKey}`;
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    console.log("Making request to Google Gemini API");
    
    const response = await axios.post(
      requestUrl,
      payload,
      {
        headers: headers,
        timeout: 60000 // 60 second timeout
      }
    );
    
    console.log("Response received!");
    console.log("Status:", response.status);
    console.log("Has data:", !!response.data);
    
    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      const content = response.data.candidates[0].content.parts[0].text;
      console.log("Content received:", !!content);
      console.log("First 100 chars:", content?.substring(0, 100));
    } else {
      console.log("No content in response");
      console.log("Response data:", JSON.stringify(response.data).substring(0, 500));
    }
    
  } catch (error) {
    console.error("Error testing Google API:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

// Run the test
testGoogle();

// Export for ES Module compatibility
export default testGoogle;
