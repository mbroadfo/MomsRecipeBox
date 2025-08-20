/**
 * Delete a comment from the comments collection
 * 
 * DELETE /comments/:comment_id
 * 
 * @module handlers/delete_comment
 */
import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

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
    
    const db = await getDb();
    
    // Get the comment first to ensure it exists and to return info
    const comment = await db.collection('comments').findOne({ 
      _id: new ObjectId(comment_id) 
    });
    
    if (!comment) {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ error: 'Comment not found' }) 
      };
    }

    // Delete the comment from the comments collection
    const result = await db.collection('comments').deleteOne({
      _id: new ObjectId(comment_id)
    });

    if (result.deletedCount === 0) {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ error: 'Comment not found or could not be deleted' }) 
      };
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        message: 'Comment deleted successfully',
        comment_id: comment_id,
        recipe_id: comment.recipeId.toString()
      }) 
    };
  } catch (err) {
    console.error('Error deleting comment:', err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err.message }) 
    };
  }
};

export default handler;
