const { getMongoClient } = require('../db');
const { ObjectId } = require('mongodb');

exports.handler = async (event) => {
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB_NAME);
  const collection = db.collection('recipes');

  const recipeId = event.pathParameters?.id;
  if (!recipeId || !ObjectId.isValid(recipeId)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid or missing recipe ID' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid JSON format' }),
    };
  }

  const {
    visibility,
    status,
    title,
    subtitle,
    description,
    image_url,
    tags = [],
    sections = [],
    ingredients = [],
  } = body;

  try {
    const updateResult = await collection.updateOne(
      { _id: new ObjectId(recipeId) },
      {
        $set: {
          visibility,
          status,
          title,
          subtitle,
          description,
          image_url,
          tags,
          sections,
          ingredients,
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Recipe not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Recipe updated', recipe_id: recipeId }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: err.message }),
    };
  } finally {
    await client.close();
  }
};
