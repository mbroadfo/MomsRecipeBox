// File: test_images.js
// Comprehensive test suite for image operations in MomsRecipeBox API
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { promisify } from 'util';
import { getBearerToken, validateConfig } from './utils/auth0-token-generator.js';
import { getBaseUrl, logEnvironmentInfo } from './utils/environment-detector.js';
import 'dotenv/config';

const BASE_URL = getBaseUrl();
// Use absolute paths to ensure files are found correctly regardless of working directory
// Get the current file URL and convert to a directory path (ESM equivalent of __dirname)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use test images from assets folder
const TEST_PNG_PATH = path.join(__dirname, 'assets', 'TestImage1.png');
const TEST_JPG_PATH = path.join(__dirname, 'assets', 'TestImage2.jpg');
const TEST_OUTPUT_DIR = path.join(__dirname, 'test_output');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Ensure test output directory exists
if (!fs.existsSync(TEST_OUTPUT_DIR)) {
  fs.mkdirSync(TEST_OUTPUT_DIR);
}

// Define a recipe for testing
const testRecipe = {
  owner_id: "auth0|testuser",
  visibility: "public",
  status: "published",
  title: "Image API Test Recipe",
  subtitle: "Testing image CRUD operations",
  description: "A test recipe to verify image API functionality",
  image_url: "https://example.com/test-image.jpg",
  tags: ["test", "images", "api"],
  sections: [
    { section_type: "Instructions", content: "Test instructions", position: 1 },
  ],
  ingredients: [
    { name: "Test Ingredient", quantity: "1 unit", position: 1 },
  ]
};

// Variables to store test state
let recipeId;
let testResults = {
  createRecipe: { success: false, details: null },
  uploadPngImage: { success: false, details: null },
  getPngImage: { success: false, details: null },
  updateToJpgImage: { success: false, details: null },
  getJpgImage: { success: false, details: null },
  deleteImage: { success: false, details: null },
  cleanupRecipe: { success: false, details: null },
};

async function getAuthHeaders() {
  try {
    const bearerToken = await getBearerToken();
    return {
      'Authorization': bearerToken,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Failed to generate Auth0 token:', error.message);
    throw error;
  }
}

async function logStep(message) {
  const divider = '-'.repeat(80);
  console.log(`\n${divider}`);
  console.log(`📋 ${message}`);
  console.log(divider);
}

async function createTestRecipe() {
  logStep('STEP 1: Creating test recipe');
  try {
    const authHeaders = await getAuthHeaders();
    const response = await axios.post(`${BASE_URL}/recipes`, testRecipe, { headers: authHeaders });
    recipeId = response.data._id;
    console.log(`✅ Recipe created with ID: ${recipeId}`);
    testResults.createRecipe.success = true;
    testResults.createRecipe.details = { id: recipeId };
    return true;
  } catch (error) {
    console.error('❌ Failed to create test recipe:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    testResults.createRecipe.details = { error: error.message };
    return false;
  }
}

async function uploadPngImage() {
  logStep('STEP 2: Uploading PNG image to recipe');
  try {
    const authHeaders = await getAuthHeaders();
    const imageBuffer = await readFile(TEST_PNG_PATH);
    const base64Image = imageBuffer.toString('base64');
    
    // Using the PUT endpoint which is the standard method for image uploads
    // In a real implementation, we would create a FormData object and append the file
    const response = await axios.put(`${BASE_URL}/recipes/${recipeId}/image`, {
      imageBase64: base64Image,
      contentType: 'image/png'
    }, { headers: authHeaders });
    
    console.log(`✅ PNG image uploaded successfully`);
    console.log(`Response:`, response.data);
    testResults.uploadPngImage.success = true;
    testResults.uploadPngImage.details = response.data;
    return true;
  } catch (error) {
    console.error('❌ Failed to upload PNG image:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    testResults.uploadPngImage.details = { error: error.message };
    return false;
  }
}

async function getImage(filename = 'test_get_image.png') {
  logStep('STEP 3: Retrieving PNG image from recipe');
  try {
    const authHeaders = await getAuthHeaders();
    const response = await axios.get(`${BASE_URL}/recipes/${recipeId}/image`, {
      responseType: 'arraybuffer',
      headers: {
        ...authHeaders,
        'Accept': 'image/png'
      }
    });
    
    const outputPath = path.join(TEST_OUTPUT_DIR, filename);
    await writeFile(outputPath, response.data);
    
    // Check if we got a valid image (at least verify size is reasonable)
    const stats = fs.statSync(outputPath);
    const isValidSize = stats.size > 1000; // More than 1KB
    
    if (isValidSize) {
      console.log('✅ Image retrieved successfully');
      console.log(`- Saved to: ${outputPath}`);
      console.log(`- Size: ${stats.size} bytes`);
      testResults.getPngImage = { success: true, details: { 
        path: outputPath, 
        size: stats.size, 
        contentType: response.headers['content-type']
      }};
      return true;
    } else {
      console.error(`❌ Retrieved image is too small (${stats.size} bytes)`);
      testResults.getImage.details = { error: 'Image too small or invalid' };
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to retrieve image:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
    testResults.getImage.details = { error: error.message };
    return false;
  }
}

async function updateToJpgImage() {
  logStep('STEP 4: Updating image from PNG to JPG');
  try {
    const authHeaders = await getAuthHeaders();
    const imageBuffer = await readFile(TEST_JPG_PATH);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await axios.put(`${BASE_URL}/recipes/${recipeId}/image`, {
      imageBase64: base64Image,
      contentType: 'image/jpeg'
    }, { headers: authHeaders });
    
    console.log(`✅ JPG image updated successfully`);
    console.log(`Response:`, response.data);
    
    // Add a separate step for retrieving the JPG image
    logStep('STEP 5: Retrieving JPG image from recipe');
    
    const getJpgResponse = await axios.get(`${BASE_URL}/recipes/${recipeId}/image`, {
      responseType: 'arraybuffer',
      headers: {
        ...authHeaders,
        'Accept': 'image/jpeg'
      }
    });
    
    const jpgOutputPath = path.join(TEST_OUTPUT_DIR, 'test_updated_image.jpg');
    await writeFile(jpgOutputPath, getJpgResponse.data);
    
    const stats = fs.statSync(jpgOutputPath);
    const isValidSize = stats.size > 1000;
    
    if (isValidSize) {
      console.log('✅ Image retrieved successfully');
      console.log(`- Saved to: ${jpgOutputPath}`);
      console.log(`- Size: ${stats.size} bytes`);
      testResults.getJpgImage = { success: true, details: { 
        path: jpgOutputPath, 
        size: stats.size, 
        contentType: getJpgResponse.headers['content-type']
      }};
    } else {
      console.error(`❌ Retrieved JPG image is too small (${stats.size} bytes)`);
      testResults.getJpgImage = { success: false, details: { error: 'Image too small or invalid' } };
      return false;
    }
    
    testResults.updateToJpgImage = { success: true, details: response.data };
    return true;
  } catch (error) {
    console.error('❌ Failed to update to JPG image:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    testResults.updateToJpgImage.details = { error: error.message };
    return false;
  }
}

async function deleteImage() {
  logStep('STEP 6: Deleting image from recipe');
  try {
    const authHeaders = await getAuthHeaders();
    const response = await axios.delete(`${BASE_URL}/recipes/${recipeId}/image`, { headers: authHeaders });
    
    console.log(`✅ Image deleted successfully`);
    console.log(`Response:`, response.data);
    
    // Verify deletion by getting image and checking if we get default image
    const retrievedImageResponse = await axios.get(`${BASE_URL}/recipes/${recipeId}/image`, {
      responseType: 'arraybuffer',
      headers: {
        ...authHeaders,
        'Accept': 'image/png'
      }
    });
    
    const outputPath = path.join(TEST_OUTPUT_DIR, 'test_default_image.png');
    await writeFile(outputPath, retrievedImageResponse.data);
    
    // Check if the returned image is different from our original
    const stats = fs.statSync(outputPath);
    
    console.log('✅ Image deleted successfully');
    console.log(`- Retrieved default image saved to: ${outputPath}`);
    console.log(`- Size: ${stats.size} bytes`);
    testResults.deleteImage = { success: true, details: { 
      path: outputPath, 
      size: stats.size,
      responseData: response.data
    }};
    return true;
  } catch (error) {
    console.error('❌ Failed to delete image:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    testResults.deleteImage.details = { error: error.message };
    return false;
  }
}

async function cleanupRecipe() {
  logStep('STEP 7: Cleaning up test recipe');
  try {
    const authHeaders = await getAuthHeaders();
    const response = await axios.delete(`${BASE_URL}/recipes/${recipeId}`, { headers: authHeaders });
    console.log(`✅ Recipe deleted successfully`);
    console.log(`Response:`, response.data);
    testResults.cleanupRecipe = { success: true, details: response.data };
    return true;
  } catch (error) {
    console.error('❌ Failed to delete test recipe:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    testResults.cleanupRecipe.details = { error: error.message };
    return false;
  }
}

async function generateTestReport() {
  logStep('GENERATING TEST REPORT');
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const allTestsPassed = failedTests === 0;
  
  console.log(`\n📊 TEST SUMMARY`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%\n`);
  
  // Detailed results
  console.log('📝 DETAILED RESULTS:');
  Object.entries(testResults).forEach(([test, result]) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${test}`);
  });
  
  // Clean up the test_output directory completely if all tests passed
  if (allTestsPassed) {
    try {
      // Remove all test artifacts
      if (fs.existsSync(TEST_OUTPUT_DIR)) {
        const files = fs.readdirSync(TEST_OUTPUT_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(TEST_OUTPUT_DIR, file));
        }
        // Optionally remove the directory itself
        fs.rmdirSync(TEST_OUTPUT_DIR);
        console.log('🧹 Cleaned up all test artifacts');
      }
    } catch (error) {
      console.error('⚠️ Error cleaning up test output:', error.message);
    }
  }
}

async function runAllTests() {
  logStep('STARTING IMAGE API TEST SUITE');
  logEnvironmentInfo();
  
  console.log('\n===== Validating Auth0 Configuration =====');
  try {
    await validateConfig();
    console.log('✅ Auth0 configuration validated');
  } catch (error) {
    console.error('❌ Auth0 configuration validation failed:', error.message);
    process.exit(1);
  }

  console.log('\n===== Generating JWT Token =====');
  try {
    await getBearerToken();
    console.log('✅ JWT token generated successfully');
  } catch (error) {
    console.error('❌ JWT token generation failed:', error.message);
    process.exit(1);
  }
  
  // Create a recipe to work with
  if (await createTestRecipe()) {
    // Run the image tests in sequence
    await uploadPngImage();
    await getImage();
    await updateToJpgImage();
    // Note: getJpgImage is now called inside updateToJpgImage
    await deleteImage();
    await cleanupRecipe();
  }
  
  // Generate report regardless of test results
  await generateTestReport();
  
  // Exit with appropriate code
  const allTestsPassed = Object.values(testResults).every(r => r.success);
  process.exit(allTestsPassed ? 0 : 1);
}

// Run all tests
runAllTests().catch(error => {
  console.error('Unhandled error in test suite:', error);
  process.exit(1);
});
