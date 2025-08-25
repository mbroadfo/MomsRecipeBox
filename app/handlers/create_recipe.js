// File: handlers/create_recipe.js
import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

export default async function createRecipe(db, body) {
  const recipe = {
    title: body.title,
    subtitle: body.subtitle || '',
    description: body.description || '',
    author: body.author || '',
    source: body.source || '',
    owner_id: body.owner_id,
    visibility: body.visibility || 'private',
    tags: body.tags || [],
    yield: body.yield || '',
    time: body.time || {},
    sections: body.sections || [],
    ingredients: body.ingredients || [],
    steps: body.steps || [],
    instructions: body.instructions || [],
    notes: body.notes || '',
    created_at: new Date(),
    updated_at: new Date(),
    comments: [],
    likes_count: 0 // denormalized count field (updated by like handler)
  };

  const result = await db.collection('recipes').insertOne(recipe);

  return {
    statusCode: 201,
    body: JSON.stringify({ _id: result.insertedId, ...recipe })
  };
}
