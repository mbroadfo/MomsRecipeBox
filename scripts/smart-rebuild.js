#!/usr/bin/env node

/**
 * Smart Rebuild Script
 * 
 * This script:
 * 1. Generates a build marker to verify deployment
 * 2. Does a regular restart first (faster)
 * 3. Verifies the build worked
 * 4. Falls back to nuclear rebuild if needed
 */

import { execSync } from 'child_process';
import { generateBuildMarker, verifyBuild } from './build-verification.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.join(__dirname, '..', 'config');
const PROFILES_FILE = path.join(CONFIG_DIR, 'deployment-profiles.json');

function getCurrentContainerName() {
  try {
    const content = fs.readFileSync(PROFILES_FILE, 'utf8');
    const profiles = JSON.parse(content);
    const currentProfileName = profiles.currentProfile;
    const currentProfile = profiles.profiles[currentProfileName];
    
    if (currentProfile && currentProfile.backend && currentProfile.backend.dockerService) {
      return `momsrecipebox-${currentProfile.backend.dockerService}`;
    }
    
    // Fallback to atlas if profile not found
    return 'momsrecipebox-app-atlas';
  } catch (error) {
    console.log('⚠️ Could not determine container name, using atlas as fallback');
    return 'momsrecipebox-app-atlas';
  }
}

async function smartRebuild() {
  console.log('🧠 Smart Rebuild - Trying efficient rebuild first...');
  
  // Step 1: Generate build marker
  console.log('1️⃣ Generating build verification marker...');
  const marker = generateBuildMarker();
  
  // Step 2: Try regular restart first
  console.log('2️⃣ Attempting regular restart...');
  try {
    execSync('npm run restart', { stdio: 'inherit' });
  } catch (error) {
    console.log('❌ Regular restart failed, proceeding to nuclear option...');
    return nuclearRebuild(marker.hash);
  }
  
  // Step 3: Wait for container to start
  console.log('3️⃣ Waiting for container to initialize...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 4: Verify build
  console.log('4️⃣ Verifying build deployment...');
  const isVerified = await verifyBuildAsync(marker.hash);
  
  if (isVerified) {
    console.log('✅ Smart rebuild successful - new code is active!');
    return true;
  } else {
    console.log('⚠️ Build verification failed - Docker cached layers detected');
    console.log('💡 Regular restart insufficient, escalating to nuclear rebuild...');
    console.log('🎯 This will remove all cached Docker layers and rebuild from scratch');
    return nuclearRebuild(marker.hash);
  }
}

async function nuclearRebuild(expectedHash) {
  console.log('💣 Nuclear Rebuild - Complete container recreation');
  console.log('🎯 Expected hash:', expectedHash);
  
  try {
    execSync('npm run rebuild:force', { stdio: 'inherit' });
    console.log('✅ Nuclear rebuild complete!');
    
    // Wait for container to start and verify the nuclear rebuild worked
    console.log('🔍 Verifying nuclear rebuild worked...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const verificationResult = await verifyNuclearBuildAsync(expectedHash);
    if (verificationResult) {
      console.log('✅ Nuclear rebuild verification PASSED - Build system is working');
      return true;
    } else {
      console.log('❌ Nuclear rebuild verification FAILED - Build marker system broken');
      console.log('🚨 CRITICAL: Even after nuclear rebuild, build markers not loading');
      console.log('💡 This indicates a fundamental issue with the build marker system');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Nuclear rebuild failed:', error.message);
    return false;
  }
}

async function verifyNuclearBuildAsync(expectedHash) {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('🔍 Checking if build marker system loaded expected hash after nuclear rebuild...');
      console.log('🎯 Looking for hash:', expectedHash);
      
        // Trigger Lambda handler to initialize build marker system
        try {
          execSync('node -e "const http = require(\'http\'); const postData = JSON.stringify({}); const req = http.request({hostname: \'localhost\', port: 3000, path: \'/initializeBuildMarker\', method: \'POST\', headers: {\'Content-Type\': \'application/json\', \'Content-Length\': Buffer.byteLength(postData)}}, () => {}); req.write(postData); req.end();"', { stdio: 'pipe' });
          console.log('🔄 Triggered Lambda build marker initialization via POST /initializeBuildMarker');
        } catch (e) {
          console.log('⚠️ Could not trigger Lambda handler for verification');
        }      // Wait a moment for the request to process, then check logs
      setTimeout(() => {
        try {
          const containerName = getCurrentContainerName();
          const logs = execSync(`docker logs ${containerName} --tail 30`, { encoding: 'utf8' });
          
          // Look for build marker loading attempts at startup
          const hasMarkerAttempt = logs.includes('🔧 Loading build marker at container startup');
          const hasMarkerSuccess = logs.includes('✅ Build marker loaded successfully');
          const hasMarkerFailure = logs.includes('⚠️ Build marker not loaded at startup');
          const hasMarkerOutput = logs.includes('🏗️ Build marker loaded');
          const hasExpectedHash = logs.includes(expectedHash);
          
          console.log(`📋 Build marker diagnostics:`);
          console.log(`   🔧 Load attempt logged: ${hasMarkerAttempt ? '✅' : '❌'}`);
          console.log(`   ✅ Load success logged: ${hasMarkerSuccess ? '✅' : '❌'}`);
          console.log(`   ⚠️ Load failure logged: ${hasMarkerFailure ? '✅' : '❌'}`);
          console.log(`   🏗️ Marker output found: ${hasMarkerOutput ? '✅' : '❌'}`);
          console.log(`   🎯 Expected hash found: ${hasExpectedHash ? '✅' : '❌'}`);
          
          if (hasMarkerAttempt && hasMarkerSuccess && hasMarkerOutput && hasExpectedHash) {
            console.log('✅ Build marker system loaded the expected hash correctly');
            resolve(true);
          } else if (hasMarkerAttempt && hasMarkerFailure) {
            console.log('❌ Build marker system attempted but failed to load');
            resolve(false);
          } else if (!hasMarkerAttempt) {
            console.log('❌ Build marker system not even attempting to load');
            resolve(false);
          } else if (!hasExpectedHash) {
            console.log('❌ Build marker system loaded but wrong hash');
            resolve(false);
          } else {
            console.log('❌ Build marker system in unknown state');
            resolve(false);
          }
          
        } catch (error) {
          console.log('⚠️ Could not verify nuclear rebuild');
          console.log(`📝 Error details: ${error.message}`);
          resolve(false);
        }
      }, 2000);
    }, 1000);
  });
}

async function verifyBuildAsync(expectedHash) {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        console.log(`🔍 Looking for build marker: ${expectedHash}`);
        
        // Trigger build marker initialization to load the new marker
        try {
          execSync('node -e "const http = require(\'http\'); const postData = JSON.stringify({}); const req = http.request({hostname: \'localhost\', port: 3000, path: \'/initializeBuildMarker\', method: \'POST\', headers: {\'Content-Type\': \'application/json\', \'Content-Length\': Buffer.byteLength(postData)}}, () => {}); req.write(postData); req.end();"', { stdio: 'pipe' });
          console.log('🔄 Triggered build marker initialization');
        } catch (e) {
          console.log('⚠️ Could not trigger build marker initialization');
        }
        
        // Wait a moment for initialization, then check logs
        setTimeout(() => {
          try {
            const containerName = getCurrentContainerName();
            const logs = execSync(`docker logs ${containerName} --tail 30`, { encoding: 'utf8' });
        
        // Look for build marker loading at startup and any markers in the logs
        const hasStartupAttempt = logs.includes('🔧 Loading build marker at container startup');
        const hasStartupSuccess = logs.includes('✅ Build marker loaded successfully at startup');
        
        // Updated pattern to handle multiline build marker output
        const buildMarkerPattern = /🏗️ Build marker loaded:[^}]*hash: '([^']+)'/gs;
        const foundMarkers = [];
        let match;
        
        while ((match = buildMarkerPattern.exec(logs)) !== null) {
          foundMarkers.push(match[1]);
        }
        
        // Also check for the hash directly in logs (more reliable for multiline format)
        const hashFound = logs.includes(expectedHash);
        
        if (hashFound || foundMarkers.includes(expectedHash)) {
          console.log('✅ Build verification PASSED - New code is active');
          console.log(`🎯 Found expected build marker: ${expectedHash}`);
          if (foundMarkers.length > 0) {
            console.log(`📋 All detected markers: ${foundMarkers.join(', ')}`);
          }
          resolve(true);
        } else {
          console.log('❌ Build verification FAILED - Old code still running');
          console.log(`🎯 Expected build marker: ${expectedHash}`);
          
          if (foundMarkers.length > 0) {
            console.log(`🔍 Found old build marker(s): ${foundMarkers.join(', ')}`);
            console.log('📝 Docker is using cached application layers from previous builds');
          } else if (hasStartupAttempt && hasStartupSuccess) {
            console.log('🔍 Build marker system loaded at startup but expected marker not found');
            console.log('📝 Container restarted but Docker is using cached application layers');
          } else if (hasStartupAttempt && !hasStartupSuccess) {
            console.log('⚠️ Build marker system attempted to load at startup but failed');
            console.log('📝 Build marker file may be missing or corrupted');
          } else {
            console.log('🔍 No build marker loading attempt found in startup logs');
            console.log('📝 Build marker system may not be active in this container build');
          }
          
          // Show relevant log snippet for debugging
          const logLines = logs.split('\n').filter(line => 
            line.includes('Build marker') || 
            line.includes('Lambda handler started') ||
            line.includes('Starting application')
          );
          
          if (logLines.length > 0) {
            console.log('📋 Relevant container log entries:');
            logLines.slice(-3).forEach(line => console.log(`   ${line.trim()}`));
          }
          
          resolve(false);
        }
          } catch (error) {
            console.log('⚠️ Could not verify build - container may not be ready');
            console.log(`📝 Error details: ${error.message}`);
            resolve(false);
          }
        }, 1000); // Close inner setTimeout
      } catch (error) {
        console.log('⚠️ Could not verify build - container may not be ready');
        console.log(`📝 Error details: ${error.message}`);
        resolve(false);
      }
    }, 2000);
  });
}

// Run if called directly
if (process.argv[1].endsWith('smart-rebuild.js')) {
  smartRebuild()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Smart rebuild error:', error);
      process.exit(1);
    });
}