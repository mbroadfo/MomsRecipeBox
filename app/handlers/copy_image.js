import AWS from 'aws-sdk';
import { getDb } from '../app.js';
import { ObjectId } from 'mongodb';

const s3 = new AWS.S3();

export async function handler(event) {
  // Extract the recipe ID from the path parameters
  const { id } = event.pathParameters;
  
  // Parse the request body
  const body = JSON.parse(event.body);
  const { sourceKey, targetKey } = body;
  
  // Get bucket name from environment
  const bucketName = process.env.RECIPE_IMAGES_BUCKET;

  try {
    // Check if source object exists
    try {
      await s3.headObject({
        Bucket: bucketName,
        Key: sourceKey
      }).promise();
    } catch (headErr) {
      console.error(`Source image not found: ${sourceKey}`);
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: `Source image not found: ${sourceKey}`,
          error: headErr.message
        })
      };
    }
    
    // Copy the object
    await s3.copyObject({
      Bucket: bucketName,
      CopySource: `${bucketName}/${sourceKey}`,
      Key: targetKey,
      MetadataDirective: 'COPY' // Keep the same metadata
    }).promise();
    
    // Verify the copy was successful
    try {
      await s3.headObject({
        Bucket: bucketName,
        Key: targetKey
      }).promise();
      console.log(`Confirmed copied image exists in S3: ${targetKey}`);
      
      // After confirming successful copy, update MongoDB with the image URL
      try {
        const db = await getDb();
        
        // Construct the S3 URL
        const s3Url = `https://${bucketName}.s3.amazonaws.com/${targetKey}`;
        
        console.log(`Updating MongoDB with image URL: ${s3Url}`);
        
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
        
        // Update the recipe document with the image URL
        const updateResult = await db.collection('recipes').updateOne(
          { _id: documentId },
          { 
            $set: { 
              image_url: s3Url,
              imageMetadata: {
                s3Key: targetKey,
                s3Url: s3Url,
                updatedAt: new Date()
              }
            } 
          }
        );
        
        console.log(`MongoDB update result:`, updateResult);
        
        // Verify the update was successful
        const verifyDoc = await db.collection('recipes').findOne(
          { _id: id },
          { projection: { image_url: 1 } }
        );
        
        if (verifyDoc && verifyDoc.image_url === s3Url) {
          console.log(`Verified image_url is correctly set in MongoDB: ${verifyDoc.image_url}`);
        } else {
          console.warn(`MongoDB verification failed! Expected: ${s3Url}, Got: ${verifyDoc?.image_url || 'undefined'}`);
          
          // Try one more time with a different approach
          const lastAttempt = await db.collection('recipes').findOneAndUpdate(
            { _id: id },
            { $set: { image_url: s3Url } },
            { returnOriginal: false }
          );
          
          console.log('Final update attempt result:', lastAttempt.ok === 1 ? 'Success' : 'Failed');
        }
      } catch (dbError) {
        console.error(`Failed to update MongoDB: ${dbError.message}`);
        // Continue anyway, the image copy was successful
      }
    } catch (verifyErr) {
      console.error(`Failed to verify copied image: ${verifyErr.message}`);
      // Continue anyway to cleanup
    }
    
    // Delete the temporary image
    try {
      await s3.deleteObject({
        Bucket: bucketName,
        Key: sourceKey
      }).promise();
    } catch (deleteErr) {
      console.warn(`Failed to delete temporary image: ${deleteErr.message}`);
      // Continue anyway, the copy was successful
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image copied successfully!',
        sourceKey,
        targetKey,
        imageUrl: `https://${bucketName}.s3.amazonaws.com/${targetKey}`
      })
    };
  } catch (error) {
    console.error(`Error copying image: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to copy image.',
        error: error.message
      })
    };
  }
}
