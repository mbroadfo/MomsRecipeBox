
import { ObjectId } from 'mongodb';
import { getDb } from '../app.js';
import AWS from 'aws-sdk';

const s3 = new AWS.S3();

const handler = async (event) => {
  try {
    const recipeId = event.pathParameters.id;
    const db = await getDb();
    const bucketName = process.env.RECIPE_IMAGES_BUCKET;

    // First, get the recipe to confirm it exists
    const recipe = await db.collection('recipes').findOne({ _id: new ObjectId(recipeId) });
    if (!recipe) {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ message: 'Recipe not found' }) 
      };
    }

    // Delete the recipe from MongoDB
    const result = await db.collection('recipes').deleteOne({ _id: new ObjectId(recipeId) });
    if (result.deletedCount === 0) {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ message: 'Recipe not found' }) 
      };
    }

    // Now delete the associated S3 image(s)
    // Try common extensions, similar to how delete_image.js works
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    let deletedImages = [];
    let imageErrors = [];

    for (const ext of extensions) {
      const key = `${recipeId}.${ext}`;
      
      try {
        await s3.deleteObject({
          Bucket: bucketName,
          Key: key,
        }).promise();
        
        deletedImages.push(key);
        console.log(`✅ Deleted S3 image: ${key}`);
      } catch (error) {
        // Image with this extension doesn't exist, which is normal
        if (error.code !== 'NoSuchKey') {
          imageErrors.push(`Failed to delete ${key}: ${error.message}`);
        }
      }
    }

    // Also try the legacy path format for backward compatibility
    try {
      const legacyKey = `${recipeId}/image`;
      await s3.deleteObject({
        Bucket: bucketName,
        Key: legacyKey,
      }).promise();
      deletedImages.push(legacyKey);
      console.log(`✅ Deleted legacy S3 image: ${legacyKey}`);
    } catch (error) {
      // Just continue if this fails
      if (error.code !== 'NoSuchKey') {
        imageErrors.push(`Failed to delete legacy image: ${error.message}`);
      }
    }

    // Log results
    if (deletedImages.length > 0) {
      console.log(`🧹 Recipe ${recipeId} deleted successfully with ${deletedImages.length} associated image(s)`);
    } else {
      console.log(`⚠️  Recipe ${recipeId} deleted but no associated images found in S3`);
    }

    if (imageErrors.length > 0) {
      console.warn(`⚠️  Some image deletion errors:`, imageErrors);
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        message: 'Recipe deleted successfully',
        deletedImages: deletedImages.length,
        imageErrors: imageErrors.length > 0 ? imageErrors : undefined
      })
    };
  } catch (err) {
    console.error('❌ Delete recipe error:', err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err.message }) 
    };
  }
};

export default handler;
