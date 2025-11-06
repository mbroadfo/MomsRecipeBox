import { MongoClient } from 'mongodb';
import { getSecret } from '../app/utils/secrets_manager.js';

async function queryAtlas() {
  try {
    // Get MongoDB connection string from AWS Secrets Manager
    const mongoUri = await getSecret('MONGODB_ATLAS_URI');
    
    if (!mongoUri) {
      console.error('❌ Failed to retrieve MongoDB Atlas URI from AWS Secrets Manager');
      return;
    }
    
    const client = new MongoClient(mongoUri);
    
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('moms_recipe_box_dev');
    const recipes = await db.collection('recipes').find({}, {
      projection: { _id: 1, title: 1, owner_id: 1, visibility: 1 }
    }).toArray();
    
    console.log('Direct Atlas Query Results:');
    console.log('Total recipes found:', recipes.length);
    console.log('');
    
    recipes.forEach((recipe, index) => {
      console.log(`Recipe ${index + 1}:`);
      console.log('  _id:', recipe._id);
      console.log('  title:', recipe.title);
      console.log('  owner_id:', recipe.owner_id);
      console.log('  visibility:', recipe.visibility);
      console.log('');
    });
    
    await client.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

queryAtlas();