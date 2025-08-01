
import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

const handler = async (event) => {
  try {
    const recipeId = event.pathParameters.id;
    const db = await getDb();

    const result = await db.collection('recipes').deleteOne({ _id: new ObjectId(recipeId) });
    if (result.deletedCount === 0) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Recipe not found' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Recipe deleted' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
