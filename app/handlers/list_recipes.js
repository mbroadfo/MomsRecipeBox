import { getDb } from '../app.js';

const handler = async (event) => {
  try {
    const db = await getDb();

    const { owner_id, visibility, tags, limit = 20, offset = 0 } = event.queryStringParameters || {};
    const query = {};

    if (owner_id) query.owner_id = owner_id;
    if (visibility) query.visibility = visibility;
    if (tags) query.tags = { $in: tags.split(',') };

    const recipes = await db.collection('recipes')
      .find(query)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray();

    return { statusCode: 200, body: JSON.stringify(recipes) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export default handler;
