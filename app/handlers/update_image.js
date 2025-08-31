import AWS from 'aws-sdk';
import sharp from 'sharp';
import { getDb } from '../app.js';
import { ObjectId } from 'mongodb';

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
  
  let buffer;
  let contentType;
  
  // Check if we're uploading from a URL or base64
  if (body.imageUrl) {
    // Handle image URL
    console.log(`Processing image from URL for recipe ${id}`);
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(body.imageUrl, { responseType: 'arraybuffer' });
      buffer = Buffer.from(response.data);
      contentType = response.headers['content-type'];
      
      console.log(`Downloaded image from URL: ${body.imageUrl}, size: ${buffer.length} bytes, type: ${contentType}`);
      
      // Validate that it's actually an image
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error('URL did not return a valid image');
      }
    } catch (error) {
      console.error(`Failed to download image from URL: ${error.message}`);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Failed to download image from URL', error: error.message }),
      };
    }
  } else if (body.imageBase64) {
    // Handle base64 image
    buffer = Buffer.from(body.imageBase64, 'base64');
    contentType = body.contentType;
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Either imageBase64 or imageUrl must be provided' }),
    };
  }
  
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
      // Construct the correct S3 URL for the image
      const s3Url = `https://${bucketName}.s3.amazonaws.com/${key}`;
      
      console.log(`Setting image_url to S3 URL: ${s3Url} for recipe ${id}`);
      
      const db = await getDb();
      
      // First verify the image exists in S3
      let imageConfirmed = false;
      let maxAttempts = 3;
      let attempt = 0;
      
      while (attempt < maxAttempts && !imageConfirmed) {
        attempt++;
        console.log(`S3 verification attempt ${attempt}/${maxAttempts}...`);
        
        try {
          // Wait between attempts
          if (attempt > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Check if the object exists in S3
          await s3.headObject({
            Bucket: bucketName,
            Key: key
          }).promise();
          
          console.log(`Confirmed image exists in S3: ${key}`);
          imageConfirmed = true;
        } catch (s3Error) {
          console.error(`S3 verification attempt ${attempt} failed: ${s3Error.message}`);
          
          if (attempt === maxAttempts) {
            console.error(`Failed to verify S3 object after ${maxAttempts} attempts`);
            // Continue anyway, but log the error
          }
        }
      }
      
      // Update the MongoDB document with the S3 URL
      // Try multiple times to ensure the update succeeds
      let dbUpdateSuccess = false;
      attempt = 0;
      
      while (attempt < maxAttempts && !dbUpdateSuccess) {
        attempt++;
        console.log(`MongoDB update attempt ${attempt}/${maxAttempts}...`);
        
        try {
          // Wait between attempts
          if (attempt > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Try to convert the ID to ObjectId if it's a valid ObjectId format
          let documentId;
          try {
            // Check if the ID is a valid MongoDB ObjectId
            if (ObjectId.isValid(id)) {
              documentId = new ObjectId(id);
              console.log(`Converted ID to ObjectId: ${id}`);
            } else {
              // If not a valid ObjectId, use as string
              documentId = id;
              console.log(`Using ID as string: ${id}`);
            }
          } catch (idErr) {
            console.log(`ID conversion error: ${idErr.message}. Using as string.`);
            documentId = id;
          }
          
          console.log(`Looking for recipe with _id: ${documentId}`);
          
          // First check if the document exists
          const docCheck = await db.collection('recipes').findOne({ _id: documentId });
          if (!docCheck) {
            console.error(`Recipe document not found with _id: ${documentId}`);
            
            // Try with string ID as fallback
            const stringIdCheck = await db.collection('recipes').findOne({ _id: id.toString() });
            if (stringIdCheck) {
              console.log(`Found recipe using string ID: ${id.toString()}`);
              documentId = id.toString();
            } else {
              throw new Error(`Recipe document not found with either ObjectId or string ID: ${id}`);
            }
          } else {
            console.log(`Found recipe document: ${docCheck._id}`);
          }
          
          const updateResult = await db.collection('recipes').updateOne(
            { _id: documentId }, 
            { 
              $set: { 
                imageMetadata: {
                  format: extension,
                  contentType: contentType,
                  size: buffer.length,
                  updatedAt: new Date(),
                  s3Key: key,
                  s3Url: s3Url  // Store the URL in the metadata as well
                },
                // Set image_url to the direct S3 URL
                image_url: s3Url
              }
            }
          );
          
          console.log(`MongoDB update attempt ${attempt} result:`, updateResult);
          
          if (updateResult.modifiedCount === 1) {
            console.log(`Successfully updated image metadata and URL in recipe ${id} document`);
            dbUpdateSuccess = true;
            
            // Verify the update actually persisted by reading it back
            const verifyDoc = await db.collection('recipes').findOne(
              { _id: id },
              { projection: { image_url: 1 } }
            );
            
            if (verifyDoc && verifyDoc.image_url === s3Url) {
              console.log(`Verified image_url is correctly set in MongoDB: ${verifyDoc.image_url}`);
            } else {
              console.warn(`Verification check failed - image_url not set correctly in MongoDB!`);
              console.warn(`Expected: ${s3Url}, Got: ${verifyDoc?.image_url || 'undefined'}`);
              
              // Try one more time with a different update approach
              if (attempt === maxAttempts) {
                console.log('Attempting final update with different approach...');
                
                const lastAttempt = await db.collection('recipes').findOneAndUpdate(
                  { _id: id },
                  { $set: { image_url: s3Url } },
                  { returnOriginal: false }
                );
                
                console.log('Final update result:', lastAttempt.ok === 1 ? 'Success' : 'Failed');
              }
            }
          } else {
            console.warn(`MongoDB update did not modify any documents! Result:`, updateResult);
            
            if (attempt === maxAttempts) {
              // Last attempt, try a different approach
              const checkDoc = await db.collection('recipes').findOne({ _id: id });
              if (!checkDoc) {
                console.error(`Recipe with ID ${id} not found in database!`);
              } else {
                console.log(`Recipe exists but update failed. Current image_url: ${checkDoc.image_url || 'null'}`);
                // Try a different update method
                const lastAttempt = await db.collection('recipes').findOneAndUpdate(
                  { _id: id },
                  { $set: { image_url: s3Url } },
                  { returnOriginal: false }
                );
                
                console.log('Alternative update approach result:', lastAttempt.ok === 1 ? 'Success' : 'Failed');
              }
            }
          }
        } catch (updateError) {
          console.error(`MongoDB update attempt ${attempt} failed: ${updateError.message}`);
          
          if (attempt === maxAttempts) {
            console.error(`Failed to update MongoDB after ${maxAttempts} attempts`);
            throw updateError; // Rethrow on final attempt
          }
        }
      }
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
