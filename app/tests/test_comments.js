 /**
 * test_comments.js - Full lifecycle test for MomsRecipeBox comment API
 * Tests Create, Read, Update, and Delete operations for comments
 */

import axios from 'axios';
import assert from 'assert';
import { getBearerToken, validateConfig } from './utils/auth0-token-generator.js';
import { getBaseUrl, logEnvironmentInfo } from './utils/environment-detector.js';

// Get base URL dynamically to ensure dotenv is loaded
async function getBaseUrlDynamic() {
  return await getBaseUrl();
}

// Function to get auth headers
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

// Test data for recipe creation (needed to attach comments)
const testRecipe = {
  owner_id: 'auth0|testuser',
  visibility: 'public',
  status: 'published',
  title: 'Comment Test Recipe',
  subtitle: 'For testing comments API',
  description: 'A sample recipe to test comment functionality',
  image_url: 'https://example.com/test-image.jpg',
  tags: ['test', 'comments'],
  sections: [
    { section_type: 'Instructions', content: 'Just a test recipe for comments.', position: 1 }
  ],
  ingredients: [
    { name: 'Test Ingredient', quantity: '1 cup', position: 1 }
  ]
};

// Comment test data - user_id will be extracted from JWT by the API
const testComment = {
  content: 'This is a test comment on the recipe'
};

// Updated comment data
const updatedComment = {
  content: 'This comment has been updated for testing'
};

// Second comment for testing multiple comments - user_id will be extracted from JWT by the API
const secondComment = {
  content: 'This is another test comment from the same user'
};

/**
 * Run all comment-related tests in sequence
 */
async function runTests() {
  console.log('Starting comment API tests...');
  await logEnvironmentInfo();
  
  // Get base URL once for all requests
  const BASE_URL = await getBaseUrlDynamic();
  
  let recipeId, firstCommentId, secondCommentId;
  
  try {
    // Validate Auth0 configuration
    console.log('\n===== Validating Auth0 Configuration =====');
    await validateConfig();
    console.log('✅ Auth0 configuration validated');
    
    // Step 1: Create a test recipe to attach comments to
    console.log('\n===== Creating test recipe for comments =====');
    const recipeUrl = `${BASE_URL}/recipes`;
    console.log(`🔗 Recipe URL: ${recipeUrl}`);
    const createRecipeResponse = await axios.post(recipeUrl, testRecipe, { headers: await getAuthHeaders() });
    recipeId = createRecipeResponse.data._id;
    console.log(`Test recipe created with ID: ${recipeId}`);
    
    // Step 2: Post a comment on the recipe
    console.log('\n===== Creating first comment =====');
    const commentUrl = `${BASE_URL}/recipes/${recipeId}/comments`;
    console.log(`🔗 Comment URL: ${commentUrl}`);
    const createCommentResponse = await axios.post(
      commentUrl,
      testComment,
      { headers: await getAuthHeaders() }
    );
    console.log('Comment created:');
    console.log(JSON.stringify(createCommentResponse.data, null, 2));
    
    // Store the comment ID
    firstCommentId = createCommentResponse.data._id;
    assert.strictEqual(createCommentResponse.status, 201, 'Expected 201 status code for comment creation');
    assert.ok(firstCommentId, 'Comment should have an ID');
    assert.strictEqual(createCommentResponse.data.content, testComment.content, 'Comment content should match');
    assert.ok(createCommentResponse.data.user_id, 'User ID should be present');
    assert.ok(createCommentResponse.data.user_id.length > 0, 'User ID should not be empty');
    
    // Step 3: Create a second comment
    console.log('\n===== Creating second comment =====');
    const createSecondCommentResponse = await axios.post(
      `${BASE_URL}/recipes/${recipeId}/comments`,
      secondComment,
      { headers: await getAuthHeaders() }
    );
    console.log('Second comment created:');
    console.log(JSON.stringify(createSecondCommentResponse.data, null, 2));
    
    // Store the second comment ID
    secondCommentId = createSecondCommentResponse.data._id;
    assert.strictEqual(createSecondCommentResponse.status, 201, 'Expected 201 status code for second comment creation');
    
    // Step 4: Get the recipe with comments
    console.log('\n===== Fetching recipe with comments =====');
    const getRecipeResponse = await axios.get(`${BASE_URL}/recipes/${recipeId}`, { headers: await getAuthHeaders() });
    console.log('Recipe with comments:');
    console.log(JSON.stringify(getRecipeResponse.data, null, 2));
    
    // Check if comments are included or referenced in the recipe
    assert.strictEqual(getRecipeResponse.status, 200, 'Expected 200 status code for get recipe');
    
    // Step 5: Get specific comment
    console.log('\n===== Fetching specific comment =====');
    const getCommentResponse = await axios.get(`${BASE_URL}/comments/${firstCommentId}`, { headers: await getAuthHeaders() });
    console.log('Comment retrieved:');
    console.log(JSON.stringify(getCommentResponse.data, null, 2));
    
    assert.strictEqual(getCommentResponse.status, 200, 'Expected 200 status code for get comment');
    assert.strictEqual(getCommentResponse.data._id, firstCommentId, 'Comment ID should match');
    assert.strictEqual(getCommentResponse.data.content, testComment.content, 'Comment content should match');
    
    // Step 6: Update comment
    console.log('\n===== Updating comment =====');
    const updateCommentResponse = await axios.put(
      `${BASE_URL}/comments/${firstCommentId}`,
      updatedComment,
      { headers: await getAuthHeaders() }
    );
    console.log('Comment updated:');
    console.log(JSON.stringify(updateCommentResponse.data, null, 2));
    
    assert.strictEqual(updateCommentResponse.status, 200, 'Expected 200 status code for update comment');
    assert.strictEqual(updateCommentResponse.data.content, updatedComment.content, 'Updated content should match');
    
    // Step 7: Verify the comment update
    console.log('\n===== Verifying comment update =====');
    const verifyUpdateResponse = await axios.get(`${BASE_URL}/comments/${firstCommentId}`, { headers: await getAuthHeaders() });
    console.log('Updated comment verified:');
    console.log(JSON.stringify(verifyUpdateResponse.data, null, 2));
    
    assert.strictEqual(verifyUpdateResponse.data.content, updatedComment.content, 'Comment content should be updated');
    
    // Step 8: Delete the first comment
    console.log('\n===== Deleting first comment =====');
    const deleteCommentResponse = await axios.delete(`${BASE_URL}/comments/${firstCommentId}`, { headers: await getAuthHeaders() });
    console.log('Comment deleted:');
    console.log(JSON.stringify(deleteCommentResponse.data, null, 2));
    
    assert.strictEqual(deleteCommentResponse.status, 200, 'Expected 200 status code for delete comment');
    assert.ok(deleteCommentResponse.data.message.includes('deleted'), 'Response should confirm deletion');
    
    // Step 9: Verify comment deletion
    console.log('\n===== Verifying comment deletion =====');
    try {
      await axios.get(`${BASE_URL}/comments/${firstCommentId}`, { headers: await getAuthHeaders() });
      assert.fail('Expected comment to be deleted');
    } catch (error) {
      assert.strictEqual(error.response.status, 404, 'Expected 404 status code for deleted comment');
      console.log('Comment deletion verified: Comment not found as expected');
    }
    
    // Step 10: Delete the second comment
    console.log('\n===== Deleting second comment =====');
    const deleteSecondCommentResponse = await axios.delete(`${BASE_URL}/comments/${secondCommentId}`, { headers: await getAuthHeaders() });
    console.log('Second comment deleted:');
    console.log(JSON.stringify(deleteSecondCommentResponse.data, null, 2));
    
    // Step 11: Clean up - Delete the test recipe
    console.log('\n===== Cleaning up - Deleting test recipe =====');
    const deleteRecipeResponse = await axios.delete(`${BASE_URL}/recipes/${recipeId}`, { headers: await getAuthHeaders() });
    console.log('Test recipe deleted:');
    console.log(JSON.stringify(deleteRecipeResponse.data, null, 2));
    
    console.log('\n✅ All comment tests completed successfully!');
  } catch (error) {
    console.error('❌ Comment test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Error stack:', error.stack);
    
    // Cleanup in case of error - try to delete created resources
    console.log('\nAttempting cleanup after error...');
    try {
      const cleanupBaseUrl = await getBaseUrlDynamic(); // Get fresh URL for cleanup
      if (firstCommentId) {
        await axios.delete(`${cleanupBaseUrl}/comments/${firstCommentId}`, { headers: await getAuthHeaders() }).catch(() => {});
      }
      if (secondCommentId) {
        await axios.delete(`${cleanupBaseUrl}/comments/${secondCommentId}`, { headers: await getAuthHeaders() }).catch(() => {});
      }
      if (recipeId) {
        await axios.delete(`${cleanupBaseUrl}/recipes/${recipeId}`, { headers: await getAuthHeaders() }).catch(() => {});
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError.message);
    }
    
    process.exit(1);
  }
}

// Run the tests
runTests();
