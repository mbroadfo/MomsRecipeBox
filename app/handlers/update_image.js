import AWS from 'aws-sdk';
import sharp from 'sharp';

const s3 = new AWS.S3();

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
  
  console.debug(`Updating image for id: ${id} with extension: ${extension}`);
  console.debug(`Content-Type: ${contentType}, Buffer length: ${buffer.length} bytes`);

  try {
    // For local development, don't resize the image
    if (process.env.APP_MODE === 'local') {
      console.debug('Local mode: Preserving original image without processing');
      await s3.putObject({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }).promise();
    } else {
      // For production, resize the image
      console.debug('Production mode: Resizing image before upload');
      const resizedBuffer = await sharp(buffer).resize({ width: 1280, height: 720, fit: 'inside' }).toBuffer();
      
      await s3.putObject({
        Bucket: bucketName,
        Key: key,
        Body: resizedBuffer,
        ContentType: contentType,
      }).promise();
    }
    
    // Try to delete the old image files with different extensions
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    for (const ext of extensions) {
      if (ext !== extension) { // Don't delete the one we're about to upload
        const oldKey = `${id}.${ext}`;
        try {
          await s3.deleteObject({
            Bucket: bucketName,
            Key: oldKey,
          }).promise();
          console.debug(`Deleted old image with key: ${oldKey}`);
        } catch (deleteError) {
          console.debug(`No old image found with key: ${oldKey} or deletion failed: ${deleteError.message}`);
        }
      }
    }
    
    // Try to delete the legacy path format
    try {
      const legacyKey = `${id}/image`;
      await s3.deleteObject({
        Bucket: bucketName,
        Key: legacyKey,
      }).promise();
      console.debug(`Deleted image with legacy key: ${legacyKey}`);
    } catch (legacyError) {
      console.debug(`No image found with legacy key or deletion failed: ${legacyError.message}`);
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
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to update image.', error: error.message }),
    };
  }
}
