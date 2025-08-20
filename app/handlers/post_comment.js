/**
 * Create a comment and store it in the comments collection
 * 
 * POST /recipes/:id/comments
 * 
 * @module handlers/post_comment
 */
import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';
import { validateComment } from '../models/comment_schema.js';

/**
 * Create a comment for a recipe
 * 
 * @param {Object} event - API Gateway event object
 * @param {Object} context - Lambda context object
 * @returns {Object} HTTP response
 */
const handler = async (event) => {
  try {
    const recipeId = event.pathParameters?.id;
    if (!recipeId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Recipe ID is required' })
      };
    }

    // Parse and validate request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    
    // Create comment object
    const comment = {
      recipeId: new ObjectId(recipeId),
      user_id: body.user_id,
      content: body.content,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Validate the comment against our schema
    const validationResult = validateComment(comment);
    if (!validationResult.valid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid comment data',
          details: validationResult.errors 
        })
      };
    }

    const db = await getDb();
    
    // Check if recipe exists
    const recipe = await db.collection('recipes').findOne({ _id: new ObjectId(recipeId) });
    if (!recipe) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Recipe not found' })
      };
    }
    
    // Insert comment to comments collection
    const result = await db.collection('comments').insertOne(comment);
    
    // Return the created comment with ID
    return {
      statusCode: 201,
      body: JSON.stringify({
        _id: result.insertedId,
        ...comment,
        recipeId: comment.recipeId.toString() // Convert ObjectId to string for the response
      })
    };
  } catch (err) {
    console.error('Error creating comment:', err);
    return {
      statusCode: 500, 
      body: JSON.stringify({ error: err.message })
    };
  }
};

export default handler;
