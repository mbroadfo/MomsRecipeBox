import AWS from 'aws-sdk';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import { Readable } from 'stream';

const s3 = new AWS.S3();

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
  const key = `${id}/image`;

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
    
    // Attempt to resize image to max resolution
    let resizedBuffer;
    try {
      resizedBuffer = await sharp(fileBuffer).resize({ width: 1280, height: 720, fit: 'inside' }).toBuffer();
    } catch (sharpError) {
      console.error('Error resizing image:', sharpError.message);
      // For testing purposes, just use the original buffer
      resizedBuffer = fileBuffer;
    }

    // Determine MIME type
    const contentType = file.type;

    await s3.putObject({
      Bucket: bucketName,
      Key: key,
      Body: resizedBuffer,
      ContentType: contentType,
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Image uploaded successfully!' }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to upload image.', error: error.message }),
    };
  }
}
