// Simple MongoDB connection test with debug
import { MongoClient } from 'mongodb';
import util from 'util';

// Set up detailed object logging
const inspect = (obj) => util.inspect(obj, { colors: true, depth: null });

// Direct connection string that we know works from previous test
const uri = 'mongodb://admin:supersecret@localhost:27017/moms_recipe_box_dev?authSource=admin';
console.log(`Connection URI: ${uri}`);

const client = new MongoClient(uri, {
  connectTimeoutMS: 5000,
  serverSelectionTimeoutMS: 5000,
});

async function testConnection() {
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully!');
    
    // Get database information
    const db = client.db('moms_recipe_box_dev');
    const adminDb = client.db('admin');
    
    // Check server info
    const serverInfo = await adminDb.command({ serverStatus: 1 });
    console.log('MongoDB Server Info:', {
      version: serverInfo.version,
      uptime: serverInfo.uptime,
      connections: serverInfo.connections?.current
    });
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Count recipes
    const recipes = db.collection('recipes');
    const recipeCount = await recipes.countDocuments();
    console.log(`Recipe count: ${recipeCount}`);
    
    // Test query - get one recipe
    if (recipeCount > 0) {
      const sample = await recipes.findOne();
      console.log('Sample recipe fields:', Object.keys(sample));
    }
    
  } catch (err) {
    console.error('Error connecting to MongoDB:');
    console.error(err);
  } finally {
    console.log('Closing connection...');
    await client.close();
    console.log('Connection closed');
  }
}

testConnection();