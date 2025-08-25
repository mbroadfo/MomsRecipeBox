import AWS from 'aws-sdk';

const s3 = new AWS.S3();

export async function handler(event) {
  // Extract the recipe ID from the path parameters
  const { id } = event.pathParameters;
  
  // Parse the request body
  const body = JSON.parse(event.body);
  const { sourceKey, targetKey } = body;
  
  // Get bucket name from environment
  const bucketName = process.env.RECIPE_IMAGES_BUCKET;
  
  console.debug(`Copying image from ${sourceKey} to ${targetKey}`);

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
    
    // Delete the temporary image
    try {
      await s3.deleteObject({
        Bucket: bucketName,
        Key: sourceKey
      }).promise();
      console.debug(`Deleted temporary image with key: ${sourceKey}`);
    } catch (deleteErr) {
      console.warn(`Failed to delete temporary image: ${deleteErr.message}`);
      // Continue anyway, the copy was successful
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image copied successfully!',
        sourceKey,
        targetKey
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
