const { ObjectId } = require('mongodb');
const { getDb } = require('./mongoClient');

module.exports.handler = async (event) => {
  try {
    const { id } = event.queryStringParameters;
    const body = JSON.parse(event.body);
    const db = await getDb();

    const recipe = await db.collection('recipes').findOne({ _id: new ObjectId(id) });
    if (!recipe) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Recipe not found' }) };
    }

    let update;
    if (recipe.likes.includes(body.user_id)) {
      update = { $pull: { likes: body.user_id } };
    } else {
      update = { $push: { likes: body.user_id } };
    }

    await db.collection('recipes').updateOne({ _id: new ObjectId(id) }, update);

    return { statusCode: 200, body: JSON.stringify({ message: 'Like toggled' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
