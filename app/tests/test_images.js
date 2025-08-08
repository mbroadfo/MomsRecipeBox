// File: test_images.js
// Comprehensive test suite for image operations in MomsRecipeBox API
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { promisify } from 'util';

const BASE_URL = 'http://localhost:3000';
const TEST_PNG_PATH = path.resolve('../689128b722f836aa43e5e6aa.png');
const TEST_JPG_PATH = path.resolve('../689128b722f836aa43e5e6ab.jpg');
const TEST_OUTPUT_DIR = path.resolve('./test_output');
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
  getImage: { success: false, details: null },
  updateToJpgImage: { success: false, details: null },
  deleteImage: { success: false, details: null },
  cleanupRecipe: { success: false, details: null },
};

async function logStep(message) {
  const divider = '-'.repeat(80);
  console.log(`\n${divider}`);
  console.log(`📋 ${message}`);
  console.log(divider);
}

async function createTestRecipe() {
  logStep('STEP 1: Creating test recipe');
  try {
    const response = await axios.post(`${BASE_URL}/recipes`, testRecipe);
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
    const imageBuffer = await readFile(TEST_PNG_PATH);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await axios.put(`${BASE_URL}/recipes/${recipeId}/image`, {
      imageBase64: base64Image,
      contentType: 'image/png'
    });
    
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
  logStep('STEP 3: Retrieving image from recipe');
  try {
    const response = await axios.get(`${BASE_URL}/recipes/${recipeId}/image`, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'image/png'
      }
    });
    
    const outputPath = path.join(TEST_OUTPUT_DIR, filename);
    await writeFile(outputPath, response.data);
    
    // Check if we got a valid image (at least verify size is reasonable)
    const stats = fs.statSync(outputPath);
    const isValidSize = stats.size > 1000; // More than 1KB
    
    if (isValidSize) {
      console.log(`✅ Image retrieved successfully and saved to ${outputPath}`);
      console.log(`Image size: ${stats.size} bytes`);
      testResults.getImage.success = true;
      testResults.getImage.details = { 
        path: outputPath, 
        size: stats.size, 
        contentType: response.headers['content-type']
      };
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
    const imageBuffer = await readFile(TEST_JPG_PATH);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await axios.put(`${BASE_URL}/recipes/${recipeId}/image`, {
      imageBase64: base64Image,
      contentType: 'image/jpeg'
    });
    
    console.log(`✅ JPG image updated successfully`);
    console.log(`Response:`, response.data);
    
    // Verify by retrieving and checking the updated image
    const getResult = await getImage('test_updated_image.jpg');
    
    testResults.updateToJpgImage.success = getResult;
    testResults.updateToJpgImage.details = response.data;
    return getResult;
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
  logStep('STEP 5: Deleting image from recipe');
  try {
    const response = await axios.delete(`${BASE_URL}/recipes/${recipeId}/image`);
    
    console.log(`✅ Image deleted successfully`);
    console.log(`Response:`, response.data);
    
    // Verify deletion by getting image and checking if we get default image
    const retrievedImageResponse = await axios.get(`${BASE_URL}/recipes/${recipeId}/image`, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'image/png'
      }
    });
    
    const outputPath = path.join(TEST_OUTPUT_DIR, 'test_default_image.png');
    await writeFile(outputPath, retrievedImageResponse.data);
    
    // Check if the returned image is different from our original
    const stats = fs.statSync(outputPath);
    
    console.log(`Retrieved default image size: ${stats.size} bytes`);
    testResults.deleteImage.success = true;
    testResults.deleteImage.details = { 
      path: outputPath, 
      size: stats.size,
      responseData: response.data
    };
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
  logStep('STEP 6: Cleaning up test recipe');
  try {
    const response = await axios.delete(`${BASE_URL}/recipes/${recipeId}`);
    console.log(`✅ Recipe deleted successfully`);
    console.log(`Response:`, response.data);
    testResults.cleanupRecipe.success = true;
    testResults.cleanupRecipe.details = response.data;
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
  
  // Save report to file
  const reportPath = path.join(TEST_OUTPUT_DIR, 'image_test_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: `${Math.round((passedTests / totalTests) * 100)}%`
    },
    results: testResults
  }, null, 2));
  
  console.log(`\nDetailed report saved to: ${reportPath}`);
}

async function runAllTests() {
  logStep('STARTING IMAGE API TEST SUITE');
  
  // Create a recipe to work with
  if (await createTestRecipe()) {
    // Run the image tests in sequence
    await uploadPngImage();
    await getImage();
    await updateToJpgImage();
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
