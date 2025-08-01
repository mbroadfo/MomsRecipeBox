
import { ObjectId } from 'mongodb';
import { getDb } from '../mongoClient.js';

const handler = async (event) => {
  try {
    const recipeId = event.pathParameters.id;
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
