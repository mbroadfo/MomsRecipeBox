import axios from 'axios';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';

// Load environment variables from parent directory's .env file
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const API_URL = 'http://localhost:3000';

// This test is designed to test the fallback mechanism
// by sending a request with a missing API key environment variable
// We'll monkey patch the process.env to remove the OpenAI API key temporarily
async function testCategoryFallback() {
  console.log('\nStarting fallback categorization test...\n');
  
  // Save original API key
  const originalApiKey = process.env.OPENAI_API_KEY;
  
  try {
    console.log('===== Testing fallback categorization =====');
    
    // Temporarily remove the API key to force fallback mechanism
    delete process.env.OPENAI_API_KEY;
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    
    // Test ingredients for categorization
    const testIngredients = [
      'apples',
      'butter',
      'chicken breast',
      'rice',
      'canned beans'
    ];
    
    // Make the API call
    const response = await axios.post(`${API_URL}/shopping-list/categorize`, {
      ingredients: testIngredients
    }, {
      timeout: 10000
    });
    
    if (response.data.success) {
      console.log('✅ Ingredients categorized successfully (with fallback):');
      console.log(JSON.stringify(response.data.categories, null, 2));
      
      // Check the categorization method
      if (response.data.method === 'ai') {
        console.log('\n⚠️ Expected fallback but got AI categorization');
      } else if (response.data.method === 'fallback') {
        console.log('\n✅ Used fallback categorization as expected');
        console.log('Fallback reason:', response.data.fallbackReason || 'unknown reason');
      }
      
      // Verify that all ingredients were categorized
      const allCategorized = testIngredients.every(ingredient => 
        response.data.categories[ingredient] !== undefined);
      
      if (allCategorized) {
        console.log('\n✅ All ingredients were categorized.');
      } else {
        console.log('\n❌ Some ingredients were not categorized.');
      }
    } else {
      console.log('❌ Error categorizing ingredients:', response.data.message);
    }
    
    console.log('\n✅ Fallback test completed!');
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Error stack:', error.stack);
  } finally {
    // Restore the original API key
    if (originalApiKey) {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  }
}

// Run the tests
testCategoryFallback();
