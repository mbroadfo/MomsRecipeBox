import AWS from 'aws-sdk';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import { Readable } from 'stream';
import url from 'url';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('upload_image');

// Note: This handler is used for both uploading new images and updating existing ones via PUT method

const s3 = new AWS.S3();

// For compatibility with ES modules
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

function eventToStream(event) {
  return new Readable({
    read() {
      this.push(event.body);
      this.push(null);
    },
  });
}

export async function handler(event) {
  const { id } = event.pathParameters;

  const bucketName = process.env.RECIPE_IMAGES_BUCKET;
  // We'll determine the extension from the file content type instead of hardcoding to PNG
  let fileExtension = 'png'; // Default extension if we can't determine
  let key = `${id}.${fileExtension}`;

  try {
    // Determine if we're running locally with a raw request object
    const isRawRequest = typeof event.body === 'object' && event.body !== null && typeof event.body.on === 'function';
    
    // Parse the multipart/form-data request
    const form = new formidable.IncomingForm();

    // Process multipart data
    const parsedData = await new Promise((resolve, reject) => {
      if (isRawRequest) {
        // For local server - use the raw request object directly
        logger.debug("Using raw request object for multipart parsing", {}, event);
        form.parse(event.body, (err, fields, files) => {
          if (err) reject(err);
          logger.debug('Files received from raw request', { fileCount: Object.keys(files).length }, event);
          resolve({ fields, files });
        });
      } else {
        // For Lambda - create a stream from the body string
        logger.debug("Using eventToStream for multipart parsing", {}, event);
        const stream = eventToStream(event);
        const headers = { ...event.headers };
        if (!headers['content-length']) {
          headers['content-length'] = Buffer.byteLength(event.body || '') || 10 * 1024 * 1024;
        }
        form.parse(stream, headers, (err, fields, files) => {
          if (err) reject(err);
          logger.debug('Files received from stream', { fileCount: Object.keys(files).length }, event);
          resolve({ fields, files });
        });
      }
    });
    
    logger.debug('Multipart parsing completed', { 
      fieldCount: Object.keys(parsedData.fields || {}).length,
      fileCount: Object.keys(parsedData.files || {}).length 
    }, event);
    
    // Check if files object exists and has the expected structure
    if (!parsedData.files || typeof parsedData.files !== 'object') {
      throw new Error('No files received in the upload');
    }
    
    // Get the file, handling different possible structures
    let file;
    if (parsedData.files.file) {
      // Normal case where file is directly under files.file
      file = parsedData.files.file;
    } else {
      // Alternative case: check if it's the first file in files object
      const fileKeys = Object.keys(parsedData.files);
      if (fileKeys.length > 0) {
        file = parsedData.files[fileKeys[0]];
      }
    }
    
    if (!file) {
      throw new Error('No file uploaded');
    }
    
    // Check if file has path property
    logger.debug('File object received', { 
      fileName: file.originalFilename || file.name,
      fileSize: file.size,
      mimeType: file.mimetype || file.type
    }, event);
    
    if (!file.path) {
      // Try to find filepath in other properties
      if (file.filepath) {
        file.path = file.filepath;
      } else if (file.originalFilename) {
        // Create a temporary file
        const tmpDir = '/tmp';
        const tmpFilePath = path.join(tmpDir, file.originalFilename);
        fs.writeFileSync(tmpFilePath, file.buffer || Buffer.from(file.data || ''));
        file.path = tmpFilePath;
        logger.debug('Created temporary file', { tmpFilePath }, event);
      } else {
        throw new Error('File path is missing and could not be created');
      }
    }

    // Calculate file size using fs.statSync
    const fileStats = fs.statSync(file.path);
    const fileSize = fileStats.size;
    logger.debug('File size determined', { fileSize }, event);

    // Maximum allowed file size (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    
    // Get the file buffer, either from the file path or directly from the file object
    let fileBuffer;
    try {
      if (fs.existsSync(file.path)) {
        fileBuffer = fs.readFileSync(file.path);
      } else if (file.buffer) {
        fileBuffer = file.buffer;
      } else if (file.data) {
        fileBuffer = Buffer.from(file.data);
      } else {
        throw new Error('Could not read file content');
      }
    } catch (readError) {
      logger.warn('File read error, trying buffer fallback', readError, event);
      // If file can't be read from path, try to get the buffer directly
      if (file.buffer) {
        fileBuffer = file.buffer;
      } else if (file.data) {
        fileBuffer = Buffer.from(file.data);
      } else {
        throw new Error('Could not read file content');
      }
    }
    
    // Check file size limit
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: `Image is too large. Please reduce to under ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB.`,
          currentSize: `${(fileBuffer.length / (1024 * 1024)).toFixed(2)}MB`,
          maxSize: `${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(2)}MB`
        }),
      };
    }
    
    // Determine MIME type with fallback to detect from file extension or default to image/png
    let contentType = file.type;
    
    // If content type is missing or generic, try to determine from file name
    if (!contentType || contentType === 'application/octet-stream') {
      const fileName = file.originalFilename || file.name || 'image.png';
      const ext = path.extname(fileName).toLowerCase();
      
      // Map common extensions to MIME types
      const mimeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };
      
      contentType = mimeMap[ext] || 'image/png';
      logger.debug('Content type determined from extension', { contentType, extension: ext }, event);
    }

    logger.debug('Final content type for upload', { contentType }, event);
    
    // No image processing - preserve original format
    let processedBuffer = fileBuffer;
    let metadata;
    try {
      // Get image metadata just for informational purposes
      metadata = await sharp(fileBuffer).metadata();
      logger.debug('Image metadata analyzed', { 
        width: metadata.width, 
        height: metadata.height, 
        format: metadata.format 
      }, event);
      
      // Set the file extension based on the detected format or content type
      if (metadata.format) {
        fileExtension = metadata.format.toLowerCase();
        logger.debug('Using detected format for extension', { fileExtension }, event);
      } else if (contentType) {
        // Try to get extension from content type
        const formatFromContentType = contentType.split('/')[1];
        if (formatFromContentType) {
          fileExtension = formatFromContentType.split('+')[0]; // Handle cases like "image/svg+xml"
          logger.debug('Using content type for extension', { fileExtension }, event);
        }
      }
      
      // Set the key with the proper extension
      key = `${id}.${fileExtension}`;
      logger.debug('S3 storage key determined', { key }, event);
      
      // No processing - use original file buffer
      logger.debug('Using original image without processing', { bufferSize: fileBuffer.length }, event);
      
    } catch (processingError) {
      logger.warn('Image analysis failed, using original', processingError, event);
      // Continue with original file
      logger.debug('Using original image without metadata', {}, event);
    }

    // Always upload to S3, regardless of environment
    logger.info('Uploading image to S3', { bucketName, key, contentType }, event);
    try {
      await s3.putObject({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer, // Upload the original file without processing
        ContentType: contentType,
        CacheControl: 'max-age=31536000',
        Metadata: {
          'size': fileBuffer.length.toString(),
          'width': (metadata?.width || 0).toString(),
          'height': (metadata?.height || 0).toString(),
          'format': metadata?.format || 'unknown'
        }
      }).promise();
      
      logger.info('Image uploaded to S3 successfully', { bucketName, key }, event);
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Image uploaded successfully to S3!',
          bucket: bucketName,
          key: key,
          contentType: contentType,
          size: `${(fileBuffer.length / 1024).toFixed(2)}KB`
        }),
      };
    } catch (s3Error) {
      logger.error('S3 upload failed', s3Error, event);
      throw s3Error; // Rethrow to be caught by the outer try/catch
    }
  } catch (error) {
    logger.error('Image upload handler failed', error, event);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to upload image.', error: error.message }),
    };
  }
}
