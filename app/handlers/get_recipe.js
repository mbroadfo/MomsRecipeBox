import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

const handler = async (event) => {
  try {
    let recipeId = null;
    if (event.pathParameters && event.pathParameters.id) {
      recipeId = event.pathParameters.id;
    } else if (event.queryStringParameters && event.queryStringParameters.id) {
      recipeId = event.queryStringParameters.id;
    }
    if (!recipeId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing recipe id' }) };
    }

    if (!ObjectId.isValid(recipeId)) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Invalid recipe id' }) };
    }

    const db = await getDb();
    const recipe = await db.collection('recipes').findOne({ _id: new ObjectId(recipeId) });
    if (!recipe) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Recipe not found' }) };
    }

    const favoritesColl = db.collection('favorites');
    if (typeof recipe.likes_count !== 'number') {
      recipe.likes_count = await favoritesColl.countDocuments({ recipeId: recipe._id });
      await db.collection('recipes').updateOne({ _id: recipe._id }, { $set: { likes_count: recipe.likes_count } });
    }

    // Extract user_id from JWT authorizer context for favorites check
    const userId = event.requestContext?.authorizer?.principalId;
    if (userId) {
      const fav = await favoritesColl.findOne({ recipeId: recipe._id, userId });
      recipe.liked = !!fav;
    } else {
      recipe.liked = false;
    }

    // Use existing embedded comments if they exist, otherwise initialize empty array
    if (!recipe.comments) {
      recipe.comments = [];
    }
    
    // Make a copy of embedded comments before we potentially override them
    const embeddedComments = [...recipe.comments];

    // Try to fetch comments from the comments collection
    try {
      // Get comments from the comments collection without checking if it exists first
      // This is safer as it will just return an empty array if collection doesn't exist
      const comments = await db.collection('comments')
        .find({ recipeId: new ObjectId(recipeId) })
        .sort({ created_at: -1 }) // Sort by newest first
        .toArray()
        .catch(err => {
          console.log('Comments collection may not exist yet:', err.message);
          return []; // Return empty array if collection doesn't exist
        });
      
      // If we got comments from the collection, use those instead
      if (comments && comments.length > 0) {
        recipe.comments = comments.map(comment => ({
          ...comment,
          _id: comment._id.toString(),
          recipeId: comment.recipeId.toString()
        }));
      } else {
        // If no comments in collection but we have embedded comments, keep using those
        recipe.comments = embeddedComments;
      }
    } catch (error) {
      console.error('Error retrieving comments:', error);
      // Revert to embedded comments if there was an error
      recipe.comments = embeddedComments;
    }

    return { statusCode: 200, body: JSON.stringify(recipe) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
