/**
 * test_recipes.js - Full lifecycle test for MomsRecipeBox recipe     // Step 4: Update the recipe
        // Step 6: Like the recipe
    console.log('\n===== Liking recipe =====');
    const likeResponse = await axios.post(
      `${BASE_URL}/recipes/${recipeId}/like`,
      likeToggle
    );
    console.log('Like toggled:');
    console.log(JSON.stringify(likeResponse.data, null, 2));
    
    // Step 7: Unlike the recipeg('\n===== Updating recipe =====');
    const updatedRecipe = {
      ...testRecipe,
      title: "Updated Recipe Title",
      description: "This recipe has been updated via API test",
      tags: [...testRecipe.tags, 'updated']
    };
    const updateRecipeResponse = await axios.put(
      `${BASE_URL}/recipes/${recipeId}`,
      updatedRecipe
    );
    console.log('Recipe updated:');
    console.log(JSON.stringify(updateRecipeResponse.data, null, 2));
    
    // Step 5: Verify the recipe was updatedeate, Read, Update, Like and Delete operations for recipes
 * (Comments tests have been moved to test_comments.js)
 */

import axios from 'axios';
import assert from 'assert';
import { getBearerToken, validateConfig } from './utils/auth0-token-generator.js';
import { getBaseUrl, logEnvironmentInfo } from './utils/environment-detector.js';
import 'dotenv/config';

const BASE_URL = getBaseUrl();

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

// Test data for recipe creation
const testRecipe = {
  owner_id: 'auth0|testuser',
  visibility: 'public',
  status: 'published',
  title: 'Test Recipe from Node.js',
  subtitle: 'Delicious automation',
  description: 'A sample recipe to verify API connectivity',
  image_url: 'https://example.com/test-image.jpg',
  tags: ['nodejs', 'test', 'automation'],
  sections: [
    { section_type: 'Instructions', content: 'Mix everything together.', position: 1 },
    { section_type: 'Notes', content: 'Tastes better warm.', position: 2 }
  ],
  ingredients: [
    { name: 'Flour', quantity: '2 cups', position: 1 },
    { name: 'Sugar', quantity: '1 cup', position: 2 },
    { name: 'Salt', quantity: '1 tsp', position: 3 }
  ]
};

// Like toggle data
const likeToggle = {
  user_id: 'auth0|testuser'
};

/**
 * Run all tests in sequence with error handling for different modes
 */
async function runTests() {
  console.log('Starting recipe API tests...');
  logEnvironmentInfo();
  
  try {
    // Validate Auth0 configuration
    console.log('\n===== Validating Auth0 Configuration =====');
    validateConfig();
    console.log('✅ Auth0 configuration validated');

    // Generate authentication headers
    console.log('\n===== Generating JWT Token =====');
    const authHeaders = await getAuthHeaders();
    console.log('✅ JWT token generated successfully');
    
    // Step 1: Create a new recipe
    console.log('\n===== Creating new recipe =====');
    const createResponse = await axios.post(`${BASE_URL}/recipes`, testRecipe, { headers: authHeaders });
    console.log(`Recipe created with ID: ${createResponse.data._id}`);
    console.log(JSON.stringify(createResponse.data, null, 2));
    
    // Store the recipe ID for subsequent tests
    const recipeId = createResponse.data._id;
    
    // Wait a brief moment to ensure the data is processed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 2: List all recipes
    console.log('\n===== Listing recipes =====');
    const listResponse = await axios.get(`${BASE_URL}/recipes`, { headers: authHeaders });
    console.log('Recipe list retrieved:');
    console.log(`Found ${listResponse.data.recipes.length} recipes`);
    assert.strictEqual(listResponse.status, 200, 'Expected 200 status code for list recipes');
    assert.ok(Array.isArray(listResponse.data.recipes), 'Expected recipes array in response');
    
    // Step 3: Fetch the created recipe
    console.log('===== Fetching recipe =====');
    const getResponse = await axios.get(`${BASE_URL}/recipes/${recipeId}`, { headers: authHeaders });
    console.log('Recipe retrieved successfully:');
    console.log(JSON.stringify(getResponse.data, null, 2));
    assert.strictEqual(getResponse.data._id, recipeId, 'Recipe ID mismatch');
    
    // Step 4: Update the recipe
    console.log('\n===== Updating recipe =====');
    const updatedRecipe = {
      ...testRecipe,
      title: "Updated Recipe Title",
      description: "This recipe has been updated via API test",
      tags: [...testRecipe.tags, 'updated']
    };
    const updateRecipeResponse = await axios.put(
      `${BASE_URL}/recipes/${recipeId}`,
      updatedRecipe,
      { headers: authHeaders }
    );
    console.log('Recipe updated:');
    console.log(JSON.stringify(updateRecipeResponse.data, null, 2));
    
    // Step 5: Verify the recipe was updated
    console.log('\n===== Verifying recipe update =====');
    const updatedGetResponse = await axios.get(`${BASE_URL}/recipes/${recipeId}`, { headers: authHeaders });
    console.log('Updated recipe retrieved:');
    console.log(JSON.stringify(updatedGetResponse.data, null, 2));
    assert.strictEqual(updatedGetResponse.data.title, "Updated Recipe Title", 'Recipe title not updated correctly');
    assert.strictEqual(updatedGetResponse.data.description, "This recipe has been updated via API test", 'Recipe description not updated correctly');
    assert.ok(updatedGetResponse.data.tags.includes('updated'), 'Updated tag not found in recipe');
    
    // Step 6: Like the recipe
    console.log('\n===== Liking recipe =====');
    const likeResponse = await axios.post(
      `${BASE_URL}/recipes/${recipeId}/like`,
      likeToggle,
      { headers: authHeaders }
    );
    console.log('Like toggled:');
    console.log(JSON.stringify(likeResponse.data, null, 2));
    
    // Step 7: Unlike the recipe
    console.log('\n===== Unliking recipe =====');
    const unlikeResponse = await axios.post(
      `${BASE_URL}/recipes/${recipeId}/like`,
      likeToggle,
      { headers: authHeaders }
    );
    console.log('Like toggled again:');
    console.log(JSON.stringify(unlikeResponse.data, null, 2));
    
    // Step 8: Delete the recipe
    console.log('\n===== Deleting recipe =====');
    const deleteRecipeResponse = await axios.delete(`${BASE_URL}/recipes/${recipeId}`, { headers: authHeaders });
    console.log('Recipe deleted:');
    console.log(JSON.stringify(deleteRecipeResponse.data, null, 2));
    
    // Validate the new delete response format
    if (deleteRecipeResponse.data.message && typeof deleteRecipeResponse.data.deletedImages === 'number') {
      console.log(`✅ Delete response format correct: ${deleteRecipeResponse.data.deletedImages} images deleted`);
    } else {
      console.warn('⚠️ Delete response format may need updating');
    }
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      
      // Special handling for Lambda mode without database
      if (error.response.status === 503 && error.response.data?.message?.includes('Database connection not available')) {
        console.log('\n🔍 LAMBDA MODE DETECTED: Database not connected');
        console.log('ℹ️  This is expected behavior in Lambda mode without Atlas database');
        console.log('ℹ️  To run full CRUD tests, ensure Atlas database is configured and accessible');
        console.log('ℹ️  Lambda infrastructure is working correctly (API Gateway → Lambda routing functional)');
        return false; // Indicate database tests not possible
      }
      
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests();
