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

    const userId = event.queryStringParameters?.user_id;
    if (userId) {
      const fav = await favoritesColl.findOne({ recipeId: recipe._id, userId });
      recipe.liked = !!fav;
    } else {
      recipe.liked = false;
    }

    // Always fetch comments from the comments collection
    try {
      // Get comments from the comments collection
      const comments = await db.collection('comments')
        .find({ recipeId: new ObjectId(recipeId) })
        .sort({ created_at: -1 }) // Sort by newest first
        .toArray();
      
      // Convert ObjectId to string for JSON serialization
      recipe.comments = comments.map(comment => ({
        ...comment,
        _id: comment._id.toString(),
        recipeId: comment.recipeId.toString()
      }));
    } catch (error) {
      console.error('Error retrieving comments:', error);
      recipe.comments = [];
    }

    return { statusCode: 200, body: JSON.stringify(recipe) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
