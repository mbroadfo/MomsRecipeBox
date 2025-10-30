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
  
  // Handle lambda mode - no local containers to restart
  if (profile.name === 'lambda' || profile.name === 'cloud') {
    console.log(`🌩️ ${profile.name.toUpperCase()} Mode Detected`);
    console.log('📡 Testing against deployed Lambda API - no local containers to restart');
    console.log('💡 To test changes:');
    console.log('   1. Deploy changes: npm run deploy:lambda');
    console.log('   2. Run tests: npm run test:lambda');
    console.log('✅ No restart needed for external services');
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