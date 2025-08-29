import axios from 'axios';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';

// Load environment variables from parent directory's .env file
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const API_URL = 'http://localhost:3000';

async function testCategorizeIngredients() {
  console.log('\nStarting ingredient categorization test...\n');
  
  try {
    // Test ingredients for categorization
    const testIngredients = [
      'apples',
      'butter',
      'chicken breast',
      'rice',
      'canned beans',
      'salt',
      'baking powder',
      'frozen peas',
      'chocolate chips',
      'coffee'
    ];
    
    console.log('===== Testing ingredient categorization =====');
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
    
    const response = await axios.post(`${API_URL}/shopping-list/categorize`, {
      ingredients: testIngredients
    }, {
      // Increase timeout for API call
      timeout: 10000
    });
    
    if (response.data.success) {
      console.log('✅ Ingredients categorized successfully:');
      console.log(JSON.stringify(response.data.categories, null, 2));
      
      // Check the categorization method
      if (response.data.method === 'ai') {
        console.log('\n✅ Used AI-powered categorization');
      } else if (response.data.method === 'fallback') {
        console.log('\n⚠️ Used fallback categorization due to:', response.data.fallbackReason || 'unknown reason');
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
    
    console.log('\n✅ Ingredient categorization test completed!');
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Error stack:', error.stack);
  }
}

// Run the tests
testCategorizeIngredients();
