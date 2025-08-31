// File: handlers/create_recipe.js
import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';

export default async function createRecipe(db, body) {
  // Generate a new ObjectId here to ensure we can work with it consistently
  const recipeId = new ObjectId();
  
  console.log(`Creating new recipe with generated _id: ${recipeId}`);
  
  const recipe = {
    _id: recipeId, // Explicitly set the ID
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
    likes_count: 0, // denormalized count field (updated by like handler)
    image_url: body.image_url || null // Include image URL if provided
  };

  // Log the image URL if provided
  if (body.image_url) {
    console.log(`Recipe created with image_url: ${body.image_url}`);
  } else {
    console.log(`Recipe created without image_url`);
  }

  const result = await db.collection('recipes').insertOne(recipe);
  console.log(`Recipe inserted with _id: ${result.insertedId}`);

  // Return the ObjectId as a string for consistency
  return {
    statusCode: 201,
    body: JSON.stringify({ 
      _id: result.insertedId.toString(), 
      ...recipe,
      _id: result.insertedId.toString() // Override the _id to ensure it's a string
    })
  };
}
