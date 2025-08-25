import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
 * Test the PUT /comments/{id} endpoint for updating a comment
 */
async function testUpdateComment() {
  console.log('===== Testing PUT /comments/{id} Endpoint =====');
  
  let client;
  let recipeId;
  let commentId;
  
  try {
    // Step 1: Create a test recipe and comment directly in MongoDB
    console.log('\nStep 1: Creating test data in MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGODB_DB_NAME);
    
    // Create a test recipe
    const recipe = {
      title: 'Update Comment Test Recipe',
      description: 'Recipe for testing PUT comments endpoint',
      owner_id: 'test-user',
      visibility: 'private',
      tags: [],
      ingredients: [],
      sections: [],
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const recipeResult = await db.collection('recipes').insertOne(recipe);
    recipeId = recipeResult.insertedId;
    console.log(`Test recipe created with ID: ${recipeId}`);
    
    // Create test comment
    const comment = {
      recipeId: recipeId,
      user_id: 'test-user',
      content: 'This is the original comment content',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const commentResult = await db.collection('comments').insertOne(comment);
    commentId = commentResult.insertedId;
    console.log(`Test comment created with ID: ${commentId}`);
    
    // Step 2: Test the PUT /comments/{id} endpoint
    console.log('\nStep 2: Testing PUT /comments/{id} endpoint...');
    const updatedContent = {
      content: 'This is the updated comment content'
    };
    
    const response = await fetch(`${BASE}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedContent)
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:');
      console.log(JSON.stringify(data, null, 2));
      
      // Verify data
      if (data._id === commentId.toString() && 
          data.content === updatedContent.content) {
        console.log('✅ Comment was updated successfully in the comments collection');
        
        // Step 3: Verify the comment was updated in the database
        console.log('\nStep 3: Verifying comment was updated in the database...');
        const updatedComment = await db.collection('comments').findOne({ _id: commentId });
        
        if (updatedComment && updatedComment.content === updatedContent.content) {
          console.log('✅ Comment was successfully updated in the database');
        } else {
          console.log('❌ Comment was not updated in the database');
        }
      } else {
        console.log('❌ Comment data does not match what was submitted');
      }
    } else {
      console.log('❌ Failed to update comment');
      const error = await response.text();
      console.log(`Error: ${error}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Step 4: Clean up
    console.log('\nStep 4: Cleaning up test data...');
    if (client) {
      const db = client.db(MONGODB_DB_NAME);
      
      if (commentId) {
        await db.collection('comments').deleteOne({ _id: commentId });
        console.log(`Deleted comment ${commentId}`);
      }
      
      if (recipeId) {
        await db.collection('recipes').deleteOne({ _id: recipeId });
        console.log(`Deleted recipe ${recipeId}`);
      }
      
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
  
  console.log('\nTest complete');
}

// Run the test
testUpdateComment().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
