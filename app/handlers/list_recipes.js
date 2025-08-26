import { getDb } from '../app.js';
import { ObjectId } from 'mongodb';

const handler = async (event) => {
  try {
    const db = await getDb();

    const { owner_id, visibility, tags, limit = 20, offset = 0, user_id } = event.queryStringParameters || {};
    const query = {};

    if (owner_id) query.owner_id = owner_id;
    if (visibility) query.visibility = visibility;
    if (tags) query.tags = { $in: tags.split(',') };
    
    // Handle visibility - show public recipes, private recipes owned by the current user,
    // and recipes with undefined visibility (backward compatibility)
    if (!query.visibility) {
      query.$or = [
        { visibility: 'public' },
        { visibility: 'private', owner_id: user_id },
        { visibility: { $exists: false } },
        { visibility: null }
      ];
    }

    const recipes = await db.collection('recipes')
      .find(query, { projection: { title: 1, image_url: 1, likes_count: 1, created_at: 1, updated_at: 1 } })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray();

    if (user_id && recipes.length) {
      const ids = recipes.map(r => r._id);
      const favs = await db.collection('favorites').find({ recipeId: { $in: ids }, userId: user_id }).project({ recipeId: 1 }).toArray();
      const favSet = new Set(favs.map(f => f.recipeId.toString()));
      for (const r of recipes) {
        r.liked = favSet.has(r._id.toString());
      }
    }

    return { statusCode: 200, body: JSON.stringify({ recipes }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
