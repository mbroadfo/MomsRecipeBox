// app/recipes.js
const { connectToDB } = require('./app');

async function addRecipe(recipe) {
  const db = await connectToDB();
  const result = await db.collection('recipes').insertOne(recipe);
  return result.insertedId;
}

async function getAllRecipes() {
  const db = await connectToDB();
  return await db.collection('recipes').find().toArray();
}

module.exports = { addRecipe, getAllRecipes };
