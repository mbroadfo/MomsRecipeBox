/**
 * test_comments.js - Full lifecycle test for MomsRecipeBox comment API
 * Tests Create, Read, Update, and Delete operations for comments
 */

import axios from 'axios';
import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

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

// Comment test data
const testComment = {
  user_id: 'auth0|testuser',
  content: 'This is a test comment on the recipe'
};

// Updated comment data
const updatedComment = {
  content: 'This comment has been updated for testing'
};

// Second comment for testing multiple comments
const secondComment = {
  user_id: 'auth0|anotheruser',
  content: 'This is another test comment from a different user'
};

/**
 * Run all comment-related tests in sequence
 */
async function runTests() {
  console.log('Starting comment API tests...');
  let recipeId, firstCommentId, secondCommentId;
  
  try {
    // Step 1: Create a test recipe to attach comments to
    console.log('\n===== Creating test recipe for comments =====');
    const createRecipeResponse = await axios.post(`${BASE_URL}/recipes`, testRecipe);
    recipeId = createRecipeResponse.data._id;
    console.log(`Test recipe created with ID: ${recipeId}`);
    
    // Step 2: Post a comment on the recipe
    console.log('\n===== Creating first comment =====');
    const createCommentResponse = await axios.post(
      `${BASE_URL}/recipes/${recipeId}/comments`,
      testComment
    );
    console.log('Comment created:');
    console.log(JSON.stringify(createCommentResponse.data, null, 2));
    
    // Store the comment ID
    firstCommentId = createCommentResponse.data._id;
    assert.strictEqual(createCommentResponse.status, 201, 'Expected 201 status code for comment creation');
    assert.ok(firstCommentId, 'Comment should have an ID');
    assert.strictEqual(createCommentResponse.data.content, testComment.content, 'Comment content should match');
    assert.strictEqual(createCommentResponse.data.user_id, testComment.user_id, 'User ID should match');
    
    // Step 3: Create a second comment
    console.log('\n===== Creating second comment =====');
    const createSecondCommentResponse = await axios.post(
      `${BASE_URL}/recipes/${recipeId}/comments`,
      secondComment
    );
    console.log('Second comment created:');
    console.log(JSON.stringify(createSecondCommentResponse.data, null, 2));
    
    // Store the second comment ID
    secondCommentId = createSecondCommentResponse.data._id;
    assert.strictEqual(createSecondCommentResponse.status, 201, 'Expected 201 status code for second comment creation');
    
    // Step 4: Get the recipe with comments
    console.log('\n===== Fetching recipe with comments =====');
    const getRecipeResponse = await axios.get(`${BASE_URL}/recipes/${recipeId}`);
    console.log('Recipe with comments:');
    console.log(JSON.stringify(getRecipeResponse.data, null, 2));
    
    // Check if comments are included or referenced in the recipe
    assert.strictEqual(getRecipeResponse.status, 200, 'Expected 200 status code for get recipe');
    
    // Step 5: Get a specific comment
    console.log('\n===== Fetching specific comment =====');
    const getCommentResponse = await axios.get(`${BASE_URL}/comments/${firstCommentId}`);
    console.log('Comment retrieved:');
    console.log(JSON.stringify(getCommentResponse.data, null, 2));
    
    assert.strictEqual(getCommentResponse.status, 200, 'Expected 200 status code for get comment');
    assert.strictEqual(getCommentResponse.data._id, firstCommentId, 'Comment ID should match');
    assert.strictEqual(getCommentResponse.data.content, testComment.content, 'Comment content should match');
    
    // Step 6: Update the first comment
    console.log('\n===== Updating comment =====');
    const updateCommentResponse = await axios.put(
      `${BASE_URL}/comments/${firstCommentId}`,
      updatedComment
    );
    console.log('Comment updated:');
    console.log(JSON.stringify(updateCommentResponse.data, null, 2));
    
    assert.strictEqual(updateCommentResponse.status, 200, 'Expected 200 status code for update comment');
    assert.strictEqual(updateCommentResponse.data.content, updatedComment.content, 'Updated content should match');
    
    // Step 7: Verify the comment update
    console.log('\n===== Verifying comment update =====');
    const verifyUpdateResponse = await axios.get(`${BASE_URL}/comments/${firstCommentId}`);
    console.log('Updated comment verified:');
    console.log(JSON.stringify(verifyUpdateResponse.data, null, 2));
    
    assert.strictEqual(verifyUpdateResponse.data.content, updatedComment.content, 'Comment content should be updated');
    
    // Step 8: Delete the first comment
    console.log('\n===== Deleting first comment =====');
    const deleteCommentResponse = await axios.delete(`${BASE_URL}/comments/${firstCommentId}`);
    console.log('Comment deleted:');
    console.log(JSON.stringify(deleteCommentResponse.data, null, 2));
    
    assert.strictEqual(deleteCommentResponse.status, 200, 'Expected 200 status code for delete comment');
    assert.ok(deleteCommentResponse.data.message.includes('deleted'), 'Response should confirm deletion');
    
    // Step 9: Verify comment deletion
    console.log('\n===== Verifying comment deletion =====');
    try {
      await axios.get(`${BASE_URL}/comments/${firstCommentId}`);
      assert.fail('Expected comment to be deleted');
    } catch (error) {
      assert.strictEqual(error.response.status, 404, 'Expected 404 status code for deleted comment');
      console.log('Comment deletion verified: Comment not found as expected');
    }
    
    // Step 10: Delete the second comment
    console.log('\n===== Deleting second comment =====');
    const deleteSecondCommentResponse = await axios.delete(`${BASE_URL}/comments/${secondCommentId}`);
    console.log('Second comment deleted:');
    console.log(JSON.stringify(deleteSecondCommentResponse.data, null, 2));
    
    // Step 11: Clean up - Delete the test recipe
    console.log('\n===== Cleaning up - Deleting test recipe =====');
    const deleteRecipeResponse = await axios.delete(`${BASE_URL}/recipes/${recipeId}`);
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
      if (firstCommentId) {
        await axios.delete(`${BASE_URL}/comments/${firstCommentId}`).catch(() => {});
      }
      if (secondCommentId) {
        await axios.delete(`${BASE_URL}/comments/${secondCommentId}`).catch(() => {});
      }
      if (recipeId) {
        await axios.delete(`${BASE_URL}/recipes/${recipeId}`).catch(() => {});
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError.message);
    }
    
    process.exit(1);
  }
}

// Run the tests
runTests();
