import AWS from 'aws-sdk';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import { Readable } from 'stream';
import url from 'url';

const s3 = new AWS.S3();

// For local development
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const LOCAL_IMAGES_DIR = path.join(__dirname, '..', 'local_images');

// Create the local images directory if it doesn't exist
if (!fs.existsSync(LOCAL_IMAGES_DIR)) {
  fs.mkdirSync(LOCAL_IMAGES_DIR, { recursive: true });
  console.log(`Created local images directory: ${LOCAL_IMAGES_DIR}`);
}

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
        console.log("Using raw request object for multipart parsing");
        form.parse(event.body, (err, fields, files) => {
          if (err) reject(err);
          console.log('Files received:', JSON.stringify(files, null, 2));
          resolve({ fields, files });
        });
      } else {
        // For Lambda - create a stream from the body string
        console.log("Using eventToStream for multipart parsing");
        const stream = eventToStream(event);
        const headers = { ...event.headers };
        if (!headers['content-length']) {
          headers['content-length'] = Buffer.byteLength(event.body || '') || 10 * 1024 * 1024;
        }
        form.parse(stream, headers, (err, fields, files) => {
          if (err) reject(err);
          console.log('Files received:', JSON.stringify(files, null, 2));
          resolve({ fields, files });
        });
      }
    });
    
    console.log('parsedData:', JSON.stringify(parsedData, null, 2));
    
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
    console.log('File object structure:', JSON.stringify(file, null, 2));
    
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
        console.log(`Created temporary file at ${tmpFilePath}`);
      } else {
        throw new Error('File path is missing and could not be created');
      }
    }

    // Calculate file size using fs.statSync
    const fileStats = fs.statSync(file.path);
    const fileSize = fileStats.size;
    console.log(`File size: ${fileSize} bytes`);

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
      console.error('Error reading file:', readError);
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
      console.log(`Determined content type ${contentType} from extension ${ext}`);
    }

    console.log(`Using content type: ${contentType} for upload`);
    
    // No image processing - preserve original format
    let processedBuffer = fileBuffer;
    let metadata;
    try {
      // Get image metadata just for informational purposes
      metadata = await sharp(fileBuffer).metadata();
      console.log(`Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
      
      // Set the file extension based on the detected format or content type
      if (metadata.format) {
        fileExtension = metadata.format.toLowerCase();
        console.log(`Using detected format for extension: ${fileExtension}`);
      } else if (contentType) {
        // Try to get extension from content type
        const formatFromContentType = contentType.split('/')[1];
        if (formatFromContentType) {
          fileExtension = formatFromContentType.split('+')[0]; // Handle cases like "image/svg+xml"
          console.log(`Using content type for extension: ${fileExtension}`);
        }
      }
      
      // Set the key with the proper extension
      key = `${id}.${fileExtension}`;
      console.log(`File will be stored with key: ${key}`);
      
      // No processing - use original file buffer
      console.log(`Using original image without processing: ${fileBuffer.length} bytes`);
      
    } catch (processingError) {
      console.error('Error analyzing image:', processingError.message);
      // Continue with original file
      console.log('Using original image without metadata');
    }

    // Always upload to S3, regardless of environment
    console.log(`Uploading to S3: bucket=${bucketName}, key=${key}, contentType=${contentType}`);
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
      
      console.log(`Successfully uploaded image to S3: ${bucketName}/${key}`);
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
      console.error('Error uploading to S3:', s3Error);
      throw s3Error; // Rethrow to be caught by the outer try/catch
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to upload image.', error: error.message }),
    };
  }
}
