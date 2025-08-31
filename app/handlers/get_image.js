import AWS from 'aws-sdk';
import { getDb } from '../app.js';
const s3 = new AWS.S3();

export async function handler(event) {
  const { id } = event.pathParameters;
  const bucketName = process.env.RECIPE_IMAGES_BUCKET;
  
  let foundObject = null;
  let key = null;
  let format = null;

  try {
    // First, try to get format info and image_url from the recipe document
    try {
      const db = await getDb();
      const recipe = await db.collection('recipes').findOne(
        { _id: id },
        { projection: { imageMetadata: 1, image_url: 1 } }
      );
      
      // Check if we have a direct S3 URL
      if (recipe && recipe.image_url && recipe.image_url.startsWith('https://') && recipe.image_url.includes('s3.amazonaws.com')) {
        console.log(`Found direct S3 URL: ${recipe.image_url}`);
        
        // Redirect to the S3 URL
        return {
          statusCode: 302,
          headers: {
            'Location': recipe.image_url,
            'Cache-Control': 'max-age=31536000'
          },
          body: ''
        };
      }
      
      if (recipe && recipe.imageMetadata && recipe.imageMetadata.format) {
        format = recipe.imageMetadata.format;
        console.log(`Found image format in recipe metadata: ${format}`);
      }
    } catch (dbError) {
      console.log(`Could not retrieve image format from database: ${dbError.message}`);
      // Continue without metadata
    }
    
    // If we found format in metadata, try that first
    if (format) {
      key = `${id}.${format}`;
      try {
        foundObject = await s3.getObject({
          Bucket: bucketName,
          Key: key,
        }).promise();
        console.log(`Successfully retrieved image with key: ${key}`);
      } catch (error) {
        console.log(`Image not found with metadata-provided key ${key}, will try other formats`);
        format = null; // Reset to try other formats
      }
    }
    
    // If no format from metadata or that key didn't work, try common extensions
    if (!foundObject) {
      const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      for (const ext of extensions) {
        const testKey = `${id}.${ext}`;
        
        try {
          const image = await s3.getObject({
            Bucket: bucketName,
            Key: testKey,
          }).promise();
          
          foundObject = image;
          key = testKey;
          console.log(`Found image with key: ${testKey}`);
          break;
        } catch (error) {
          // Continue trying other extensions
        }
      }
    }
    
    if (!foundObject) {
      throw new Error(`No image found for ID: ${id}`);
    }
    
    const image = foundObject;
    
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

    // For local server testing, return raw binary data
    if (process.env.APP_MODE === 'local') {
      const response = {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${id}.${contentType.split('/')[1] || 'png'}"`,
          'Cache-Control': 'max-age=31536000',
          'Access-Control-Allow-Origin': '*', // Allow cross-origin requests
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: image.Body,
        isBase64Encoded: false,
      };
      
      console.log(`Returning image for ${id} (${image.Body.length} bytes)`);
      return response;
    }
    
    // For Lambda deployment, we still need base64 encoding
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${id}.${contentType.split('/')[1] || 'png'}"`,
        'Cache-Control': 'max-age=31536000',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: image.Body.toString('base64'),
      isBase64Encoded: true,
    };
    
    console.log(`Returning base64 encoded image for ${id} (${image.Body.length} bytes)`);
    return response;
  } catch (error) {
    console.log(`Image not found for recipe ${id}, falling back to default image`);

    try {
      const defaultImage = await s3.getObject({
        Bucket: bucketName,
        Key: 'default.png',
      }).promise();

      // Ensure we have a proper content type for the default image
      const contentType = defaultImage.ContentType || 'image/png';

      // For local server, return raw binary
      if (process.env.APP_MODE === 'local') {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': 'inline; filename="default.png"',
            'Cache-Control': 'max-age=31536000',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
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
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: defaultImage.Body.toString('base64'),
        isBase64Encoded: true,
      };
    } catch (defaultError) {
      console.error(`Default image not found: ${defaultError.message}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          message: 'Image not found and default image unavailable',
          recipeId: id
        }),
      };
    }
  }
}
