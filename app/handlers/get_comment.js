import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

/**
 * Handler for GET /comments/:id endpoint
 * Retrieves a single comment by its ID
 */
const handler = async (event) => {
  try {
    console.log('GET comment handler called with event:', JSON.stringify(event, null, 2));
    
    // Extract comment_id from path parameters (set as 'id' in lambda.js)
    const comment_id = event.pathParameters?.id;
    console.log(`Looking for comment with ID: ${comment_id}`);
    
    if (!comment_id || !ObjectId.isValid(comment_id)) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ message: 'Invalid comment ID format' }) 
      };
    }

    const db = await getDb();
    
    // Find the comment in the comments collection
    const comment = await db.collection('comments').findOne({
      _id: new ObjectId(comment_id)
    });

    if (!comment) {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ message: 'Comment not found' }) 
      };
    }

    // Return the comment
    return { 
      statusCode: 200, 
      body: JSON.stringify(comment) 
    };
  } catch (err) {
    console.error('Error in get_comment handler:', err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err.message }) 
    };
  }
};

export default handler;
