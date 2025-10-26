/**
 * Find orphaned images - simplified version for container execution
 * This script can be run inside the Docker container where dependencies are available
 */

const AWS = require('aws-sdk');
const { MongoClient } = require('mongodb');

const s3 = new AWS.S3();

// MongoDB connection
const getMongoUri = () => {
  if (process.env.MONGODB_MODE === 'atlas') {
    return process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI;
  } else {
    return process.env.MONGODB_LOCAL_URI || process.env.MONGODB_URI;
  }
};

async function findOrphanImages() {
  let mongoClient = null;
  
  try {
    console.log('🔍 Finding orphaned images...\n');
    
    // 1. Connect to MongoDB and get all recipe IDs
    console.log('📊 Connecting to MongoDB...');
    const mongoUri = getMongoUri();
    if (!mongoUri) {
      throw new Error('MongoDB URI not configured');
    }
    
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    const db = mongoClient.db(process.env.MONGODB_DB_NAME || 'moms_recipe_box_dev');
    const recipesCollection = db.collection('recipes');
    
    // Get all recipe IDs from the database
    const recipes = await recipesCollection.find({}, { projection: { _id: 1 } }).toArray();
    const recipeIds = new Set(recipes.map(recipe => recipe._id.toString()));
    
    console.log(`✅ Found ${recipeIds.size} recipes in database`);
    console.log(`   Sample Recipe IDs: ${Array.from(recipeIds).slice(0, 3).join(', ')}...\n`);
    
    // 2. List all images in S3 bucket
    console.log('🖼️  Listing images in S3 bucket...');
    const bucketName = process.env.RECIPE_IMAGES_BUCKET;
    if (!bucketName) {
      throw new Error('RECIPE_IMAGES_BUCKET environment variable not set');
    }
    
    let allImages = [];
    let continuationToken = null;
    
    do {
      const params = {
        Bucket: bucketName,
        MaxKeys: 1000
      };
      
      if (continuationToken) {
        params.ContinuationToken = continuationToken;
      }
      
      const result = await s3.listObjectsV2(params).promise();
      allImages = allImages.concat(result.Contents || []);
      continuationToken = result.NextContinuationToken;
    } while (continuationToken);
    
    console.log(`✅ Found ${allImages.length} images in S3 bucket\n`);
    console.log(`   Sample filenames: ${allImages.slice(0, 3).map(img => img.Key).join(', ')}...\n`);
    
    // 3. Analyze image filenames and find orphans
    console.log('🔍 Analyzing image filenames...');
    
    const orphanedImages = [];
    const validImages = [];
    const unrecognizedImages = [];
    
    allImages.forEach(image => {
      const filename = image.Key;
      
      // Extract potential recipe ID from filename (24-character MongoDB ObjectId)
      const patterns = [
        /^([a-f0-9]{24})\.jpg$/i,           // recipeId.jpg
        /^([a-f0-9]{24})\.jpeg$/i,          // recipeId.jpeg
        /^([a-f0-9]{24})\.png$/i,           // recipeId.png
        /^([a-f0-9]{24})_\d+\.jpg$/i,       // recipeId_1.jpg, recipeId_2.jpg
        /^([a-f0-9]{24})_\d+\.jpeg$/i,      // recipeId_1.jpeg
        /^([a-f0-9]{24})_\d+\.png$/i,       // recipeId_1.png
        /^([a-f0-9]{24})-thumb\.jpg$/i,     // recipeId-thumb.jpg
        /^([a-f0-9]{24})-thumb\.jpeg$/i,    // recipeId-thumb.jpeg
        /^([a-f0-9]{24})-thumb\.png$/i,     // recipeId-thumb.png
        /^([a-f0-9]{24})-small\.jpg$/i,     // recipeId-small.jpg
        /^([a-f0-9]{24})-medium\.jpg$/i,    // recipeId-medium.jpg
        /^([a-f0-9]{24})-large\.jpg$/i      // recipeId-large.jpg
      ];
      
      let recipeId = null;
      
      for (const pattern of patterns) {
        const match = filename.match(pattern);
        if (match) {
          recipeId = match[1];
          break;
        }
      }
      
      if (recipeId) {
        if (recipeIds.has(recipeId)) {
          validImages.push({
            filename,
            recipeId,
            size: image.Size,
            lastModified: image.LastModified
          });
        } else {
          orphanedImages.push({
            filename,
            recipeId,
            size: image.Size,
            lastModified: image.LastModified,
            reason: 'Recipe ID not found in database'
          });
        }
      } else {
        unrecognizedImages.push({
          filename,
          size: image.Size,
          lastModified: image.LastModified,
          reason: 'Filename does not match recipe ID pattern'
        });
      }
    });
    
    // 4. Report results
    console.log('\n📊 ANALYSIS RESULTS');
    console.log('='.repeat(50));
    console.log(`Total images in S3: ${allImages.length}`);
    console.log(`Valid images (linked to recipes): ${validImages.length}`);
    console.log(`Orphaned images (recipe not found): ${orphanedImages.length}`);
    console.log(`Unrecognized images (bad filename): ${unrecognizedImages.length}`);
    
    if (orphanedImages.length > 0) {
      console.log('\n🗑️  ORPHANED IMAGES (Safe to delete):');
      console.log('-'.repeat(70));
      orphanedImages.forEach(image => {
        const sizeKB = Math.round(image.size / 1024);
        const date = image.lastModified.toISOString().split('T')[0];
        console.log(`${image.filename.padEnd(35)} | ${sizeKB.toString().padStart(6)} KB | ${date} | Recipe: ${image.recipeId}`);
      });
      
      const totalOrphanedSize = orphanedImages.reduce((sum, img) => sum + img.size, 0);
      const totalOrphanedMB = Math.round(totalOrphanedSize / (1024 * 1024) * 100) / 100;
      console.log(`\nTotal orphaned size: ${totalOrphanedMB} MB`);
    }
    
    if (unrecognizedImages.length > 0) {
      console.log('\n❓ UNRECOGNIZED IMAGES (Manual review needed):');
      console.log('-'.repeat(70));
      unrecognizedImages.forEach(image => {
        const sizeKB = Math.round(image.size / 1024);
        const date = image.lastModified.toISOString().split('T')[0];
        console.log(`${image.filename.padEnd(35)} | ${sizeKB.toString().padStart(6)} KB | ${date} | ${image.reason}`);
      });
    }
    
    console.log('\n✅ Analysis complete!');
    
    return {
      totalImages: allImages.length,
      validImages: validImages.length,
      orphanedImages: orphanedImages.length,
      unrecognizedImages: unrecognizedImages.length,
      orphanedList: orphanedImages.map(img => img.filename)
    };
    
  } catch (error) {
    console.error('❌ Error finding orphaned images:', error);
    throw error;
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

// Export for use as module or run directly
if (require.main === module) {
  findOrphanImages().catch(console.error);
} else {
  module.exports = { findOrphanImages };
}