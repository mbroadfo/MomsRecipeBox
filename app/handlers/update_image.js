import AWS from 'aws-sdk';
import sharp from 'sharp';
import { getDb } from '../app.js';

const s3 = new AWS.S3();

// Helper function to efficiently clean up old images
async function deleteOldImages(bucket, recipeId, newKey) {
  try {
    // First list objects with the recipe ID prefix
    const response = await s3.listObjects({
      Bucket: bucket,
      Prefix: recipeId
    }).promise();
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log(`No old images found for recipe ${recipeId}`);
      return 0;
    }
    
    // Filter out the current file and collect keys to delete
    const keysToDelete = response.Contents
      .filter(obj => obj.Key !== newKey)
      .map(obj => ({ Key: obj.Key }));
    
    if (keysToDelete.length === 0) {
      console.log(`No old images to clean up for recipe ${recipeId}`);
      return 0;
    }
    
    // Delete multiple objects in a single request
    await s3.deleteObjects({
      Bucket: bucket,
      Delete: { Objects: keysToDelete }
    }).promise();
    
    console.log(`Cleaned up ${keysToDelete.length} old image files for recipe ${recipeId}`);
    return keysToDelete.length;
  } catch (error) {
    console.error(`Error cleaning up old images for recipe ${recipeId}:`, error.message);
    return 0;
  }
}

export async function handler(event) {
  const { id } = event.pathParameters;
  const body = JSON.parse(event.body);
  const { imageBase64, contentType } = body;

  const buffer = Buffer.from(imageBase64, 'base64');
  const bucketName = process.env.RECIPE_IMAGES_BUCKET;
  
  // Determine file extension based on content type
  const extensionMap = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  
  const extension = extensionMap[contentType] || 'png';
  const key = `${id}.${extension}`;
  
  console.log(`Processing image upload for recipe ${id}: ${contentType}, ${buffer.length} bytes`);

  try {
    // S3 requires all metadata values to be strings
    // Create metadata with all values explicitly converted to strings
    const s3Metadata = {
      format: String(extension),
      contentType: String(contentType),
      size: String(buffer.length),
      updatedAt: String(new Date().toISOString())
    };
    
    // For local development, don't resize the image
    if (process.env.APP_MODE === 'local') {
      console.log('Local mode: Uploading original image without processing');
      await s3.putObject({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: s3Metadata,
      }).promise();
    } else {
      // For production, resize the image
      console.log('Production mode: Resizing image before upload');
      const resizedBuffer = await sharp(buffer).resize({ width: 1280, height: 720, fit: 'inside' }).toBuffer();
      
      await s3.putObject({
        Bucket: bucketName,
        Key: key,
        Body: resizedBuffer,
        ContentType: contentType,
        Metadata: s3Metadata,
      }).promise();
    }
    
    // Efficiently clean up old images
    const deletedCount = await deleteOldImages(bucketName, id, key);

    // Store image metadata in the recipe document
    try {
      const db = await getDb();
      await db.collection('recipes').updateOne(
        { _id: id }, 
        { 
          $set: { 
            imageMetadata: {
              format: extension,
              contentType: contentType,
              size: buffer.length, // MongoDB can handle numbers in documents
              updatedAt: new Date()
            }
          }
        }
      );
      console.log(`Updated image metadata in recipe ${id} document`);
    } catch (dbError) {
      console.error(`Failed to update image metadata in database: ${dbError.message}`);
      // Continue anyway since the image was uploaded successfully
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Image updated successfully!',
        key: key,
        contentType: contentType
      }),
    };
  } catch (error) {
    console.error(`Failed to process image for ${id}: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to update image.', error: error.message }),
    };
  }
}
