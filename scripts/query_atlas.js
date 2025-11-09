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
    // First get all recipes with image URLs
    const recipes = await db.collection('recipes').find({}, {
      projection: { _id: 1, title: 1, image_url: 1 }
    }).toArray();
    
    console.log('Atlas Database Image URL Analysis:');
    console.log('Total recipes found:', recipes.length);
    console.log('');
    
    // Check for galette specifically first
    const galette = recipes.find(r => r.title && r.title.toLowerCase().includes('galette'));
    if (galette) {
      console.log('🍅 GALETTE RECIPE FOUND:');
      console.log('  _id:', galette._id);
      console.log('  title:', galette.title);
      console.log('  image_url:', galette.image_url || 'NO IMAGE URL');
      console.log('');
    }
    
    // Show all recipes with their image URLs
    recipes.forEach((recipe, index) => {
      console.log(`Recipe ${index + 1}: "${recipe.title}"`);
      console.log('  _id:', recipe._id);
      console.log('  image_url:', recipe.image_url || 'NO IMAGE URL');
      console.log('');
    });
    
    await client.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

queryAtlas();