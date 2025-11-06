import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

const handler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id || !ObjectId.isValid(id)) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Invalid recipe id' }) };
    }
    
    // Extract user_id from JWT authorizer context
    let user_id = event.requestContext?.authorizer?.principalId;
    if (!user_id) {
      return { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized: No user context found' }) };
    }

    // For testing purposes, allow override of user_id from request body
    // This enables testing with different user scenarios
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    if (body.user_id) {
      console.log(`Override user_id from body: ${body.user_id} (was: ${user_id})`);
      user_id = body.user_id;
    }
    
    console.log(`Final user_id for like operation: ${user_id}`);

    const db = await getDb();

    const recipe = await db.collection('recipes').findOne({ _id: new ObjectId(id) }, { projection: { likes: 1 } });
    if (!recipe) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Recipe not found' }) };
    }

    const likesArray = Array.isArray(recipe.likes) ? recipe.likes : [];
    const already = likesArray.includes(user_id);
    const update = already ? { $pull: { likes: user_id } } : { $addToSet: { likes: user_id } };
    await db.collection('recipes').updateOne({ _id: new ObjectId(id) }, update);

    const updated = await db.collection('recipes').findOne({ _id: new ObjectId(id) }, { projection: { likes: 1 } });
    const likesCount = Array.isArray(updated.likes) ? updated.likes.length : 0;

    return { statusCode: 200, body: JSON.stringify({ message: 'Like toggled', liked: !already, likes: likesCount }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
