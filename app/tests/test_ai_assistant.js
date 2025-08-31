// File: app/tests/test_ai_assistant.js
import assert from 'assert';
import fetch from 'node-fetch';

/**
 * Test the AI Recipe Assistant features
 */
async function testAIRecipeAssistant() {
  console.log('\n🧪 Testing AI Recipe Assistant API...');
  
  // Configuration
  const API_URL = 'http://localhost:3000';
  
  try {
    // Test the chat endpoint
    console.log('\n📝 Testing chat endpoint...');
    const chatResponse = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    
    const pastedResponse = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    const extractResponse = await fetch(`${API_URL}/ai/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    throw error;
  }
}

// Run the tests
testAIRecipeAssistant().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
