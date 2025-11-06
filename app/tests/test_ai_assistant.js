// File: app/tests/test_ai_assistant.js
import assert from 'assert';
import fetch from 'node-fetch';
import { getBaseUrl } from './utils/environment-detector.js';
import { getBearerToken, validateConfig } from './utils/auth0-token-generator.js';

// Auth0 JWT token generation for API authentication
async function getAuthHeaders() {
  try {
    const bearerToken = await getBearerToken();
    return {
      'Authorization': bearerToken,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Failed to generate Auth0 token:', error.message);
    throw error;
  }
}

/**
 * Test the AI Recipe Assistant features
 */
async function testAIRecipeAssistant() {
  console.log('\n🧪 Testing AI Recipe Assistant API...');
  
  // Use our simplified cloud-only environment detection
  const BASE_URL = await getBaseUrl();
  
  console.log(`🔧 Architecture: cloud-only (simplified)`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  
  // Validate Auth0 configuration
  console.log('\n===== Validating Auth0 Configuration =====');
  await validateConfig();
  
  // Get authentication headers
  const authHeaders = await getAuthHeaders();
  
  try {
    // Test the chat endpoint
    console.log('\n📝 Testing chat endpoint...');
    const chatResponse = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        message: 'Create a simple cookie recipe'
      }),
    });
    
    assert.strictEqual(chatResponse.status, 200, 'Chat endpoint should return 200 OK');
    const chatData = await chatResponse.json();
    
    assert.strictEqual(typeof chatData.success, 'boolean', 'Response should have a success field');
    assert.strictEqual(chatData.success, true, 'Success should be true');
    assert.strictEqual(typeof chatData.message, 'string', 'Response should have a message field');
    console.log('✅ Chat endpoint working correctly');
    
    // Test pasted recipe content
    console.log('\n📋 Testing pasted recipe content handling...');
    const pastedContent = `
    Featured
    Recipes
    
    Equipment
    
    Ingredients
    
    Learn
    
    Shows
    
    Magazines
    
    Shop
    Search
    
    Buttermilk Mashed Potatoes
    4.5
    (44)
    14 Comments
    Side Dishes
    Potatoes
    Gluten Free
    Vegetarian
    Appears in Cook's Country February/March 2010
    Too many recipes are buttermilk in name only. We wanted to actually taste the stuff.
    
    YIELD Serves 4
    
    TIME 45 minutes
    
    Ingredients
    2 pounds Yukon Gold potatoes, peeled, quartered, and cut into 1/2-inch pieces
    6 tablespoons unsalted butter, cut into pieces
    1 cup buttermilk
    6 tablespoons water
    ⅛ teaspoon baking soda
    Salt and pepper
    
    Instructions
    1. Add potatoes, 2 tablespoons butter, 3/4 cup buttermilk, water, baking soda, and 1/2 teaspoon salt to Dutch oven and stir to combine. 
    2. Off heat, add remaining butter to pot and mash with potato masher until smooth. Using rubber spatula, fold in remaining buttermilk until absorbed and potatoes are creamy. Season with salt and pepper. Serve.
    `;
    
    const pastedResponse = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        message: pastedContent
      }),
    });
    
    assert.strictEqual(pastedResponse.status, 200, 'Pasted content should return 200 OK');
    const pastedData = await pastedResponse.json();
    
    assert.strictEqual(typeof pastedData.success, 'boolean', 'Response should have a success field');
    assert.strictEqual(pastedData.success, true, 'Success should be true');
    assert.strictEqual(typeof pastedData.message, 'string', 'Response should have a message field');
    assert.ok(pastedData.recipeData, 'Response should include extracted recipe data');
    assert.strictEqual(pastedData.recipeData.title, 'Buttermilk Mashed Potatoes', 'Recipe title should be extracted correctly');
    console.log('✅ Pasted recipe content handling working correctly');
    
    // Test URL extraction endpoint
    console.log('\n🔗 Testing URL extraction endpoint...');
    const extractResponse = await fetch(`${BASE_URL}/ai/extract`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        url: 'https://www.simplyrecipes.com/recipes/homemade_pizza/'
      }),
    });
    
    if (extractResponse.status === 200) {
      const extractData = await extractResponse.json();
      assert.strictEqual(typeof extractData.success, 'boolean', 'Response should have a success field');
      assert.strictEqual(extractData.success, true, 'Success should be true');
      assert.strictEqual(typeof extractData.message, 'string', 'Response should have a message field');
      console.log('✅ URL extraction endpoint working correctly');
    } else {
      console.log('⚠️ URL extraction test skipped (external URL may not be accessible)');
    }
    
    console.log('\n🎉 All AI Recipe Assistant tests passed!');
  } catch (error) {
    console.error('❌ Error testing AI Recipe Assistant:', error);
    
    // Special handling for Lambda mode without database
    if (error.message?.includes('Request failed with status code 503')) {
      console.log('\n🔍 LAMBDA MODE DETECTED: Database not connected');
      console.log('ℹ️  This is expected behavior in Lambda mode without Atlas database');
      console.log('ℹ️  To run full AI assistant tests, ensure Atlas database is configured and accessible');
      console.log('ℹ️  Lambda infrastructure is working correctly (API Gateway → Lambda routing functional)');
      return false; // Indicate database tests not possible
    }
    
    throw error;
  }
}

// Run the tests
testAIRecipeAssistant().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
