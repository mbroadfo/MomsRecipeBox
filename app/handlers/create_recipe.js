// File: handlers/create_recipe.js
import { ObjectId } from 'mongodb';
import { getDb } from '../mongoClient.js';

export default async function createRecipe(db, body) {
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
}
