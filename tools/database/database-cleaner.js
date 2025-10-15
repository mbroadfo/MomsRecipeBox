#!/usr/bin/env node
/**
 * Mom's Recipe Box - Database Cleaner
 * 
 * Automated tool for fixing structural and standardization issues in the recipe database.
 * Supports dry-run mode for safe preview of changes before applying them.
 * 
 * Usage: 
 *   node tools/database/database-cleaner.js                    # Dry run (preview)
 *   node tools/database/database-cleaner.js --apply            # Apply changes
 *   node tools/database/database-cleaner.js --apply --remove-tests  # Apply + remove tests
 * 
 * Features:
 * - Field standardization (steps → instructions)
 * - Missing field addition (owner_id, visibility)
 * - Deprecated field removal (status)
 * - Content cleanup (empty entries, grouped structures)
 * - Test data removal
 * - Comprehensive change logging
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  mongodb: {
    uri: "mongodb://admin:supersecret@localhost:27017/moms_recipe_box_dev?authSource=admin",
    dbName: 'moms_recipe_box_dev'
  },
  reporting: {
    outputDir: path.join(process.cwd(), 'tools', 'reports', 'cleanup_reports'),
    enableConsoleOutput: true,
    enableFileOutput: true
  },
  defaults: {
    ownerId: "admin_user",
    visibility: "family"
  }
};

class RecipeDatabaseCleaner {
  constructor() {
    this.fixes = [];
    this.stats = {
      totalRecipes: 0,
      processedRecipes: 0,
      fixedRecipes: 0,
      skippedRecipes: 0,
      deletedRecipes: 0,
      errors: 0
    };
    
    // Ensure output directory exists
    if (CONFIG.reporting.enableFileOutput) {
      fs.mkdirSync(CONFIG.reporting.outputDir, { recursive: true });
    }
  }

  /**
   * Log a fix operation
   */
  logFix(recipeId, recipeTitle, fixType, description, before = null, after = null) {
    this.fixes.push({
      recipeId,
      recipeTitle,
      fixType,
      description,
      before,
      after,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Clean a single recipe
   */
  async cleanRecipe(recipe, collection, dryRun = false) {
    const recipeId = recipe._id;
    const recipeTitle = recipe.title || 'Untitled Recipe';
    let updates = {};
    let unsets = {};
    let hasChanges = false;

    if (CONFIG.reporting.enableConsoleOutput) {
      console.log(`\n🔧 Processing: "${recipeTitle}"`);
    }

    // 1. Fix duplicate instructions (remove steps if instructions exist)
    if (recipe.steps && recipe.instructions) {
      const stepsStr = JSON.stringify(recipe.steps);
      const instructionsStr = JSON.stringify(recipe.instructions);
      
      if (stepsStr === instructionsStr) {
        unsets.steps = "";
        this.logFix(recipeId, recipeTitle, 'REMOVE_DUPLICATE_STEPS', 
          'Removed duplicate "steps" field (identical to instructions)', recipe.steps, null);
        hasChanges = true;
        if (CONFIG.reporting.enableConsoleOutput) {
          console.log('  ✓ Removing duplicate steps field (identical content)');
        }
      } else {
        // For known problematic recipes, prefer instructions over steps
        const problematicRecipes = ["Apple Pandowdy", "Chicago Thin-Crust Pizza", "Crab Won Tons"];
        if (problematicRecipes.includes(recipeTitle)) {
          unsets.steps = "";
          this.logFix(recipeId, recipeTitle, 'REMOVE_STEPS_PREFER_INSTRUCTIONS', 
            'Removed "steps" field - keeping more complete "instructions" field', recipe.steps, null);
          hasChanges = true;
          if (CONFIG.reporting.enableConsoleOutput) {
            console.log('  ✓ Removing steps field (keeping more complete instructions)');
          }
        } else {
          if (CONFIG.reporting.enableConsoleOutput) {
            console.log('  ⚠️  Has both steps and instructions with different content - manual review needed');
          }
          this.logFix(recipeId, recipeTitle, 'MANUAL_REVIEW_NEEDED', 
            'Has both steps and instructions with different content', 
            { steps: recipe.steps, instructions: recipe.instructions }, null);
        }
      }
    }

    // 2. Convert legacy steps to instructions
    if (recipe.steps && !recipe.instructions) {
      updates.instructions = recipe.steps;
      unsets.steps = "";
      this.logFix(recipeId, recipeTitle, 'CONVERT_STEPS_TO_INSTRUCTIONS', 
        'Converted legacy "steps" field to "instructions"', recipe.steps, recipe.steps);
      hasChanges = true;
      if (CONFIG.reporting.enableConsoleOutput) {
        console.log('  ✓ Converting steps to instructions');
      }
    }

    // 3. Remove deprecated status field
    if (recipe.status) {
      unsets.status = "";
      this.logFix(recipeId, recipeTitle, 'REMOVE_STATUS_FIELD', 
        'Removed deprecated "status" field', recipe.status, null);
      hasChanges = true;
      if (CONFIG.reporting.enableConsoleOutput) {
        console.log('  ✓ Removing deprecated status field');
      }
    }

    // 4. Add missing owner_id
    if (!recipe.owner_id) {
      updates.owner_id = CONFIG.defaults.ownerId;
      this.logFix(recipeId, recipeTitle, 'ADD_OWNER_ID', 
        'Added missing owner_id', null, CONFIG.defaults.ownerId);
      hasChanges = true;
      if (CONFIG.reporting.enableConsoleOutput) {
        console.log('  ✓ Adding missing owner_id');
      }
    }

    // 5. Add missing visibility
    if (!recipe.visibility) {
      updates.visibility = CONFIG.defaults.visibility;
      this.logFix(recipeId, recipeTitle, 'ADD_VISIBILITY', 
        'Added missing visibility setting', null, CONFIG.defaults.visibility);
      hasChanges = true;
      if (CONFIG.reporting.enableConsoleOutput) {
        console.log('  ✓ Adding missing visibility');
      }
    }

    // 6. Fix inconsistent tag casing
    if (recipe.tags && Array.isArray(recipe.tags)) {
      const originalTags = [...recipe.tags];
      const fixedTags = recipe.tags.map(tag => tag.toLowerCase());
      const hasInconsistentCasing = originalTags.some((tag, index) => tag !== fixedTags[index]);
      
      if (hasInconsistentCasing) {
        updates.tags = fixedTags;
        this.logFix(recipeId, recipeTitle, 'FIX_TAG_CASING', 
          'Fixed inconsistent tag casing', originalTags, fixedTags);
        hasChanges = true;
        if (CONFIG.reporting.enableConsoleOutput) {
          console.log('  ✓ Fixing tag casing');
        }
      }
    }

    // 7. Fix grouped ingredients (flatten to array)
    if (recipe.ingredients && typeof recipe.ingredients === 'object' && !Array.isArray(recipe.ingredients)) {
      const flatIngredients = [];
      Object.entries(recipe.ingredients).forEach(([groupName, groupIngredients]) => {
        if (Array.isArray(groupIngredients)) {
          flatIngredients.push(`--- ${groupName} ---`);
          flatIngredients.push(...groupIngredients);
        } else {
          flatIngredients.push(groupIngredients);
        }
      });
      
      updates.ingredients = flatIngredients;
      this.logFix(recipeId, recipeTitle, 'FLATTEN_GROUPED_INGREDIENTS', 
        'Flattened grouped ingredients structure', recipe.ingredients, flatIngredients);
      hasChanges = true;
      if (CONFIG.reporting.enableConsoleOutput) {
        console.log('  ✓ Flattening grouped ingredients');
      }
    }

    // 8. Remove empty ingredients
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      const originalIngredients = [...recipe.ingredients];
      const cleanedIngredients = recipe.ingredients.filter(ing => {
        if (typeof ing === 'string') return ing && ing.trim() !== '';
        if (typeof ing === 'object') return ing.name && ing.name.trim() !== '';
        return false;
      });
      
      if (cleanedIngredients.length !== originalIngredients.length) {
        updates.ingredients = cleanedIngredients;
        const removedCount = originalIngredients.length - cleanedIngredients.length;
        this.logFix(recipeId, recipeTitle, 'REMOVE_EMPTY_INGREDIENTS', 
          `Removed ${removedCount} empty ingredients`, originalIngredients, cleanedIngredients);
        hasChanges = true;
        if (CONFIG.reporting.enableConsoleOutput) {
          console.log(`  ✓ Removing ${removedCount} empty ingredients`);
        }
      }
    }

    // 9. Remove empty instructions
    if (recipe.instructions && Array.isArray(recipe.instructions)) {
      const originalInstructions = [...recipe.instructions];
      const cleanedInstructions = recipe.instructions.filter(step => step && step.trim() !== '');
      
      if (cleanedInstructions.length !== originalInstructions.length) {
        updates.instructions = cleanedInstructions;
        const removedCount = originalInstructions.length - cleanedInstructions.length;
        this.logFix(recipeId, recipeTitle, 'REMOVE_EMPTY_INSTRUCTIONS', 
          `Removed ${removedCount} empty instruction steps`, originalInstructions, cleanedInstructions);
        hasChanges = true;
        if (CONFIG.reporting.enableConsoleOutput) {
          console.log(`  ✓ Removing ${removedCount} empty instruction steps`);
        }
      }
    }

    // 10. Add timestamps if missing
    const now = new Date();
    if (!recipe.created_at) {
      updates.created_at = now;
      this.logFix(recipeId, recipeTitle, 'ADD_CREATED_AT', 
        'Added missing created_at timestamp', null, now);
      hasChanges = true;
      if (CONFIG.reporting.enableConsoleOutput) {
        console.log('  ✓ Adding missing created_at timestamp');
      }
    }

    if (!recipe.updated_at) {
      updates.updated_at = now;
      this.logFix(recipeId, recipeTitle, 'ADD_UPDATED_AT', 
        'Added missing updated_at timestamp', null, now);
      hasChanges = true;
      if (CONFIG.reporting.enableConsoleOutput) {
        console.log('  ✓ Adding missing updated_at timestamp');
      }
    }

    // Apply changes
    if (hasChanges && !dryRun) {
      const updateQuery = {};
      if (Object.keys(updates).length > 0) {
        updateQuery.$set = updates;
      }
      if (Object.keys(unsets).length > 0) {
        updateQuery.$unset = unsets;
      }

      try {
        await collection.updateOne({ _id: recipeId }, updateQuery);
        this.stats.fixedRecipes++;
        if (CONFIG.reporting.enableConsoleOutput) {
          console.log('  ✅ Changes applied successfully');
        }
      } catch (error) {
        if (CONFIG.reporting.enableConsoleOutput) {
          console.error(`  ❌ Error updating recipe: ${error.message}`);
        }
        this.stats.errors++;
      }
    } else if (hasChanges && dryRun) {
      if (CONFIG.reporting.enableConsoleOutput) {
        console.log('  🔍 Changes identified (dry run - not applied)');
      }
    } else {
      if (CONFIG.reporting.enableConsoleOutput) {
        console.log('  ✓ No changes needed');
      }
      this.stats.skippedRecipes++;
    }

    this.stats.processedRecipes++;
    return hasChanges;
  }

  /**
   * Remove test recipes from database
   */
  async removeTestRecipes(collection, dryRun = false) {
    const testRecipeQueries = [
      { title: { $regex: /test/i } },
      { title: { $regex: /fav test/i } },
      { title: "Test Recipe" }
    ];

    if (CONFIG.reporting.enableConsoleOutput) {
      console.log('\n🗑️  REMOVING TEST RECIPES');
      console.log('═'.repeat(50));
    }

    for (const query of testRecipeQueries) {
      const testRecipes = await collection.find(query).toArray();
      
      for (const recipe of testRecipes) {
        if (CONFIG.reporting.enableConsoleOutput) {
          console.log(`🗑️  Found test recipe: "${recipe.title}"`);
        }
        
        if (!dryRun) {
          try {
            await collection.deleteOne({ _id: recipe._id });
            this.logFix(recipe._id, recipe.title, 'DELETE_TEST_RECIPE', 
              'Deleted test recipe', recipe, null);
            this.stats.deletedRecipes++;
            if (CONFIG.reporting.enableConsoleOutput) {
              console.log('  ✅ Deleted successfully');
            }
          } catch (error) {
            if (CONFIG.reporting.enableConsoleOutput) {
              console.error(`  ❌ Error deleting recipe: ${error.message}`);
            }
            this.stats.errors++;
          }
        } else {
          if (CONFIG.reporting.enableConsoleOutput) {
            console.log('  🔍 Would be deleted (dry run)');
          }
          this.logFix(recipe._id, recipe.title, 'DELETE_TEST_RECIPE', 
            'Would delete test recipe (dry run)', recipe, null);
        }
      }
    }
  }

  /**
   * Generate cleanup report
   */
  generateReport() {
    const report = {
      cleanupDate: new Date().toISOString(),
      tool: 'database-cleaner',
      version: '1.0.0',
      statistics: this.stats,
      fixes: this.fixes,
      summary: {
        totalFixes: this.fixes.length,
        fixTypes: {}
      }
    };

    // Count fix types
    this.fixes.forEach(fix => {
      if (!report.summary.fixTypes[fix.fixType]) {
        report.summary.fixTypes[fix.fixType] = 0;
      }
      report.summary.fixTypes[fix.fixType]++;
    });

    return report;
  }

  /**
   * Display cleanup results
   */
  displayResults(report, dryRun) {
    if (!CONFIG.reporting.enableConsoleOutput) return;

    console.log('\n📈 CLEANUP SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Total Recipes: ${this.stats.totalRecipes}`);
    console.log(`Processed: ${this.stats.processedRecipes}`);
    console.log(`Fixed: ${this.stats.fixedRecipes}`);
    console.log(`Deleted: ${this.stats.deletedRecipes}`);
    console.log(`Skipped (no changes): ${this.stats.skippedRecipes}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Total Operations: ${report.summary.totalFixes}`);

    if (Object.keys(report.summary.fixTypes).length > 0) {
      console.log('\n🔧 OPERATIONS PERFORMED');
      console.log('═'.repeat(50));
      Object.entries(report.summary.fixTypes)
        .sort((a, b) => b[1] - a[1])
        .forEach(([fixType, count]) => {
          console.log(`${fixType.padEnd(30)} : ${count}`);
        });
    }

    if (dryRun) {
      console.log('\n🔍 This was a dry run. To apply changes, use --apply flag');
    } else {
      console.log('\n✅ Database cleanup complete!');
    }
  }

  /**
   * Save cleanup report
   */
  saveReport(report) {
    if (!CONFIG.reporting.enableFileOutput) return null;

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `cleanup_report_${timestamp}.json`;
    const filepath = path.join(CONFIG.reporting.outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    if (CONFIG.reporting.enableConsoleOutput) {
      console.log(`\n💾 Detailed report saved to: ${path.relative(process.cwd(), filepath)}`);
    }
    
    return filepath;
  }
}

/**
 * Main cleanup function
 */
async function cleanupDatabase(dryRun = true, removeTests = false) {
  const cleaner = new RecipeDatabaseCleaner();
  const client = new MongoClient(CONFIG.mongodb.uri);

  if (CONFIG.reporting.enableConsoleOutput) {
    console.log('🧹 Mom\'s Recipe Box - Database Cleaner');
    console.log('═'.repeat(50));
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
    } else {
      console.log('⚠️  LIVE MODE - Changes will be applied to database');
    }
  }

  try {
    await client.connect();
    const db = client.db(CONFIG.mongodb.dbName);
    const recipesCollection = db.collection('recipes');

    // Get all recipes
    const recipes = await recipesCollection.find({}).toArray();
    cleaner.stats.totalRecipes = recipes.length;
    
    if (CONFIG.reporting.enableConsoleOutput) {
      console.log(`\n📊 Found ${recipes.length} recipes to process`);
    }

    // Process each recipe
    for (const recipe of recipes) {
      await cleaner.cleanRecipe(recipe, recipesCollection, dryRun);
    }

    // Remove test recipes if requested
    if (removeTests) {
      await cleaner.removeTestRecipes(recipesCollection, dryRun);
    }

    // Generate and display results
    const report = cleaner.generateReport();
    cleaner.displayResults(report, dryRun);
    cleaner.saveReport(report);

    if (CONFIG.reporting.enableConsoleOutput && !dryRun) {
      console.log('\n💡 Next steps:');
      console.log('   - Run quality-analyzer.js to verify improvements');
      console.log('   - Create database backup if satisfied with results');
      console.log('   - Test application with cleaned data');
    }

    return report;

  } catch (err) {
    console.error('❌ Error during cleanup:', err);
    throw err;
  } finally {
    await client.close();
  }
}

// Parse command line arguments and run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const removeTests = args.includes('--remove-tests');

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Mom\'s Recipe Box Database Cleaner');
    console.log('═'.repeat(40));
    console.log('Usage:');
    console.log('  node tools/database/database-cleaner.js                    # Dry run (preview changes)');
    console.log('  node tools/database/database-cleaner.js --apply            # Apply changes');
    console.log('  node tools/database/database-cleaner.js --apply --remove-tests  # Apply changes and remove test recipes');
    console.log('  node tools/database/database-cleaner.js --help             # Show this help');
    console.log('');
    console.log('Options:');
    console.log('  --apply         Apply changes to database (default: dry run)');
    console.log('  --remove-tests  Also remove test recipes');
    console.log('  --help, -h      Show this help message');
    process.exit(0);
  }

  cleanupDatabase(dryRun, removeTests).catch(console.error);
}

export { cleanupDatabase, RecipeDatabaseCleaner };
