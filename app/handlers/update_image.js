import AWS from 'aws-sdk';
import sharp from 'sharp';
import { getDb } from '../app.js';
import { ObjectId } from 'mongodb';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('update_image');

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
      logger.debug('No old images found for recipe', { recipeId });
      return 0;
    }
    
    // Filter out the current file and collect keys to delete
    const keysToDelete = response.Contents
      .filter(obj => obj.Key !== newKey)
      .map(obj => ({ Key: obj.Key }));
    
    if (keysToDelete.length === 0) {
      logger.info('No old images to clean up for recipe', { recipeId });
      return 0;
    }
    
    // Delete multiple objects in a single request
    await s3.deleteObjects({
      Bucket: bucket,
      Delete: { Objects: keysToDelete }
    }).promise();
    
    logger.info('Cleaned up old image files for recipe', { 
      recipeId, 
      deletedCount: keysToDelete.length,
      deletedKeys: keysToDelete.map(k => k.Key)
    });
    return keysToDelete.length;
  } catch (error) {
    logger.error('Error cleaning up old images for recipe', { 
      recipeId, 
      error: error.message 
    });
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
    logger.info('Processing image from URL', { recipeId: id, imageUrl: body.imageUrl }, event);
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(body.imageUrl, { responseType: 'arraybuffer' });
      buffer = Buffer.from(response.data);
      contentType = response.headers['content-type'];
      
      logger.debug('Downloaded image from URL', { 
        imageUrl: body.imageUrl, 
        size: buffer.length, 
        contentType 
      }, event);
      
      // Validate that it's actually an image
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error('URL did not return a valid image');
      }
    } catch (error) {
      logger.error('Failed to download image from URL', { 
        imageUrl: body.imageUrl, 
        error: error.message 
      }, event);
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
  
  logger.info('Processing image upload for recipe', { 
    recipeId: id, 
    contentType, 
    size: buffer.length,
    extension,
    key
  }, event);

  try {
    // S3 requires all metadata values to be strings
    // Create metadata with all values explicitly converted to strings
    const s3Metadata = {
      format: String(extension),
      contentType: String(contentType),
      size: String(buffer.length),
      updatedAt: String(new Date().toISOString())
    };
    
    // Cloud-only: Always resize images for optimal performance
    logger.debug('Resizing image before upload', {}, event);

    // Process the image with Sharp for optimization
    const processedBuffer = await sharp(buffer)
      .resize(800, 600, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    await s3.putObject({
      Bucket: bucketName,
      Key: key,
      Body: processedBuffer,
      ContentType: 'image/jpeg', // Always convert to JPEG for consistency
      Metadata: s3Metadata,
    }).promise();
    
    // Efficiently clean up old images
    const deletedCount = await deleteOldImages(bucketName, id, key);

    // Store image metadata in the recipe document
    try {
      // Construct the correct S3 URL for the image
      const s3Url = `https://${bucketName}.s3.amazonaws.com/${key}`;
      
      logger.info('Setting image URL for recipe', { 
        recipeId: id, 
        s3Url, 
        key 
      }, event);
      
      const db = await getDb();
      
      // First verify the image exists in S3
      let imageConfirmed = false;
      let maxAttempts = 3;
      let attempt = 0;
      
      while (attempt < maxAttempts && !imageConfirmed) {
        attempt++;
        logger.debug('S3 verification attempt', { 
          attempt, 
          maxAttempts 
        }, event);
        
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
          
          logger.info('Confirmed image exists in S3', { key }, event);
          imageConfirmed = true;
        } catch (s3Error) {
          logger.warn('S3 verification attempt failed', { 
            attempt, 
            error: s3Error.message 
          }, event);
          
          if (attempt === maxAttempts) {
            logger.error('Failed to verify S3 object after all attempts', { 
              maxAttempts 
            }, event);
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
        logger.debug('MongoDB update attempt', { 
          attempt, 
          maxAttempts 
        }, event);
        
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
              logger.debug('Converted ID to ObjectId', { id }, event);
            } else {
              // If not a valid ObjectId, use as string
              documentId = id;
              logger.debug('Using ID as string', { id }, event);
            }
          } catch (idErr) {
            logger.debug('ID conversion error, using as string', { 
              error: idErr.message 
            }, event);
            documentId = id;
          }
          
          logger.debug('Looking for recipe with ID', { documentId }, event);
          
          // First check if the document exists
          const docCheck = await db.collection('recipes').findOne({ _id: documentId });
          if (!docCheck) {
            logger.warn('Recipe document not found with ID', { documentId }, event);
            
            // Try with string ID as fallback
            const stringIdCheck = await db.collection('recipes').findOne({ _id: id.toString() });
            if (stringIdCheck) {
              logger.debug('Found recipe using string ID', { 
                stringId: id.toString() 
              }, event);
              documentId = id.toString();
            } else {
              throw new Error(`Recipe document not found with either ObjectId or string ID: ${id}`);
            }
          } else {
            logger.debug('Found recipe document', { 
              recipeId: docCheck._id 
            }, event);
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
          
          logger.debug('MongoDB update attempt result', { 
            attempt, 
            updateResult 
          }, event);
          
          if (updateResult.modifiedCount === 1) {
            logger.info('Successfully updated image metadata and URL in recipe document', { 
              recipeId: id 
            }, event);
            dbUpdateSuccess = true;
            
            // Verify the update actually persisted by reading it back
            const verifyDoc = await db.collection('recipes').findOne(
              { _id: id },
              { projection: { image_url: 1 } }
            );
            
            if (verifyDoc && verifyDoc.image_url === s3Url) {
              logger.debug('Verified image URL is correctly set in MongoDB', { 
                imageUrl: verifyDoc.image_url 
              }, event);
            } else {
              logger.warn('Verification check failed - image URL not set correctly in MongoDB', { 
                expected: s3Url, 
                actual: verifyDoc?.image_url || 'undefined' 
              }, event);
              
              // Try one more time with a different update approach
              if (attempt === maxAttempts) {
                logger.debug('Attempting final update with different approach', {}, event);
                
                const lastAttempt = await db.collection('recipes').findOneAndUpdate(
                  { _id: id },
                  { $set: { image_url: s3Url } },
                  { returnOriginal: false }
                );
                
                logger.debug('Final update result', { 
                  success: lastAttempt.ok === 1 
                }, event);
              }
            }
          } else {
            logger.warn('MongoDB update did not modify any documents', { 
              updateResult 
            }, event);
            
            if (attempt === maxAttempts) {
              // Last attempt, try a different approach
              const checkDoc = await db.collection('recipes').findOne({ _id: id });
              if (!checkDoc) {
                logger.error('Recipe not found in database', { 
                  recipeId: id 
                }, event);
              } else {
                logger.debug('Recipe exists but update failed', { 
                  currentImageUrl: checkDoc.image_url || 'null' 
                }, event);
                // Try a different update method
                const lastAttempt = await db.collection('recipes').findOneAndUpdate(
                  { _id: id },
                  { $set: { image_url: s3Url } },
                  { returnOriginal: false }
                );
                
                logger.debug('Alternative update approach result', { 
                  success: lastAttempt.ok === 1 
                }, event);
              }
            }
          }
        } catch (updateError) {
          logger.error('MongoDB update attempt failed', { 
            attempt, 
            error: updateError.message 
          }, event);
          
          if (attempt === maxAttempts) {
            logger.error('Failed to update MongoDB after all attempts', { 
              maxAttempts 
            }, event);
            throw updateError; // Rethrow on final attempt
          }
        }
      }
    } catch (dbError) {
      logger.error('Failed to update image metadata in database', { 
        error: dbError.message 
      }, event);
      // Continue anyway since the image was uploaded successfully
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Image updated successfully!',
        key: key,
        contentType: contentType
      })
    };
  } catch (error) {
    logger.error('Failed to process image for recipe', { 
      recipeId: id, 
      error: error.message 
    }, event);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to update image.', error: error.message }),
    };
  }
}
