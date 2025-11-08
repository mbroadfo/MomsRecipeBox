import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('get_comment');

/**
 * Handler for GET /comments/:id endpoint
 * Retrieves a single comment by its ID
 */
const handler = async (event) => {
  try {
    logger.info('GET comment handler called', { 
      path: event.path,
      method: event.httpMethod,
      pathParameters: event.pathParameters
    });
    
    // Extract comment_id from path parameters (set as 'id' in lambda.js)
    const comment_id = event.pathParameters?.id;
    logger.info('Looking for comment', { commentId: comment_id });
    
    if (!comment_id || !ObjectId.isValid(comment_id)) {
      logger.warn('Invalid comment ID format', { commentId: comment_id });
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
      logger.warn('Comment not found', { commentId: comment_id });
      return { 
        statusCode: 404, 
        body: JSON.stringify({ message: 'Comment not found' }) 
      };
    }

    // Return the comment
    logger.info('Comment retrieved successfully', { commentId: comment_id });
    return { 
      statusCode: 200, 
      body: JSON.stringify(comment) 
    };
  } catch (err) {
    logger.error('Error in get_comment handler', { error: err.message, stack: err.stack });
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err.message }) 
    };
  }
};

export default handler;
