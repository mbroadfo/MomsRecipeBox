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

    if (event.queryStringParameters && event.queryStringParameters.expand === 'true') {
      try {
        const comments = await db.collection('comments').find({ recipeId: recipe._id }).toArray();
        recipe.comments = comments || [];
      } catch {
        recipe.comments = [];
      }
    } else {
      recipe.comments = [];
    }

    return { statusCode: 200, body: JSON.stringify(recipe) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
