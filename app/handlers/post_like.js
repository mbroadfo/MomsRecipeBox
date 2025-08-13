import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

const handler = async (event) => {
  try {
    const id = event.pathParameters?.id;
    if (!id || !ObjectId.isValid(id)) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Invalid recipe id' }) };
    }
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON body' }) }; }
    if (!body.user_id) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing user_id' }) };
    }

    const db = await getDb();

    const recipe = await db.collection('recipes').findOne({ _id: new ObjectId(id) }, { projection: { likes: 1 } });
    if (!recipe) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Recipe not found' }) };
    }

    const likesArray = Array.isArray(recipe.likes) ? recipe.likes : [];
    const already = likesArray.includes(body.user_id);
    const update = already ? { $pull: { likes: body.user_id } } : { $addToSet: { likes: body.user_id } };
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
