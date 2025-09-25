#!/usr/bin/env node

/**
 * Find Orphaned Images - Node.js Version
 * 
 * This script compares S3 bucket contents with MongoDB recipe IDs
 * to identify orphaned images that can be safely removed.
 * 
 * Usage:
 *   node scripts/find-orphan-images.js
 *   node scripts/find-orphan-images.js --bucket=my-bucket
 *   node scripts/find-orphan-images.js --show-commands
 *   node scripts/find-orphan-images.js --help
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Configuration
const DEFAULT_BUCKET = 'mrb-recipe-images-dev';
const ADMIN_API_URL = 'http://localhost:3000/admin/system-status';

// Recipe ID patterns (24-character MongoDB ObjectIds)
const RECIPE_ID_PATTERNS = [
    /^([a-f0-9]{24})\.jpg$/,           // recipeId.jpg
    /^([a-f0-9]{24})\.jpeg$/,          // recipeId.jpeg  
    /^([a-f0-9]{24})\.png$/,           // recipeId.png
    /^([a-f0-9]{24})_\d+\.jpg$/,       // recipeId_1.jpg, recipeId_2.jpg
    /^([a-f0-9]{24})_\d+\.jpeg$/,      // recipeId_1.jpeg
    /^([a-f0-9]{24})_\d+\.png$/,       // recipeId_1.png
    /^([a-f0-9]{24})-thumb\.jpg$/,     // recipeId-thumb.jpg
    /^([a-f0-9]{24})-thumb\.jpeg$/,    // recipeId-thumb.jpeg
    /^([a-f0-9]{24})-thumb\.png$/,     // recipeId-thumb.png
    /^([a-f0-9]{24})-small\.jpg$/,     // recipeId-small.jpg
    /^([a-f0-9]{24})-medium\.jpg$/,    // recipeId-medium.jpg
    /^([a-f0-9]{24})-large\.jpg$/      // recipeId-large.jpg
];

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = {
        bucket: process.env.RECIPE_IMAGES_BUCKET || DEFAULT_BUCKET,
        showCommands: false,
        help: false
    };

    process.argv.slice(2).forEach(arg => {
        if (arg === '--help' || arg === '-h') {
            args.help = true;
        } else if (arg === '--show-commands') {
            args.showCommands = true;
        } else if (arg.startsWith('--bucket=')) {
            args.bucket = arg.split('=')[1];
        }
    });

    return args;
}

/**
 * Show help information
 */
function showHelp() {
    console.log(`
Find Orphaned Images - Node.js Version

This script compares S3 bucket contents with MongoDB recipe IDs to identify
orphaned images that can be safely removed.

Usage:
  node scripts/find-orphan-images.js [options]

Options:
  --bucket=BUCKET_NAME    S3 bucket name (default: ${DEFAULT_BUCKET})
  --show-commands         Show AWS CLI commands to delete orphaned images
  --help, -h              Show this help message

Environment Variables:
  RECIPE_IMAGES_BUCKET    Default S3 bucket name

Examples:
  node scripts/find-orphan-images.js
  node scripts/find-orphan-images.js --bucket=mrb-recipe-images-prod
  node scripts/find-orphan-images.js --show-commands
`);
}

/**
 * Get recipe count from admin API
 */
async function getRecipeCount() {
    try {
        console.log('Step 1: Getting recipe count from MongoDB...');
        
        const response = await fetch(ADMIN_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const systemStatus = await response.json();
        const recipeCount = systemStatus.services?.mongodb?.stats?.totalRecipes;
        
        if (typeof recipeCount !== 'number') {
            throw new Error('Recipe count not found in admin API response');
        }
        
        console.log(`✅ Found ${recipeCount} recipes in database`);
        return recipeCount;
        
    } catch (error) {
        console.error('❌ Could not connect to admin API. Make sure the app is running.');
        console.error(`   Error: ${error.message}`);
        console.error('   Try: npm run restart');
        process.exit(1);
    }
}

/**
 * List all objects in S3 bucket
 */
function listS3Objects(bucketName) {
    try {
        console.log(`\nStep 2: Listing images in S3 bucket '${bucketName}'...`);
        
        const command = `aws s3api list-objects-v2 --bucket "${bucketName}" --query "Contents[].{Key:Key,Size:Size,LastModified:LastModified}" --output json`;
        const output = execSync(command, { encoding: 'utf8' });
        const objects = JSON.parse(output);
        
        if (!objects || objects.length === 0) {
            console.error('❌ No objects found in bucket or AWS CLI failed');
            console.error(`   Make sure AWS CLI is configured and you have access to bucket: ${bucketName}`);
            process.exit(1);
        }
        
        console.log(`✅ Found ${objects.length} images in S3 bucket`);
        return objects;
        
    } catch (error) {
        console.error(`❌ Error accessing S3 bucket: ${error.message}`);
        console.error('   Make sure AWS CLI is installed and configured');
        process.exit(1);
    }
}

/**
 * Extract recipe ID from filename using patterns
 */
function extractRecipeId(filename) {
    for (const pattern of RECIPE_ID_PATTERNS) {
        const match = filename.match(pattern);
        if (match) {
            return match[1]; // Return the captured recipe ID
        }
    }
    return null;
}

/**
 * Analyze S3 objects to categorize them
 */
function analyzeImages(s3Objects) {
    console.log('\nStep 3: Analyzing image filenames...');
    
    const recognizedImages = [];
    const unrecognizedImages = [];
    
    s3Objects.forEach(obj => {
        const filename = obj.Key;
        const sizeKB = Math.round(obj.Size / 1024 * 10) / 10; // Round to 1 decimal
        const recipeId = extractRecipeId(filename);
        
        if (recipeId) {
            recognizedImages.push({
                filename,
                recipeId,
                sizeKB,
                lastModified: obj.LastModified,
                reason: 'Recipe ID extracted - needs verification'
            });
        } else {
            unrecognizedImages.push({
                filename,
                sizeKB,
                lastModified: obj.LastModified,
                reason: 'Filename does not match recipe ID pattern'
            });
        }
    });
    
    return { recognizedImages, unrecognizedImages };
}

/**
 * Display analysis results
 */
function displayResults(s3Objects, recognizedImages, unrecognizedImages, recipeCount, showCommands, bucketName) {
    console.log('\n' + '='.repeat(50));
    console.log('ANALYSIS RESULTS');
    console.log('='.repeat(50));
    console.log(`Total images in S3: ${s3Objects.length}`);
    console.log(`Images with recipe ID pattern: ${recognizedImages.length}`);
    console.log(`Images with unrecognized names: ${unrecognizedImages.length}`);
    console.log(`Database has: ${recipeCount} recipes`);
    console.log(`Potential orphaned images: ${s3Objects.length - recipeCount}`);
    
    if (recognizedImages.length > 0) {
        console.log('\nIMAGES WITH RECIPE ID PATTERNS:');
        console.log('Filename'.padEnd(40) + 'Recipe ID'.padEnd(26) + 'Size (KB)'.padEnd(12) + 'Date');
        console.log('-'.repeat(85));
        
        recognizedImages
            .sort((a, b) => a.filename.localeCompare(b.filename))
            .forEach(img => {
                const date = new Date(img.lastModified).toISOString().split('T')[0];
                console.log(
                    img.filename.padEnd(40) +
                    img.recipeId.padEnd(26) +
                    img.sizeKB.toString().padEnd(12) +
                    date
                );
            });
        
        const totalSizeMB = Math.round(recognizedImages.reduce((sum, img) => sum + img.sizeKB, 0) / 1024 * 100) / 100;
        console.log(`\nTotal size: ${totalSizeMB} MB`);
    }
    
    if (unrecognizedImages.length > 0) {
        console.log('\nUNRECOGNIZED IMAGE NAMES:');
        console.log('Filename'.padEnd(40) + 'Size (KB)'.padEnd(12) + 'Date');
        console.log('-'.repeat(60));
        
        unrecognizedImages
            .sort((a, b) => a.filename.localeCompare(b.filename))
            .forEach(img => {
                const date = new Date(img.lastModified).toISOString().split('T')[0];
                console.log(
                    img.filename.padEnd(40) +
                    img.sizeKB.toString().padEnd(12) +
                    date
                );
            });
    }
    
    console.log('\nNEXT STEPS:');
    console.log('1. Review the recipe IDs above and manually verify which ones do not exist in the database');
    console.log('2. For a more automated approach, use MongoDB queries to check recipe existence');
    console.log('3. To get actual recipe IDs from database, check the admin panel or use MongoDB Compass');
    
    if (showCommands) {
        console.log('\nAWS CLI COMMANDS TO DELETE (REVIEW FIRST!):');
        console.log('# WARNING: These commands will permanently delete files!');
        console.log('# Only run after manually verifying which images are truly orphaned');
        console.log('');
        
        recognizedImages.forEach(img => {
            console.log(`aws s3 rm s3://${bucketName}/${img.filename}  # Recipe ID: ${img.recipeId}`);
        });
    }
    
    console.log('\n✅ Analysis complete!');
}

/**
 * Main function
 */
async function main() {
    const args = parseArgs();
    
    if (args.help) {
        showHelp();
        return;
    }
    
    console.log('Finding Orphaned Images');
    console.log('='.repeat(50));
    
    if (!args.bucket) {
        console.log(`⚠️  Using default bucket name: ${DEFAULT_BUCKET}`);
    }
    
    try {
        // Get recipe count from database
        const recipeCount = await getRecipeCount();
        
        // List S3 objects
        const s3Objects = listS3Objects(args.bucket);
        
        // Analyze images
        const { recognizedImages, unrecognizedImages } = analyzeImages(s3Objects);
        
        // Display results
        displayResults(s3Objects, recognizedImages, unrecognizedImages, recipeCount, args.showCommands, args.bucket);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Run the script
main().catch(error => {
    console.error(`❌ Unexpected error: ${error.message}`);
    process.exit(1);
});