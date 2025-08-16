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
      console.log('Missing recipeId');
      console.log('Event:', event);
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing recipe id' }) };
    }

    const db = await getDb();

    // Ensure recipeId is a valid ObjectId
    if (!ObjectId.isValid(recipeId)) {
      console.log('Invalid recipeId:', recipeId);
      console.log('Event:', event);
      return { statusCode: 400, body: JSON.stringify({ message: 'Invalid recipe id' }) };
    }

    const query = { _id: new ObjectId(recipeId) };
    console.log('Querying recipe with query:', query);

    const recipe = await db.collection('recipes').findOne(query); // Use findOne to ensure only one recipe is returned

    if (!recipe) {
      console.log('Recipe not found for query:', query);
      return { statusCode: 404, body: JSON.stringify({ message: 'Recipe not found' }) };
    }

    console.log('Recipe found:', recipeId);

    // Compute likes info
    const favoritesColl = db.collection('favorites');
    const likesCount = typeof recipe.likes_count === 'number'
      ? recipe.likes_count
      : await favoritesColl.countDocuments({ recipeId: recipe._id });
    // TODO: extract userId from auth; fallback to body param not available here
    const userId = undefined;
    const liked = false; // cannot know without user context
    recipe.likes_count = likesCount;
    recipe.liked = liked;

    // Handle expand parameter if needed
    if (event.queryStringParameters && event.queryStringParameters.expand === 'true') {
      try {
        const comments = await db.collection('comments').find({ recipeId: recipe._id }).toArray();
        recipe.comments = comments || []; // Ensure comments is always an array
      } catch (err) {
        console.warn('Comments collection does not exist or cannot be queried:', err);
        recipe.comments = []; // Gracefully handle missing comments collection
      }
    } else {
      recipe.comments = []; // Default to an empty array if expand is not requested
    }

    return { statusCode: 200, body: JSON.stringify(recipe) };
  } catch (err) {
    console.error('Error occurred:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
