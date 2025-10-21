// db-test.js - Profile-aware MongoDB connection test script
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Load both .env and current-profile.env (profile overrides .env)
dotenv.config();
dotenv.config({ path: 'config/current-profile.env', override: true });

// Function to retrieve secrets from AWS Secrets Manager
async function getSecretsFromAWS() {
  try {
    const secretName = process.env.AWS_SECRET_NAME || 'moms-recipe-secrets-dev';
    const region = process.env.AWS_REGION || 'us-west-2';
    
    console.log('🔐 Retrieving secrets from AWS Secrets Manager...');
    
    const command = `aws secretsmanager get-secret-value --secret-id "${secretName}" --region "${region}" --query SecretString --output text`;
    const secretJson = execSync(command, { encoding: 'utf-8' }).trim();
    
    const secrets = JSON.parse(secretJson);
    console.log('✅ Secrets retrieved successfully from AWS');
    
    return secrets;
  } catch (error) {
    console.error('❌ Failed to retrieve secrets from AWS:', error.message);
    throw error;
  }
}

async function testDatabase() {
  let uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  const mode = process.env.MONGODB_MODE || 'local';
  
  console.log(`🔍 Testing MongoDB Connection (${mode.toUpperCase()} mode)`);
  
  // If in atlas mode and URI contains placeholder, retrieve from AWS
  if (mode === 'atlas' && (!uri || uri.includes('${') || !uri.startsWith('mongodb'))) {
    try {
      const secrets = await getSecretsFromAWS();
      uri = secrets.MONGODB_ATLAS_URI;
    } catch (error) {
      console.error('❌ Could not retrieve MongoDB URI from AWS Secrets Manager');
      process.exit(1);
    }
  }
  
  if (!uri) {
    console.error('❌ MONGODB_URI not available');
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