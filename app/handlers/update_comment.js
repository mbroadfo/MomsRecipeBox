/**
 * Update a comment in the comments collection
 * 
 * PUT /comments/:comment_id
 * 
 * @module handlers/update_comment
 */
import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';
import { validateComment } from '../models/comment_schema.js';

const handler = async (event) => {
  try {
    // Extract comment ID from path parameters
    const { comment_id } = event.pathParameters;
    if (!comment_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Comment ID is required' })
      };
    }

    // Parse request body
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    
    // Validate content
    if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Valid content is required' })
      };
    }

    const db = await getDb();
    
    // Get the existing comment first
    const existingComment = await db.collection('comments').findOne({ 
      _id: new ObjectId(comment_id) 
    });
    
    if (!existingComment) {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ error: 'Comment not found' }) 
      };
    }
    
    // Update only allowed fields
    const updatedComment = {
      ...existingComment,
      content: body.content,
      updated_at: new Date()
    };
    
    // Validate updated comment
    const validationResult = validateComment(updatedComment);
    if (!validationResult.valid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid comment data', 
          details: validationResult.errors 
        })
      };
    }

    // Update comment in the comments collection
    const result = await db.collection('comments').updateOne(
      { _id: new ObjectId(comment_id) },
      { $set: { 
          content: body.content, 
          updated_at: new Date() 
        }
      }
    );

    if (result.matchedCount === 0) {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ error: 'Comment not found' }) 
      };
    }

    // Return the updated comment
    const comment = await db.collection('comments').findOne({ 
      _id: new ObjectId(comment_id) 
    });

    return { 
      statusCode: 200, 
      body: JSON.stringify({
        ...comment,
        _id: comment._id.toString(),
        recipeId: comment.recipeId.toString()
      })
    };
  } catch (err) {
    console.error('Error updating comment:', err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err.message }) 
    };
  }
};

export default handler;
