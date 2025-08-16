import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

// New favorites-based like toggle handler
export const handler = async (event) => {
  try {
    const recipeId = event.pathParameters?.id;
    if (!recipeId || !ObjectId.isValid(recipeId)) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Invalid recipe id' }) };
    }
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON body' }) }; }
    const userId = body.user_id; // TODO: derive from auth token
    if (!userId) return { statusCode: 400, body: JSON.stringify({ message: 'Missing user_id' }) };

    const db = await getDb();
    const recipesColl = db.collection('recipes');
    const favoritesColl = db.collection('favorites');

    // Ensure indexes (idempotent) - runs fast after first time
    await favoritesColl.createIndex({ recipeId: 1, userId: 1 }, { unique: true });
    await favoritesColl.createIndex({ recipeId: 1 });
    await favoritesColl.createIndex({ userId: 1, createdAt: -1 });

    const _rid = new ObjectId(recipeId);
    const exists = await recipesColl.findOne({ _id: _rid }, { projection: { _id: 1 } });
    if (!exists) return { statusCode: 404, body: JSON.stringify({ message: 'Recipe not found' }) };

    const existing = await favoritesColl.findOne({ recipeId: _rid, userId });
    let liked;
    if (existing) {
      await favoritesColl.deleteOne({ _id: existing._id });
      await recipesColl.updateOne({ _id: _rid }, { $inc: { likes_count: -1 } });
      liked = false;
    } else {
      try {
        await favoritesColl.insertOne({ recipeId: _rid, userId, createdAt: new Date() });
        await recipesColl.updateOne({ _id: _rid }, { $inc: { likes_count: 1 } });
        liked = true;
      } catch (e) {
        if (e?.code === 11000) {
          // Duplicate insert race - treat as liked
          liked = true;
        } else throw e;
      }
    }

    // Retrieve current count from recipe document (fallback to aggregate if missing)
    let recipeDoc = await recipesColl.findOne({ _id: _rid }, { projection: { likes_count: 1 } });
    let likes = recipeDoc?.likes_count;
    if (typeof likes !== 'number') {
      likes = await favoritesColl.countDocuments({ recipeId: _rid });
      await recipesColl.updateOne({ _id: _rid }, { $set: { likes_count: likes } });
    }

    return { statusCode: 200, body: JSON.stringify({ liked, likes }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
