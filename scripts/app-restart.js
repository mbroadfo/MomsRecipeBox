#!/usr/bin/env node

/**
 * Unified App Restart Script
 * 
 * Single command to intelligently restart the application:
 * 1. Check if app is running, generate new badge if needed
 * 2. Check current badge in app vs new badge 
 * 3. If same: simple container restart
 * 4. If different: full rebuild + verify badges match
 * 
 * This replaces all the complex rebuild/restart/verify commands
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Update test environment to match current profile
 */
function updateTestEnvironment(profile) {
  console.log('🧪 Updating test environment for profile:', profile.name);
  
  const testEnvPath = path.join(process.cwd(), 'app', 'tests', '.env');
  
  // Determine the correct API URL based on profile
  let apiUrl = 'http://localhost:3000'; // Default for local/atlas
  
  if (profile.name === 'lambda') {
    apiUrl = 'https://b31emm78z4.execute-api.us-west-2.amazonaws.com/dev';
  }
  
  // Update the test .env file
  const testEnvContent = `APP_BASE_URL=${apiUrl}
MONGODB_ROOT_USER=admin
MONGODB_ROOT_PASSWORD=supersecret
MONGODB_URI=mongodb://admin:supersecret@mongo:27017/moms_recipe_box_dev?authSource=admin
MONGODB_DB_NAME=moms_recipe_box_dev
`;
  
  fs.writeFileSync(testEnvPath, testEnvContent);
  console.log(`✅ Test environment updated to use: ${apiUrl}`);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.join(__dirname, '..', 'config');
const PROFILES_FILE = path.join(CONFIG_DIR, 'deployment-profiles.json');
const BUILD_MARKER_FILE = 'app/build-marker.js';

/**
 * Get current deployment profile information
 */
function getCurrentProfile() {
  try {
    const config = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
    const profileName = config.currentProfile || 'local';
    const profileData = config.profiles[profileName];
    return { name: profileName, data: profileData };
  } catch (error) {
    console.log('⚠️ Could not read profile config, defaulting to local');
    return { name: 'local', data: null };
  }
}

/**
 * Get current deployment profile container name
 */
function getCurrentContainerName() {
  try {
    const config = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
    const activeProfile = config.currentProfile || 'local';
    return `momsrecipebox-app-${activeProfile}`;
  } catch (error) {
    console.log('⚠️ Could not read profile config, defaulting to local');
    return 'momsrecipebox-app-local';
  }
}

/**
 * Check if the app container is currently running
 */
function isAppRunning() {
  try {
    const containerName = getCurrentContainerName();
    const result = execSync(`docker ps --filter name=${containerName} --format "{{.Names}}"`, { encoding: 'utf8' });
    return result.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a new build badge with unique hash
 */
function generateBuildBadge() {
  const timestamp = new Date().toISOString();
  const hash = crypto.randomBytes(8).toString('hex');
  
  const markerContent = `// Auto-generated build marker - DO NOT EDIT
export const BUILD_INFO = {
  timestamp: '${timestamp}',
  hash: '${hash}',
  version: '${Date.now()}'
};

console.log('🏗️ Build marker loaded:', BUILD_INFO);
`;
  
  fs.writeFileSync(BUILD_MARKER_FILE, markerContent);
  console.log(`📝 Generated new build badge: ${hash}`);
  return { timestamp, hash };
}

/**
 * Get the current build badge from the running app
 */
async function getCurrentAppBadge() {
  if (!isAppRunning()) {
    console.log('📱 App is not running');
    return null;
  }

  try {
    console.log('📡 Getting current app badge...');
    
    // Trigger badge initialization to get current badge
    execSync('node -e "const http = require(\'http\'); const postData = JSON.stringify({}); const req = http.request({hostname: \'localhost\', port: 3000, path: \'/initializeBuildMarker\', method: \'POST\', headers: {\'Content-Type\': \'application/json\', \'Content-Length\': Buffer.byteLength(postData)}}, () => {}); req.write(postData); req.end();"', { stdio: 'pipe' });
    
    // Wait for processing then check logs
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const containerName = getCurrentContainerName();
    const logs = execSync(`docker logs ${containerName} --tail 20`, { encoding: 'utf8' });
    
    // Extract current badge hash from logs
    const hashPattern = /hash: '([^']+)'/s;
    let match = hashPattern.exec(logs);
    
    if (match) {
      const currentBadge = match[1];
      console.log(`📱 Current app badge: ${currentBadge}`);
      return currentBadge;
    } else {
      console.log('📱 No badge found in logs');
      return null;
    }
  } catch (error) {
    console.log(`⚠️ Error getting badge: ${error.message}`);
    return null;
  }
}

/**
 * Simple container restart (efficient)
 */
async function simpleRestart() {
  console.log('🔄 Simple container restart...');
  try {
    execSync('npm run restart', { stdio: 'inherit' });
    console.log('✅ Container restarted successfully');
    return true;
  } catch (error) {
    console.log('❌ Simple restart failed:', error.message);
    return false;
  }
}

/**
 * Full rebuild (when badges are different)
 */
async function fullRebuild() {
  console.log('🏗️ Full rebuild required - code changes detected...');
  try {
    execSync('npm run rebuild:force', { stdio: 'inherit' });
    console.log('✅ Full rebuild completed');
    return true;
  } catch (error) {
    console.log('❌ Full rebuild failed:', error.message);
    return false;
  }
}

/**
 * Verify the expected badge is now active in the app
 */
async function verifyBadge(expectedBadge) {
  console.log(`🔍 Verifying badge: ${expectedBadge}`);
  
  // Give container a moment to start serving requests
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const actualBadge = await getCurrentAppBadge();
  
  if (actualBadge === expectedBadge) {
    console.log('✅ Badge verification PASSED - New code is active');
    return true;
  } else {
    console.log('❌ Badge verification FAILED');
    console.log(`   Expected: ${expectedBadge}`);
    console.log(`   Actual: ${actualBadge || 'none'}`);
    console.log('❌ Verification failed - app may not be running new code');
    return false;
  }
}

/**
 * Main unified restart logic
 */
async function unifiedRestart() {
  console.log('🚀 Unified App Restart - Intelligent deployment system');
  console.log('');

  // Check current deployment profile
  const profile = getCurrentProfile();
  console.log(`📋 Profile: ${profile.name} mode`);
  
  // Update test environment to match profile
  updateTestEnvironment(profile);
  
  // Handle lambda mode - comprehensive deployment management
  if (profile.name === 'lambda' || profile.name === 'cloud') {
    console.log(`🌩️ ${profile.name.toUpperCase()} Mode Detected`);
    console.log('📡 Managing deployed Lambda API');
    
    // Step 1: Clean up any running containers from previous modes
    console.log('🧹 Cleaning up local containers...');
    try {
      execSync('npm run profile:stop', { stdio: 'inherit' });
      console.log('✅ Local containers stopped');
    } catch (error) {
      console.log('⚠️ No containers to stop (already clean)');
    }
    
    // Step 2: Generate build badge for deployment verification
    const newBadge = generateBuildBadge();
    
    // Step 3: Check Lambda deployment status
    console.log('🔍 Checking Lambda deployment status...');
    
    try {
      // Get current Lambda function info
      const lambdaInfo = JSON.parse(execSync('aws lambda get-function --function-name mrb-app-api --query "{LastModified:Configuration.LastModified,ImageDigest:Configuration.CodeSha256,ImageUri:Code.ImageUri}"', { encoding: 'utf8' }));
      console.log(`� Current Lambda last modified: ${lambdaInfo.LastModified}`);
      console.log(`🏷️ Current Lambda image: ${lambdaInfo.ImageUri}`);
      
      // Get latest ECR image info
      const ecrImages = JSON.parse(execSync('aws ecr describe-images --repository-name mrb-app-api --query "imageDetails[?imageTags && contains(imageTags, \`dev\`)].{ImageDigest:imageDigest,ImagePushedAt:imagePushedAt,ImageTags:imageTags}" --output json', { encoding: 'utf8' }));
      
      if (ecrImages.length > 0) {
        const latestEcrImage = ecrImages[0];
        console.log(`📦 Latest ECR image pushed: ${latestEcrImage.ImagePushedAt}`);
        
        // Compare timestamps to see if deployment is needed
        const lambdaTime = new Date(lambdaInfo.LastModified);
        const ecrTime = new Date(latestEcrImage.ImagePushedAt);
        
        if (ecrTime > lambdaTime) {
          console.log('🎯 ECR image is newer than Lambda deployment - deployment needed!');
          console.log('🚀 Triggering Lambda deployment...');
          
          try {
            execSync('npm run deploy:lambda', { stdio: 'inherit' });
            console.log('✅ Lambda deployment completed');
            
            // Verify deployment
            console.log('🔍 Verifying deployment...');
            const updatedLambda = JSON.parse(execSync('aws lambda get-function --function-name mrb-app-api --query "Configuration.LastModified"', { encoding: 'utf8' }));
            console.log(`✅ Lambda updated: ${updatedLambda}`);
            
          } catch (deployError) {
            console.log('❌ Lambda deployment failed:', deployError.message);
            console.log('💡 Manual deployment required: npm run deploy:lambda');
            return false;
          }
        } else {
          console.log('✅ Lambda deployment is current - no deployment needed');
        }
      } else {
        console.log('⚠️ No tagged ECR image found - may need to build and deploy');
      }
      
    } catch (error) {
      console.log('⚠️ Could not check Lambda status:', error.message);
      console.log('💡 Manual verification recommended');
    }
    
    // Step 4: Provide next steps
    console.log('');
    console.log('🧪 Next steps for testing:');
    console.log('   1. Run tests: npm run test');
    console.log(`   2. Expected build badge: ${newBadge.hash}`);
    console.log('   3. Check Lambda logs: aws logs tail /aws/lambda/mrb-app-api --follow');
    
    console.log('✅ Lambda mode restart sequence completed');
    return true;
  }

  // Continue with container-based restart logic for local/atlas modes
  console.log(`📋 Profile: ${profile.name} mode`);

  // Step 1: Check if app is running and get current badge
  const currentBadge = await getCurrentAppBadge();
  
  // Step 2: Generate new badge for this restart
  const newBadge = generateBuildBadge();
  
  // Step 3: Compare badges to decide restart strategy
  if (currentBadge === newBadge.hash) {
    console.log('🎯 Badges match - no code changes detected');
    console.log('📋 Strategy: Simple container restart');
    
    const restartSuccess = await simpleRestart();
    if (restartSuccess) {
      console.log('✅ Simple restart completed successfully');
      return true;
    } else {
      console.log('⚠️ Simple restart failed, trying full rebuild...');
      const rebuildSuccess = await fullRebuild();
      return rebuildSuccess;
    }
  } else {
    console.log('🎯 Badges differ - code changes detected');
    console.log(`   Current: ${currentBadge || 'none'}`);
    console.log(`   New: ${newBadge.hash}`);
    console.log('📋 Strategy: Full rebuild + verification');
    
    const rebuildSuccess = await fullRebuild();
    if (!rebuildSuccess) {
      console.log('❌ Full rebuild failed');
      return false;
    }
    
    // Step 4: Verify the new badge is active
    const verifySuccess = await verifyBadge(newBadge.hash);
    if (verifySuccess) {
      console.log('✅ Full restart completed - new code verified active');
      return true;
    } else {
      console.log('❌ Verification failed - app may not be running new code');
      return false;
    }
  }
}

// Run if called directly
const currentFilePath = fileURLToPath(import.meta.url);
const isCalledDirectly = currentFilePath === process.argv[1];

if (isCalledDirectly) {
  console.log('🔧 Starting unified restart...');
  unifiedRestart()
    .then(success => {
      if (success) {
        console.log('');
        console.log('🎉 App restart completed successfully!');
        process.exit(0);
      } else {
        console.log('');
        console.log('💥 App restart failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Restart error:', error.message);
      console.error(error.stack);
      process.exit(1);
    });
}

export { unifiedRestart, getCurrentAppBadge, generateBuildBadge, verifyBadge };