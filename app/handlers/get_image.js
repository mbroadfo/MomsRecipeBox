import AWS from 'aws-sdk';
const s3 = new AWS.S3();

export async function handler(event) {
  console.log("GET IMAGE HANDLER CALLED");
  console.log("Event:", JSON.stringify(event, null, 2));
  const { id } = event.pathParameters;

  const bucketName = process.env.RECIPE_IMAGES_BUCKET;
  
  // Try common extensions, starting with png
  const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  let foundObject = null;
  let key = null;

  console.debug(`Attempting to fetch image for id: ${id} from bucket: ${bucketName}`);
  try {
    // Try each extension until we find a match
    for (const ext of extensions) {
      const testKey = `${id}.${ext}`;
      console.debug(`Trying key: ${testKey}`);
      
      try {
        const image = await s3.getObject({
          Bucket: bucketName,
          Key: testKey,
        }).promise();
        
        console.debug(`Found image with key: ${testKey}`);
        foundObject = image;
        key = testKey;
        break;
      } catch (error) {
        console.debug(`No image found with key: ${testKey}`);
        // Continue trying other extensions
      }
    }
    
    if (!foundObject) {
      throw new Error(`No image found for ID: ${id} with any of the tried extensions`);
    }
    
    const image = foundObject;

    // Log the original content type
    console.debug(`Image retrieved. Original Content-Type: ${image.ContentType}, Size: ${image.Body.length} bytes`);
    
    // Force image content type based on analysis of the image data
    // If it's application/octet-stream or undefined, determine from file signature or default to image/png
    let contentType = image.ContentType;
    
    // Check if we need to override the content type
    if (!contentType || contentType === 'application/octet-stream') {
      // Simple image detection based on first few bytes
      const buffer = image.Body;
      if (buffer.length >= 4) {
        // Check for PNG signature (89 50 4E 47)
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
          contentType = 'image/png';
        } 
        // Check for JPEG signature (FF D8 FF)
        else if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
          contentType = 'image/jpeg';
        } 
        // Check for GIF signature (47 49 46)
        else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
          contentType = 'image/gif';
        } 
        // Default to PNG if no match
        else {
          contentType = 'image/png';
        }
      } else {
        contentType = 'image/png'; // Default to PNG for small files
      }
    }
    
    console.debug(`Using Content-Type: ${contentType} for response`);

    // For local server testing, return raw binary data
    if (process.env.APP_MODE === 'local') {
      const response = {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${id}.${contentType.split('/')[1] || 'png'}"`,
          'Cache-Control': 'max-age=31536000',
        },
        body: image.Body,
        isBase64Encoded: false,
      };
      
      console.log("Returning raw binary image response with headers:", JSON.stringify(response.headers, null, 2));
      console.log("Response is binary with length:", response.body ? response.body.length : 0);
      return response;
    }
    
    // For Lambda deployment, we still need base64 encoding
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${id}.${contentType.split('/')[1] || 'png'}"`,
        'Cache-Control': 'max-age=31536000',
      },
      body: image.Body.toString('base64'),
      isBase64Encoded: true,
    };
    
    console.log("Returning image response with headers:", JSON.stringify(response.headers, null, 2));
    console.log("Response is Base64 encoded with length:", response.body ? response.body.length : 0);
    return response;
  } catch (error) {
    console.error(`Image not found for key: ${key}. Falling back to default image.`);
    console.debug(`Looking for default image with key: default.png in bucket: ${bucketName}`);

    try {
      const defaultImage = await s3.getObject({
        Bucket: bucketName,
        Key: 'default.png',
      }).promise();

      // Ensure we have a proper content type for the default image
      const contentType = defaultImage.ContentType || 'image/png';
      console.debug(`Default image retrieved. Content-Type: ${contentType}, Size: ${defaultImage.Body.length} bytes`);

      // For local server, return raw binary
      if (process.env.APP_MODE === 'local') {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': 'inline; filename="default.png"',
            'Cache-Control': 'max-age=31536000',
          },
          body: defaultImage.Body,
          isBase64Encoded: false,
        };
      }
      
      // For Lambda, use base64
      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': 'inline; filename="default.png"',
          'Cache-Control': 'max-age=31536000',
        },
        body: defaultImage.Body.toString('base64'),
        isBase64Encoded: true,
      };
    } catch (defaultError) {
      console.error(`Default image not found: ${defaultError.message}`);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Failed to fetch image.', error: defaultError.message }),
      };
    }
  }
}
