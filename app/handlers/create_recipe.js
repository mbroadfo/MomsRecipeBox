// File: handlers/create_recipe.js
import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('create_recipe');

export default async function createRecipe(db, body, event) {
  // Generate a new ObjectId here to ensure we can work with it consistently
  const recipeId = new ObjectId();
  
  logger.info('Creating new recipe', { recipeId: recipeId.toString(), title: body.title }, event);
  
  const recipe = {
    _id: recipeId, // Explicitly set the ID
    title: body.title,
    subtitle: body.subtitle || '',
    description: body.description || '',
    author: body.author || '',
    source: body.source || '',
    owner_id: body.owner_id,
    visibility: body.visibility || 'public',
    tags: body.tags || [],
    yield: body.yield || '',
    time: body.time || {},
    sections: body.sections || [],
    ingredients: body.ingredients || [],
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
    logger.info('Recipe created with image', { imageUrl: body.image_url }, event);
  } else {
    logger.debug('Recipe created without image', {}, event);
  }

  const result = await db.collection('recipes').insertOne(recipe);
  logger.info('Recipe successfully inserted', { insertedId: result.insertedId.toString() }, event);

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
