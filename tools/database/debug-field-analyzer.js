#!/usr/bin/env node
/**
 * Debug field-analyzer with direct connection
 */

import { MongoClient } from 'mongodb';

async function debugFieldAnalyzer() {
  console.log('🔍 Debug Field Analyzer - Direct Connection Test');
  console.log('═'.repeat(50));

  // Direct connection settings that work in our debug script
  const uri = 'mongodb://admin:supersecret@localhost:27017/moms_recipe_box_dev?authSource=admin';
  const client = new MongoClient(uri);
  
  try {
    console.log('⏳ Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully');
    
    const db = client.db('moms_recipe_box_dev');
    const recipesCollection = db.collection('recipes');
    
    console.log('⏳ Loading recipes...');
    const recipes = await recipesCollection.find({}).toArray();
    console.log(`✅ Loaded ${recipes.length} recipes`);
    
    // Track field usage
    const fieldCounts = {};
    
    recipes.forEach(recipe => {
      // Count fields
      Object.keys(recipe).forEach(field => {
        if (!fieldCounts[field]) {
          fieldCounts[field] = 0;
        }
        fieldCounts[field]++;
      });
    });
    
    // Display field usage statistics
    console.log('\n🔍 FIELD USAGE STATISTICS');
    console.log('═'.repeat(50));
    
    const sortedFields = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1]);
    
    sortedFields.forEach(([field, count]) => {
      const percentage = ((count / recipes.length) * 100).toFixed(1);
      console.log(`${field.padEnd(20)} : ${count.toString().padStart(3)} (${percentage.padStart(5)}%)`);
    });
    
    console.log('\n✅ Field analysis complete!');
    
  } catch (err) {
    console.error('❌ Error during analysis:', err);
  } finally {
    console.log('⏳ Closing connection...');
    await client.close();
    console.log('✅ Connection closed');
  }
}

// Run analysis
debugFieldAnalyzer().catch(console.error);