// Simple script to get recipe IDs via MongoDB connection
// This can be executed in the container

const { MongoClient } = require('mongodb');

async function getRecipeIds() {
  const mongoUri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'moms_recipe_box';
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('recipes');
    
    // Get all recipe IDs
    const recipes = await collection.find({}, { projection: { _id: 1 } }).toArray();
    const recipeIds = recipes.map(recipe => recipe._id.toString()).sort();
    
    console.log('Recipe IDs in database:');
    console.log('='.repeat(50));
    recipeIds.forEach((id, index) => {
      console.log(`${(index + 1).toString().padStart(2)}: ${id}`);
    });
    
    console.log(`\nTotal recipes: ${recipeIds.length}`);
    
    return recipeIds;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  getRecipeIds().catch(console.error);
}

module.exports = { getRecipeIds };