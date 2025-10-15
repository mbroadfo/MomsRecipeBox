#!/usr/bin/env node
/**
 * Mom's Recipe Box - Field Analyzer
 * 
 * Simple diagnostic tool for analyzing field usage patterns across recipes.
 * Provides quick overview of database structure and field distribution.
 * 
 * Usage: node tools/database/field-analyzer.js
 * 
 * Features:
 * - Field usage counting
 * - Duplicate field identification
 * - Distribution statistics
 * - Quick health check
 */

import { MongoClient } from 'mongodb';

// Configuration
const CONFIG = {
  mongodb: {
    uri: 'mongodb://admin:supersecret@localhost:27017/moms_recipe_box_dev?authSource=admin',
    dbName: 'moms_recipe_box_dev'
  }
};

/**
 * Analyze field usage across all recipes
 */
async function analyzeRecipeFields() {
  // Force direct console output
  console.log = console.dir;
  console.log('\n📊 Mom\'s Recipe Box - Field Usage Analyzer');
  console.log('═'.repeat(50));
  
  console.log('Starting analysis...');
  
  // Connect to MongoDB
  const client = new MongoClient(CONFIG.mongodb.uri, {
    serverSelectionTimeoutMS: 5000
  });
  
  try {
    // Connect with a short timeout
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully!');
    
    const db = client.db(CONFIG.mongodb.dbName);
    
    // Test connection with a simple admin command
    await db.command({ ping: 1 });
    console.log('Ping successful!');
    
    const recipesCollection = db.collection('recipes');
    
    console.log('Loading recipes...');
    // Get all recipes
    const recipes = await recipesCollection.find({}).toArray();
    console.log(`Found ${recipes.length} recipes`);
    
    console.log(`\nAnalyzing ${recipes.length} recipes...\n`);

    // Track field usage
    const fieldCounts = {};
    const duplicateFields = [];
    const fieldExamples = {};

    recipes.forEach((recipe, index) => {
      const recipeId = recipe._id?.toString() || `recipe_${index}`;
      const recipeTitle = recipe.title || 'Untitled Recipe';

      // Count fields
      Object.keys(recipe).forEach(field => {
        if (!fieldCounts[field]) {
          fieldCounts[field] = 0;
          fieldExamples[field] = [];
        }
        fieldCounts[field]++;
        
        // Store example values (first 3)
        if (fieldExamples[field].length < 3) {
          let exampleValue = recipe[field];
          if (Array.isArray(exampleValue)) {
            exampleValue = `Array(${exampleValue.length})`;
          } else if (typeof exampleValue === 'object' && exampleValue !== null) {
            exampleValue = `Object(${Object.keys(exampleValue).length} keys)`;
          } else if (typeof exampleValue === 'string' && exampleValue.length > 50) {
            exampleValue = exampleValue.substring(0, 50) + '...';
          }
          fieldExamples[field].push(exampleValue);
        }
      });

      // Check for problematic combinations
      if (recipe.steps && recipe.instructions) {
        duplicateFields.push({
          recipeId,
          recipeTitle,
          issue: 'Has both steps and instructions',
          stepsCount: Array.isArray(recipe.steps) ? recipe.steps.length : 1,
          instructionsCount: Array.isArray(recipe.instructions) ? recipe.instructions.length : 1
        });
      }
    });

    // Display field usage statistics
    console.log('🔍 FIELD USAGE STATISTICS');
    console.log('═'.repeat(50));
    
    const sortedFields = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1]);

    sortedFields.forEach(([field, count]) => {
      const percentage = ((count / recipes.length) * 100).toFixed(1);
      const examples = fieldExamples[field].join(', ');
      console.log(`${field.padEnd(20)} : ${count.toString().padStart(3)} (${percentage.padStart(5)}%) - ${examples}`);
    });

    // Display duplicate field issues
    if (duplicateFields.length > 0) {
      console.log('\n⚠️  DUPLICATE FIELD ISSUES');
      console.log('═'.repeat(50));
      duplicateFields.forEach(issue => {
        console.log(`📝 "${issue.recipeTitle}"`);
        console.log(`   ${issue.issue}`);
        console.log(`   Steps: ${issue.stepsCount} items, Instructions: ${issue.instructionsCount} items`);
        console.log('');
      });
    }

    // Display summary statistics
    console.log('\n📈 SUMMARY STATISTICS');
    console.log('═'.repeat(50));
    console.log(`Total Recipes: ${recipes.length}`);
    console.log(`Unique Fields: ${Object.keys(fieldCounts).length}`);
    console.log(`Recipes with Duplicate Fields: ${duplicateFields.length}`);
    
    // Field completeness analysis
    const coreFields = ['title', 'ingredients', 'instructions', 'visibility', 'owner_id'];
    const completenessStats = {};
    
    coreFields.forEach(field => {
      const count = fieldCounts[field] || 0;
      const percentage = ((count / recipes.length) * 100).toFixed(1);
      completenessStats[field] = { count, percentage };
    });

    console.log('\n🎯 CORE FIELD COMPLETENESS');
    console.log('═'.repeat(50));
    coreFields.forEach(field => {
      const stats = completenessStats[field];
      const status = stats.percentage === '100.0' ? '✅' : stats.percentage >= '90.0' ? '⚠️ ' : '❌';
      console.log(`${status} ${field.padEnd(15)} : ${stats.count.toString().padStart(3)}/${recipes.length} (${stats.percentage}%)`);
    });

    // Data quality indicators
    console.log('\n🔍 QUICK HEALTH CHECK');
    console.log('═'.repeat(50));
    
    const healthChecks = [
      {
        name: 'Field Standardization',
        status: duplicateFields.length === 0 ? 'PASS' : 'NEEDS ATTENTION',
        detail: duplicateFields.length === 0 ? 'No duplicate fields found' : `${duplicateFields.length} recipes with duplicate fields`
      },
      {
        name: 'Core Fields Present',
        status: coreFields.every(field => completenessStats[field].percentage >= '90.0') ? 'PASS' : 'NEEDS ATTENTION',
        detail: `${coreFields.filter(field => completenessStats[field].percentage >= '90.0').length}/${coreFields.length} core fields have >90% coverage`
      },
      {
        name: 'Recipe Count',
        status: recipes.length > 0 ? 'PASS' : 'FAIL',
        detail: `${recipes.length} recipes in database`
      }
    ];

    healthChecks.forEach(check => {
      const icon = check.status === 'PASS' ? '✅' : check.status === 'NEEDS ATTENTION' ? '⚠️ ' : '❌';
      console.log(`${icon} ${check.name.padEnd(20)} : ${check.status}`);
      console.log(`   ${check.detail}`);
    });

    console.log('\n✅ Field analysis complete!');
    console.log('\n💡 Next steps:');
    if (duplicateFields.length > 0) {
      console.log('   - Run database-cleaner.js to fix duplicate fields');
    }
    if (!coreFields.every(field => completenessStats[field].percentage >= '90.0')) {
      console.log('   - Run quality-analyzer.js for detailed analysis');
    }
    console.log('   - Review field usage patterns for optimization opportunities');

  } catch (err) {
    console.error('❌ Error during analysis:', err);
  } finally {
    await client.close();
  }
}

// Set a reasonable timeout
setTimeout(() => {
  console.log('ERROR: Script timed out after 10 seconds');
  process.exit(1);
}, 10000);

// Run the analysis
analyzeRecipeFields()
  .catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
  })
  .then(() => {
    console.log('Analysis complete!');
    process.exit(0);
  });

export { analyzeRecipeFields };
