/**
 * Comprehensive Comments Test Suite
 * 
 * This script tests all CRUD operations for the standalone comments collection:
 * - Creating comments in the comments collection
 * - Reading comments from the comments collection
 * - Getting a recipe with its comments
 * - Updating comments
 * - Deleting comments
 */

import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import assert from 'assert';

// Configure __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
config({ path: join(__dirname, '.env') });

const BASE = process.env.APP_BASE_URL || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

console.log('Using MongoDB URI:', MONGODB_URI);
console.log('Using Database:', MONGODB_DB_NAME);

/**
 * Main test function that runs all comment-related tests
 */
async function testComments() {
  console.log('===== COMMENTS COLLECTION INTEGRATION TEST =====');
  
  let client;
  let recipeId;
  let commentId;
  
  try {
    // Connect to MongoDB
    console.log('\n📋 Step 1: Setting up test data...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('  ✅ Connected to MongoDB');
    
    const db = client.db(MONGODB_DB_NAME);
    
    // Create a test recipe
    const recipe = {
      title: 'Comments Test Recipe',
      description: 'Recipe for testing comments functionality',
      owner_id: 'test-user',
      visibility: 'private',
      tags: ['test'],
      ingredients: ['test ingredient'],
      sections: [{ name: 'Test Section', steps: ['Test step'] }],
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const recipeResult = await db.collection('recipes').insertOne(recipe);
    recipeId = recipeResult.insertedId;
    console.log(`  ✅ Test recipe created with ID: ${recipeId}`);
    
    // TEST 1: Create a comment
    console.log('\n📝 TEST 1: Creating a new comment via API...');
    const commentData = {
      user_id: 'test-user',
      content: 'This is a test comment posted via the API'
    };
    
    let response = await fetch(`${BASE}/recipes/${recipeId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commentData)
    });
    
    console.log(`  Response status: ${response.status}`);
    assert.equal(response.status, 201, 'Expected 201 Created status code');
    
    const commentResult = await response.json();
    console.log('  Comment created:', commentResult);
    commentId = commentResult._id;
    
    // Verify comment was stored in the database
    const commentFromDb = await db.collection('comments').findOne({ _id: new ObjectId(commentId) });
    assert.ok(commentFromDb, 'Comment should exist in the database');
    assert.equal(commentFromDb.content, commentData.content, 'Comment content should match');
    console.log('  ✅ Comment successfully created and stored in comments collection');
    
    // TEST 2: Get comment by ID
    console.log('\n📖 TEST 2: Getting comment by ID...');
    response = await fetch(`${BASE}/comments/${commentId}`);
    
    console.log(`  Response status: ${response.status}`);
    assert.equal(response.status, 200, 'Expected 200 OK status code');
    
    const fetchedComment = await response.json();
    console.log('  Fetched comment:', fetchedComment);
    assert.equal(fetchedComment._id, commentId, 'Comment ID should match');
    assert.equal(fetchedComment.content, commentData.content, 'Comment content should match');
    console.log('  ✅ Successfully retrieved comment by ID');
    
    // TEST 3: Get recipe with comments
    console.log('\n📋 TEST 3: Getting recipe with its comments...');
    response = await fetch(`${BASE}/recipes/${recipeId}`);
    
    console.log(`  Response status: ${response.status}`);
    assert.equal(response.status, 200, 'Expected 200 OK status code');
    
    const fetchedRecipe = await response.json();
    console.log(`  Recipe retrieved with ${fetchedRecipe.comments?.length || 0} comments`);
    assert.ok(Array.isArray(fetchedRecipe.comments), 'Recipe should have comments array');
    
    // Check if our comment is in the comments array
    const foundComment = fetchedRecipe.comments.find(c => c._id === commentId);
    assert.ok(foundComment, 'The created comment should be included in the recipe');
    assert.equal(foundComment.content, commentData.content, 'Comment content should match');
    console.log('  ✅ Successfully retrieved recipe with its comments');
    
    // TEST 4: Update comment
    console.log('\n✏️ TEST 4: Updating a comment...');
    const updatedContent = 'This comment has been updated';
    response = await fetch(`${BASE}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: updatedContent
      })
    });
    
    console.log(`  Response status: ${response.status}`);
    assert.equal(response.status, 200, 'Expected 200 OK status code');
    
    const updatedComment = await response.json();
    console.log('  Updated comment:', updatedComment);
    assert.equal(updatedComment.content, updatedContent, 'Comment content should be updated');
    
    // Verify the comment was updated in the database
    const updatedCommentFromDb = await db.collection('comments').findOne({ _id: new ObjectId(commentId) });
    assert.equal(updatedCommentFromDb.content, updatedContent, 'Comment content should be updated in the database');
    console.log('  ✅ Comment successfully updated');
    
    // TEST 5: Delete comment
    console.log('\n🗑️ TEST 5: Deleting a comment...');
    response = await fetch(`${BASE}/comments/${commentId}`, {
      method: 'DELETE'
    });
    
    console.log(`  Response status: ${response.status}`);
    assert.equal(response.status, 200, 'Expected 200 OK status code');
    
    // Verify the comment was deleted from the database
    const deletedComment = await db.collection('comments').findOne({ _id: new ObjectId(commentId) });
    assert.strictEqual(deletedComment, null, 'Comment should be removed from the database');
    console.log('  ✅ Comment successfully deleted');
    
    console.log('\n🏁 All tests passed successfully!');
  } catch (err) {
    console.error('\n❌ Error in tests:', err);
    process.exit(1);
  } finally {
    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    if (client) {
      const db = client.db(MONGODB_DB_NAME);
      
      // Delete the test recipe
      if (recipeId) {
        await db.collection('recipes').deleteOne({ _id: recipeId });
        console.log(`  Deleted test recipe ${recipeId}`);
      }
      
      // Make sure any comments are deleted
      if (recipeId) {
        const result = await db.collection('comments').deleteMany({ recipeId: recipeId });
        if (result.deletedCount > 0) {
          console.log(`  Deleted ${result.deletedCount} comments for recipe ${recipeId}`);
        }
      }
      
      await client.close();
      console.log('  MongoDB connection closed');
    }
  }
}

// Run all tests
testComments().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
