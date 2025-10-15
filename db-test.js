// db-test.js - Simple MongoDB connection and query test script
import { MongoClient } from 'mongodb';

// Direct connection string
const uri = 'mongodb://admin:supersecret@localhost:27017/moms_recipe_box_dev?authSource=admin';

async function testDatabase() {
  console.log('🔍 Testing MongoDB Connection');
  
  const client = new MongoClient(uri, { 
    serverSelectionTimeoutMS: 5000 
  });
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
    const db = client.db('moms_recipe_box_dev');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Check recipes
    const recipes = db.collection('recipes');
    const count = await recipes.countDocuments();
    console.log(`\nFound ${count} recipes`);
    
    // Get sample to display structure
    if (count > 0) {
      const sample = await recipes.findOne();
      console.log('\nSample recipe fields:');
      Object.keys(sample).forEach(key => {
        const value = sample[key];
        const type = Array.isArray(value) ? `Array(${value.length})` : 
                    (typeof value === 'object' && value !== null) ? 'Object' : typeof value;
        console.log(`  - ${key}: ${type}`);
      });
      
      // Show some recipe titles (up to 5)
      const titles = await recipes.find({}, {projection: {title: 1}}).limit(5).toArray();
      console.log('\nSample recipe titles:');
      titles.forEach((recipe, index) => {
        console.log(`  ${index + 1}. ${recipe.title}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

testDatabase();