
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
    const db = await getDb();
    const recipe = await db.collection('recipes').findOne({ _id: new ObjectId(recipeId) });
    if (!recipe) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Recipe not found' }) };
    }
    return { statusCode: 200, body: JSON.stringify(recipe) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
