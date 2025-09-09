import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

const handler = async (event) => {
  const db = await getDb();
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

  // Create an update object that only includes fields that are present in the request body
  const updateFields = {};
  
  // Only add fields to updateFields if they exist in the request body
  if ('visibility' in body) updateFields.visibility = body.visibility;
  if ('title' in body) updateFields.title = body.title;
  if ('subtitle' in body) updateFields.subtitle = body.subtitle;
  if ('description' in body) updateFields.description = body.description;
  if ('image_url' in body) updateFields.image_url = body.image_url;
  if ('tags' in body) updateFields.tags = body.tags;
  if ('sections' in body) updateFields.sections = body.sections;
  if ('ingredients' in body) updateFields.ingredients = body.ingredients;
  if ('author' in body) updateFields.author = body.author;
  if ('source' in body) updateFields.source = body.source;
  if ('yield' in body) updateFields.yield = body.yield;
  if ('time' in body) updateFields.time = body.time; // expect object { total?, prep?, cook? }
  if ('instructions' in body) updateFields.instructions = body.instructions; // array of steps
  if ('notes' in body) updateFields.notes = body.notes;

  // Add updated_at timestamp
  updateFields.updated_at = new Date();

  try {
    const updateResult = await collection.updateOne(
      { _id: new ObjectId(recipeId) },
      { $set: updateFields }
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
  }
};

export default handler;
