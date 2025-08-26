// File: docker_analyze_recipes.js
// This script runs inside the app container to analyze recipe visibility and ownership
// Usage: docker exec momsrecipebox-app node docker_analyze_recipes.js

import { getDb } from './app.js';

async function analyzeRecipes() {
  console.log('⚡ Connecting to MongoDB...');
  
  try {
    const db = await getDb();
    console.log('📊 Connected to database');

    const recipesCollection = db.collection('recipes');
    
    // Get total count of recipes
    const totalCount = await recipesCollection.countDocuments();
    console.log(`\n📋 Total recipes: ${totalCount}`);
    
    // Count by visibility
    const visibilityCounts = await recipesCollection.aggregate([
      { $group: { _id: '$visibility', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log('\n📊 Recipes by visibility:');
    visibilityCounts.forEach(item => {
      console.log(`   ${item._id || 'undefined'}: ${item.count}`);
    });
    
    // Count by owner_id
    const ownerCounts = await recipesCollection.aggregate([
      { $group: { _id: '$owner_id', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log('\n👤 Recipes by owner:');
    ownerCounts.forEach(item => {
      console.log(`   ${item._id || 'undefined'}: ${item.count}`);
    });
    
    // Count by visibility and owner combined
    const combinedCounts = await recipesCollection.aggregate([
      { 
        $group: { 
          _id: { visibility: '$visibility', owner_id: '$owner_id' }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { '_id.visibility': 1, '_id.owner_id': 1 } }
    ]).toArray();
    
    console.log('\n🔍 Recipes by visibility and owner:');
    combinedCounts.forEach(item => {
      const visibility = item._id.visibility || 'undefined';
      const owner = item._id.owner_id || 'undefined';
      console.log(`   ${visibility} + ${owner}: ${item.count}`);
    });

    // Get a sample of recipes with each combination of visibility and owner
    console.log('\n📝 Sample recipes for each visibility/owner combination:');
    for (const combo of combinedCounts) {
      const visibility = combo._id.visibility;
      const owner = combo._id.owner_id;
      
      const sample = await recipesCollection.find({
        visibility: visibility,
        owner_id: owner
      }).limit(1).toArray();
      
      if (sample.length > 0) {
        console.log(`\n   ${visibility} + ${owner}:`);
        console.log(`     Title: ${sample[0].title}`);
        console.log(`     ID: ${sample[0]._id}`);
      }
    }

  } catch (err) {
    console.error('❌ Error analyzing recipes:', err);
  }
}

analyzeRecipes()
  .then(() => console.log('\n✅ Analysis complete'))
  .catch(err => console.error('Unhandled error:', err));
