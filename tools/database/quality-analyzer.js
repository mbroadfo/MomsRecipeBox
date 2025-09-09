#!/usr/bin/env node
/**
 * Mom's Recipe Box - Recipe Data Quality Analyzer
 * 
 * Comprehensive tool for analyzing recipe data quality, identifying issues,
 * and generating detailed reports for database maintenance.
 * 
 * Usage: node tools/database/quality-analyzer.js
 * 
 * Features:
 * - Field standardization analysis
 * - Required field validation
 * - Content quality assessment
 * - Severity categorization
 * - Auto-fix identification
 * - Detailed reporting
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  mongodb: {
    uri: "mongodb://admin:supersecret@localhost:27017/moms_recipe_box?authSource=admin",
    dbName: process.env.MONGODB_DB_NAME || 'moms_recipe_box'
  },
  reporting: {
    outputDir: path.join(process.cwd(), 'tools', 'reports', 'quality_reports'),
    enableConsoleOutput: true,
    enableFileOutput: true
  }
};

class RecipeDataQualityAnalyzer {
  constructor() {
    this.issues = [];
    this.stats = {
      totalRecipes: 0,
      recipesWithIssues: 0,
      issueTypes: {},
      cleanRecipes: 0
    };
    
    // Ensure output directory exists
    if (CONFIG.reporting.enableFileOutput) {
      fs.mkdirSync(CONFIG.reporting.outputDir, { recursive: true });
    }
  }

  /**
   * Add an issue to the analysis results
   */
  addIssue(recipeId, recipeTitle, issueType, description, severity = 'medium', autoFixable = false) {
    this.issues.push({
      recipeId,
      recipeTitle,
      issueType,
      description,
      severity,
      autoFixable,
      timestamp: new Date().toISOString()
    });

    // Track issue types
    if (!this.stats.issueTypes[issueType]) {
      this.stats.issueTypes[issueType] = 0;
    }
    this.stats.issueTypes[issueType]++;
  }

  /**
   * Analyze a single recipe for data quality issues
   */
  analyzeRecipe(recipe) {
    const recipeId = recipe._id?.toString() || 'unknown';
    const recipeTitle = recipe.title || 'Untitled Recipe';
    let hasIssues = false;

    // 1. FIELD STANDARDIZATION ISSUES
    
    // Check for both steps and instructions
    if (recipe.steps && recipe.instructions) {
      this.addIssue(recipeId, recipeTitle, 'DUPLICATE_INSTRUCTIONS', 
        'Recipe has both "steps" and "instructions" fields', 'medium', true);
      hasIssues = true;
    }

    // Check for deprecated status field
    if (recipe.status) {
      this.addIssue(recipeId, recipeTitle, 'DEPRECATED_STATUS_FIELD', 
        `Recipe has deprecated "status" field: "${recipe.status}"`, 'low', true);
      hasIssues = true;
    }

    // Check for old "steps" field when no instructions
    if (recipe.steps && !recipe.instructions) {
      this.addIssue(recipeId, recipeTitle, 'LEGACY_STEPS_FIELD', 
        'Recipe uses legacy "steps" field instead of "instructions"', 'medium', true);
      hasIssues = true;
    }

    // 2. REQUIRED FIELD VALIDATION

    // Missing title
    if (!recipe.title || recipe.title.trim() === '') {
      this.addIssue(recipeId, recipeTitle, 'MISSING_TITLE', 
        'Recipe is missing a title', 'critical', false);
      hasIssues = true;
    }

    // Missing instructions/steps
    const hasInstructions = (recipe.instructions && Array.isArray(recipe.instructions) && recipe.instructions.length > 0) ||
                           (recipe.steps && Array.isArray(recipe.steps) && recipe.steps.length > 0);
    if (!hasInstructions) {
      this.addIssue(recipeId, recipeTitle, 'MISSING_INSTRUCTIONS', 
        'Recipe has no instructions or steps', 'high', false);
      hasIssues = true;
    }

    // Missing ingredients
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      this.addIssue(recipeId, recipeTitle, 'MISSING_INGREDIENTS', 
        'Recipe has no ingredients', 'high', false);
      hasIssues = true;
    }

    // 3. DATA QUALITY ISSUES

    // Missing subtitle
    if (!recipe.subtitle || recipe.subtitle.trim() === '') {
      this.addIssue(recipeId, recipeTitle, 'MISSING_SUBTITLE', 
        'Recipe is missing a subtitle', 'low', false);
      hasIssues = true;
    }

    // Missing description
    if (!recipe.description || recipe.description.trim() === '') {
      this.addIssue(recipeId, recipeTitle, 'MISSING_DESCRIPTION', 
        'Recipe is missing a description', 'low', false);
      hasIssues = true;
    }

    // Missing visibility
    if (!recipe.visibility) {
      this.addIssue(recipeId, recipeTitle, 'MISSING_VISIBILITY', 
        'Recipe is missing visibility setting', 'medium', true);
      hasIssues = true;
    }

    // Invalid visibility values
    const validVisibility = ['private', 'family', 'public'];
    if (recipe.visibility && !validVisibility.includes(recipe.visibility)) {
      this.addIssue(recipeId, recipeTitle, 'INVALID_VISIBILITY', 
        `Recipe has invalid visibility: "${recipe.visibility}"`, 'medium', true);
      hasIssues = true;
    }

    // Missing owner_id
    if (!recipe.owner_id) {
      this.addIssue(recipeId, recipeTitle, 'MISSING_OWNER_ID', 
        'Recipe is missing owner_id', 'medium', true);
      hasIssues = true;
    }

    // 4. CONTENT QUALITY ISSUES

    // Empty instructions/steps
    if (recipe.instructions && Array.isArray(recipe.instructions)) {
      const emptyInstructions = recipe.instructions.filter(step => !step || step.trim() === '');
      if (emptyInstructions.length > 0) {
        this.addIssue(recipeId, recipeTitle, 'EMPTY_INSTRUCTIONS', 
          `Recipe has ${emptyInstructions.length} empty instruction steps`, 'medium', true);
        hasIssues = true;
      }
    }

    // Empty ingredients
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      const emptyIngredients = recipe.ingredients.filter(ing => {
        if (typeof ing === 'string') return !ing || ing.trim() === '';
        if (typeof ing === 'object') return !ing.name || ing.name.trim() === '';
        return true;
      });
      if (emptyIngredients.length > 0) {
        this.addIssue(recipeId, recipeTitle, 'EMPTY_INGREDIENTS', 
          `Recipe has ${emptyIngredients.length} empty ingredients`, 'medium', true);
        hasIssues = true;
      }
    }

    // 5. METADATA ISSUES

    // Missing created_at
    if (!recipe.created_at) {
      this.addIssue(recipeId, recipeTitle, 'MISSING_CREATED_AT', 
        'Recipe is missing created_at timestamp', 'low', true);
      hasIssues = true;
    }

    // Missing updated_at
    if (!recipe.updated_at) {
      this.addIssue(recipeId, recipeTitle, 'MISSING_UPDATED_AT', 
        'Recipe is missing updated_at timestamp', 'low', true);
      hasIssues = true;
    }

    // 6. TAGS AND CATEGORIZATION

    // Missing tags
    if (!recipe.tags || !Array.isArray(recipe.tags) || recipe.tags.length === 0) {
      this.addIssue(recipeId, recipeTitle, 'MISSING_TAGS', 
        'Recipe has no tags', 'low', false);
      hasIssues = true;
    }

    // Inconsistent tag formatting
    if (recipe.tags && Array.isArray(recipe.tags)) {
      const inconsistentTags = recipe.tags.filter(tag => tag !== tag.toLowerCase());
      if (inconsistentTags.length > 0) {
        this.addIssue(recipeId, recipeTitle, 'INCONSISTENT_TAG_CASE', 
          `Recipe has ${inconsistentTags.length} tags with inconsistent casing: ${inconsistentTags.join(', ')}`, 'low', true);
        hasIssues = true;
      }
    }

    // 7. IMAGE ISSUES

    // Missing image_url
    if (!recipe.image_url) {
      this.addIssue(recipeId, recipeTitle, 'MISSING_IMAGE_URL', 
        'Recipe is missing image_url', 'low', false);
      hasIssues = true;
    }

    // Default/placeholder image
    if (recipe.image_url && (
        recipe.image_url.includes('default.png') || 
        recipe.image_url.includes('placeholder') ||
        recipe.image_url.includes('mrb-recipe-images-dev.s3.amazonaws.com/default.png')
    )) {
      this.addIssue(recipeId, recipeTitle, 'PLACEHOLDER_IMAGE', 
        'Recipe is using placeholder/default image', 'low', false);
      hasIssues = true;
    }

    // 8. STRUCTURAL ISSUES

    // Check for unusual ingredient structure
    if (recipe.ingredients && typeof recipe.ingredients === 'object' && !Array.isArray(recipe.ingredients)) {
      const groupKeys = Object.keys(recipe.ingredients);
      if (groupKeys.some(key => Array.isArray(recipe.ingredients[key]))) {
        this.addIssue(recipeId, recipeTitle, 'GROUPED_INGREDIENTS', 
          `Recipe has grouped ingredient structure: ${groupKeys.join(', ')}`, 'medium', true);
        hasIssues = true;
      }
    }

    // Check for unusual source structure
    if (recipe.source && typeof recipe.source === 'object') {
      this.addIssue(recipeId, recipeTitle, 'COMPLEX_SOURCE_STRUCTURE', 
        'Recipe has complex source object instead of simple string', 'low', true);
      hasIssues = true;
    }

    // 9. TEST/INVALID DATA

    // Test recipes
    if (recipeTitle.toLowerCase().includes('test') || recipeTitle.toLowerCase().includes('fav test')) {
      this.addIssue(recipeId, recipeTitle, 'TEST_RECIPE', 
        'Recipe appears to be test data', 'high', true);
      hasIssues = true;
    }

    return !hasIssues;
  }

  /**
   * Find recipes with duplicate titles
   */
  async findDuplicateTitles(recipes) {
    const titleMap = {};
    recipes.forEach(recipe => {
      const title = recipe.title?.toLowerCase().trim();
      if (title) {
        if (!titleMap[title]) {
          titleMap[title] = [];
        }
        titleMap[title].push({
          id: recipe._id?.toString(),
          title: recipe.title,
          created_at: recipe.created_at
        });
      }
    });

    // Find duplicates
    Object.entries(titleMap).forEach(([title, recipes]) => {
      if (recipes.length > 1) {
        recipes.forEach(recipe => {
          this.addIssue(recipe.id, recipe.title, 'DUPLICATE_TITLE', 
            `Recipe title appears ${recipes.length} times in database`, 'medium', false);
        });
      }
    });
  }

  /**
   * Generate comprehensive analysis report
   */
  generateReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      tool: 'quality-analyzer',
      version: '1.0.0',
      summary: {
        totalRecipes: this.stats.totalRecipes,
        cleanRecipes: this.stats.cleanRecipes,
        recipesWithIssues: this.stats.recipesWithIssues,
        cleanPercentage: ((this.stats.cleanRecipes / this.stats.totalRecipes) * 100).toFixed(1)
      },
      issueTypesSummary: this.stats.issueTypes,
      severityBreakdown: {},
      autoFixableIssues: 0,
      issues: this.issues
    };

    // Calculate severity breakdown
    this.issues.forEach(issue => {
      if (!report.severityBreakdown[issue.severity]) {
        report.severityBreakdown[issue.severity] = 0;
      }
      report.severityBreakdown[issue.severity]++;
      
      if (issue.autoFixable) {
        report.autoFixableIssues++;
      }
    });

    return report;
  }

  /**
   * Display results to console
   */
  displayResults(report) {
    if (!CONFIG.reporting.enableConsoleOutput) return;

    console.log('🔍 RECIPE DATA QUALITY ANALYSIS');
    console.log('═'.repeat(50));
    console.log(`Analysis Date: ${new Date(report.generatedAt).toLocaleString()}`);
    console.log(`Total Recipes: ${report.summary.totalRecipes}`);
    console.log(`Clean Recipes: ${report.summary.cleanRecipes} (${report.summary.cleanPercentage}%)`);
    console.log(`Recipes with Issues: ${report.summary.recipesWithIssues}`);
    console.log(`Auto-fixable Issues: ${report.autoFixableIssues}`);

    if (Object.keys(report.issueTypesSummary).length > 0) {
      console.log('\n🔍 ISSUE TYPES BREAKDOWN');
      console.log('═'.repeat(50));
      Object.entries(report.issueTypesSummary)
        .sort((a, b) => b[1] - a[1])
        .forEach(([issueType, count]) => {
          console.log(`${issueType.padEnd(30)} : ${count}`);
        });
    }

    if (Object.keys(report.severityBreakdown).length > 0) {
      console.log('\n⚠️  SEVERITY BREAKDOWN');
      console.log('═'.repeat(50));
      Object.entries(report.severityBreakdown)
        .forEach(([severity, count]) => {
          const icon = severity === 'critical' ? '🚨' : 
                      severity === 'high' ? '⚠️ ' : 
                      severity === 'medium' ? '🟡' : '🔵';
          console.log(`${icon} ${severity.toUpperCase().padEnd(8)} : ${count}`);
        });
    }

    // Show critical issues
    const criticalIssues = this.issues.filter(issue => issue.severity === 'critical');
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES (Must Fix)');
      console.log('═'.repeat(50));
      criticalIssues.forEach(issue => {
        console.log(`📝 "${issue.recipeTitle}"`);
        console.log(`   Issue: ${issue.description}`);
        console.log(`   Type: ${issue.issueType}`);
        console.log('');
      });
    }

    // Show auto-fixable issues summary
    const autoFixableByType = {};
    this.issues.filter(issue => issue.autoFixable).forEach(issue => {
      if (!autoFixableByType[issue.issueType]) {
        autoFixableByType[issue.issueType] = 0;
      }
      autoFixableByType[issue.issueType]++;
    });

    if (Object.keys(autoFixableByType).length > 0) {
      console.log('\n🔧 AUTO-FIXABLE ISSUES');
      console.log('═'.repeat(50));
      Object.entries(autoFixableByType)
        .sort((a, b) => b[1] - a[1])
        .forEach(([issueType, count]) => {
          console.log(`${issueType.padEnd(30)} : ${count} recipes`);
        });
      console.log('\nThese issues can be automatically fixed with database-cleaner.js');
    }
  }

  /**
   * Save report to file
   */
  saveReport(report) {
    if (!CONFIG.reporting.enableFileOutput) return null;

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `recipe_quality_report_${timestamp}.json`;
    const filepath = path.join(CONFIG.reporting.outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    
    if (CONFIG.reporting.enableConsoleOutput) {
      console.log(`\n💾 Detailed report saved to: ${path.relative(process.cwd(), filepath)}`);
    }
    
    return filepath;
  }
}

/**
 * Main analysis function
 */
async function analyzeRecipeDataQuality() {
  const analyzer = new RecipeDataQualityAnalyzer();
  const client = new MongoClient(CONFIG.mongodb.uri);

  try {
    await client.connect();
    const db = client.db(CONFIG.mongodb.dbName);
    const recipesCollection = db.collection('recipes');

    // Get all recipes
    const recipes = await recipesCollection.find({}).toArray();
    analyzer.stats.totalRecipes = recipes.length;
    
    if (CONFIG.reporting.enableConsoleOutput) {
      console.log(`📊 Analyzing ${recipes.length} recipes...\n`);
    }

    // Analyze each recipe
    recipes.forEach(recipe => {
      const isClean = analyzer.analyzeRecipe(recipe);
      if (isClean) {
        analyzer.stats.cleanRecipes++;
      } else {
        analyzer.stats.recipesWithIssues++;
      }
    });

    // Check for duplicate titles
    await analyzer.findDuplicateTitles(recipes);

    // Generate and display report
    const report = analyzer.generateReport();
    analyzer.displayResults(report);
    analyzer.saveReport(report);

    if (CONFIG.reporting.enableConsoleOutput) {
      console.log('\n✅ Analysis complete!');
      console.log('\n💡 Next steps:');
      console.log('   - Review critical issues first');
      console.log('   - Run database-cleaner.js to fix auto-fixable issues');
      console.log('   - Consider AI enhancement for missing content');
    }

    return report;

  } catch (err) {
    console.error('❌ Error during analysis:', err);
    throw err;
  } finally {
    await client.close();
  }
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeRecipeDataQuality().catch(console.error);
}

export { analyzeRecipeDataQuality, RecipeDataQualityAnalyzer };
