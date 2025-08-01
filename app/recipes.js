// app/recipes.js
import { connectToDB } from './app.js';

export async function addRecipe(recipe) {
  const db = await connectToDB();
  const result = await db.collection('recipes').insertOne(recipe);
  return result.insertedId;
}

export async function getAllRecipes() {
  const db = await connectToDB();
  return await db.collection('recipes').find().toArray();
}
