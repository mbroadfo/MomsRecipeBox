import AWS from 'aws-sdk';
const s3 = new AWS.S3();

export async function handler(event) {
  const { id } = event.pathParameters;

  const bucketName = process.env.RECIPE_IMAGES_BUCKET;
  
  // Try common extensions, similar to how get_image.js works
  const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  let deletedAny = false;
  let lastError = null;

  try {
    console.debug(`Attempting to delete image for id: ${id} from bucket: ${bucketName}`);
    
    // Try to delete the image with each possible extension
    for (const ext of extensions) {
      const key = `${id}.${ext}`;
      console.debug(`Trying to delete key: ${key}`);
      
      try {
        await s3.deleteObject({
          Bucket: bucketName,
          Key: key,
        }).promise();
        
        console.debug(`Successfully deleted image with key: ${key}`);
        deletedAny = true;
        // Don't break - try to clean up any duplicates with different extensions
      } catch (error) {
        console.debug(`No image found with key: ${key} or deletion failed: ${error.message}`);
        lastError = error;
        // Continue trying other extensions
      }
    }
    
    // Also try the legacy path format for backward compatibility
    try {
      const legacyKey = `${id}/image`;
      console.debug(`Trying to delete legacy key: ${legacyKey}`);
      await s3.deleteObject({
        Bucket: bucketName,
        Key: legacyKey,
      }).promise();
      console.debug(`Successfully deleted image with legacy key: ${legacyKey}`);
      deletedAny = true;
    } catch (error) {
      console.debug(`No image found with legacy key or deletion failed: ${error.message}`);
      // Just continue if this fails
    }

    if (deletedAny) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Image deleted successfully!' }),
      };
    } else {
      // If we didn't delete any image, return a 404
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Image not found.' }),
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to delete image.', error: error.message }),
    };
  }
}
