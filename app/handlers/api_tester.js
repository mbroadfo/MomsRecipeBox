// This is a test file to check our AI API integrations

// Use ES Module syntax
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testOpenAI() {
  try {
    console.log("Testing OpenAI API...");
    
    // Get the API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("No OPENAI_API_KEY found in environment");
      return;
    }
    
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const model = 'gpt-3.5-turbo'; // Using the cheaper model
    
    const payload = {
      model: model,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: "Hello, can you give me a simple recipe for chocolate chip cookies?"
        }
      ],
      temperature: 0.7
    };
    
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    
    console.log(`Making request to OpenAI API with model: ${model}`);
    
    const response = await axios.post(
      endpoint,
      payload,
      {
        headers: headers,
        timeout: 60000 // 60 second timeout
      }
    );
    
    console.log("Response received!");
    console.log("Status:", response.status);
    console.log("Has data:", !!response.data);
    console.log("Has choices:", !!(response.data && response.data.choices));
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message?.content;
      console.log("Content received:", !!content);
      console.log("First 100 chars:", content?.substring(0, 100));
      console.log("\nSuccess! The API is working correctly.");
    } else {
      console.log("No choices in response");
      console.log("Response data:", JSON.stringify(response.data).substring(0, 500));
    }
    
    return true;
  } catch (error) {
    console.error("Error testing OpenAI API:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    return false;
  }
}

// Run the test
console.log("Starting API compatibility test...");
testOpenAI().then(success => {
  if (success) {
    console.log("\n✅ OpenAI API is working correctly. The app should function properly with the current configuration.");
  } else {
    console.log("\n❌ OpenAI API test failed. Please check your API key and configuration.");
  }
});

// Export for ES Module compatibility
export default testOpenAI;
