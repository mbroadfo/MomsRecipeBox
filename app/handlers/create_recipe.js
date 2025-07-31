const { ObjectId } = require('mongodb');
const { getDb } = require('./mongoClient');

module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const db = await getDb();

    const recipe = {
      title: body.title,
      description: body.description,
      owner_id: body.owner_id,
      visibility: body.visibility || 'private',
      tags: body.tags || [],
      sections: body.sections || [],
      ingredients: body.ingredients || [],
      created_at: new Date(),
      updated_at: new Date(),
      comments: [],
      likes: []
    };

    const result = await db.collection('recipes').insertOne(recipe);

    return {
      statusCode: 201,
      body: JSON.stringify({ _id: result.insertedId, ...recipe })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
