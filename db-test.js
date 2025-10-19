// db-test.js - Profile-aware MongoDB connection test script
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load both .env and current-profile.env (profile overrides .env)
dotenv.config();
dotenv.config({ path: 'config/current-profile.env', override: true });

async function testDatabase() {
  // Use the same environment variables as the application
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  const mode = process.env.MONGODB_MODE || 'local';
  
  console.log(`🔍 Testing MongoDB Connection (${mode.toUpperCase()} mode)`);
  
  if (!uri) {
    console.error('❌ MONGODB_URI environment variable not set');
    process.exit(1);
  }
  
  if (!dbName) {
    console.error('❌ MONGODB_DB_NAME environment variable not set');
    process.exit(1);
  }
  
  console.log(`Database: ${dbName}`);
  console.log(`Mode: ${mode}`);
  
  // Show first part of URI for debugging (mask password but show structure)
  if (mode === 'atlas') {
    const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
    console.log(`URI Structure: ${maskedUri}`);
    
    // Also check if MONGODB_ATLAS_URI is set
    console.log(`MONGODB_ATLAS_URI available: ${!!process.env.MONGODB_ATLAS_URI}`);
  }
  
  const client = new MongoClient(uri, { 
    serverSelectionTimeoutMS: 10000 
  });
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
    const db = client.db(dbName);
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