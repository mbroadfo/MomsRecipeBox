#!/usr/bin/env node

/**
 * Script to convert all existing images in S3 to JPEG format
 * This ensures consistency since the backend already converts new uploads to JPEG
 */

import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { createLogger } from '../app/utils/logger.js';

const logger = createLogger('image-converter');

// Configure AWS
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-west-2' });
const bucketName = process.env.RECIPE_IMAGES_BUCKET || 'mrb-recipe-images-dev';

async function convertImageToJpeg(key) {
  try {
    logger.info(`Processing image: ${key}`);
    
    // Skip if already a .jpg file
    if (key.endsWith('.jpg')) {
      logger.info(`Skipping ${key} - already JPEG format`);
      return { skipped: true, reason: 'already-jpeg' };
    }
    
    // Get the original image from S3
    const getObjectResult = await s3.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    }));
    
    // Convert the stream to a buffer
    const originalBuffer = Buffer.from(await getObjectResult.Body.transformToByteArray());
    const originalSize = originalBuffer.length;
    
    // Convert to JPEG using the same logic as the backend
    const jpegBuffer = await sharp(originalBuffer)
      .resize(800, 600, { 
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    // Extract recipe ID from the filename (everything before the first dot)
    const recipeId = key.split('.')[0];
    const newKey = `${recipeId}.jpg`;
    
    // Upload the converted JPEG
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: newKey,
      Body: jpegBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        format: 'jpg',
        contentType: 'image/jpeg',
        size: String(jpegBuffer.length),
        convertedAt: new Date().toISOString(),
        originalFormat: key.split('.').pop(),
        originalSize: String(originalSize)
      }
    }));
    
    logger.info(`Successfully converted ${key} to ${newKey}`, {
      originalSize,
      newSize: jpegBuffer.length,
      compressionRatio: (originalSize / jpegBuffer.length).toFixed(2)
    });
    
    // Delete the original file if it's not the same as the new file
    if (key !== newKey) {
      await s3.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
      }));
      
      logger.info(`Deleted original file: ${key}`);
    }
    
    return { 
      converted: true, 
      originalKey: key, 
      newKey, 
      originalSize, 
      newSize: jpegBuffer.length 
    };
    
  } catch (error) {
    logger.error(`Failed to convert ${key}`, { error: error.message });
    return { error: error.message, key };
  }
}

async function listAllImages() {
  const allObjects = [];
  let continuationToken;
  
  do {
    const listParams = {
      Bucket: bucketName,
      MaxKeys: 1000
    };
    
    if (continuationToken) {
      listParams.ContinuationToken = continuationToken;
    }
    
    const result = await s3.send(new ListObjectsV2Command(listParams));
    
    if (result.Contents) {
      allObjects.push(...result.Contents);
    }
    
    continuationToken = result.NextContinuationToken;
  } while (continuationToken);
  
  return allObjects;
}

async function main() {
  try {
    logger.info(`Starting image conversion for bucket: ${bucketName}`);
    
    // List all objects in the bucket
    const objects = await listAllImages();
    
    if (objects.length === 0) {
      logger.info('No images found in bucket');
      return;
    }
    
    logger.info(`Found ${objects.length} objects in bucket`);
    
    // Filter for image files (exclude any non-image files)
    const imageFiles = objects.filter(obj => {
      const key = obj.Key.toLowerCase();
      return key.endsWith('.png') || 
             key.endsWith('.jpg') || 
             key.endsWith('.jpeg') || 
             key.endsWith('.webp') || 
             key.endsWith('.gif');
    });
    
    logger.info(`Found ${imageFiles.length} image files to process`);
    
    if (imageFiles.length === 0) {
      logger.info('No image files to convert');
      return;
    }
    
    // Process images in batches to avoid overwhelming S3
    const batchSize = 5;
    const results = {
      converted: 0,
      skipped: 0,
      errors: 0,
      totalOriginalSize: 0,
      totalNewSize: 0
    };
    
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize);
      logger.info(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(imageFiles.length/batchSize)}`);
      
      const batchPromises = batch.map(obj => convertImageToJpeg(obj.Key));
      const batchResults = await Promise.all(batchPromises);
      
      // Aggregate results
      batchResults.forEach(result => {
        if (result.error) {
          results.errors++;
        } else if (result.skipped) {
          results.skipped++;
        } else if (result.converted) {
          results.converted++;
          results.totalOriginalSize += result.originalSize;
          results.totalNewSize += result.newSize;
        }
      });
      
      // Small delay between batches
      if (i + batchSize < imageFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Summary
    logger.info('Image conversion completed', {
      totalFiles: imageFiles.length,
      converted: results.converted,
      skipped: results.skipped,
      errors: results.errors,
      totalSpaceSaved: results.totalOriginalSize - results.totalNewSize,
      compressionRatio: results.totalOriginalSize > 0 ? 
        (results.totalOriginalSize / results.totalNewSize).toFixed(2) : 'N/A'
    });
    
    if (results.errors > 0) {
      logger.warn(`${results.errors} files failed to convert. Check logs above for details.`);
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Script failed', { error: error.message });
    process.exit(1);
  }
}

// Run the script
main();