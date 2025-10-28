#!/usr/bin/env node

/**
 * Build Verification Script
 * 
 * Verifies that code changes are actually deployed by checking
 * for specific markers or timestamps in the running container
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

function generateBuildMarker() {
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
  console.log(`📝 Generated build marker: ${hash} at ${timestamp}`);
  return { timestamp, hash };
}

function verifyBuild(expectedHash) {
  try {
    console.log('🔍 Checking if build marker is active in container...');
    const containerName = getCurrentContainerName();
    
    // Wait a moment for container to start
    setTimeout(() => {
      try {
        const logs = execSync(`docker logs ${containerName} --tail 10`, { encoding: 'utf8' });
        
        if (logs.includes(expectedHash)) {
          console.log('✅ Build verification PASSED - New code is active');
          return true;
        } else {
          console.log('❌ Build verification FAILED - Old code still running');
          console.log('💡 Recommendation: Run npm run force-rebuild');
          return false;
        }
      } catch (error) {
        console.log('⚠️ Could not verify build - container may not be ready yet');
        console.log(`📝 Error details: ${error.message}`);
        return null;
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Build verification error:', error.message);
    return false;
  }
}

// Command line interface
if (process.argv[1].endsWith('build-verification.js')) {
  const command = process.argv[2];
  
  if (command === 'generate') {
    const marker = generateBuildMarker();
    console.log('🔄 Now restart your container and the build marker will verify deployment');
  } else if (command === 'check') {
    const expectedHash = process.argv[3];
    if (!expectedHash) {
      console.log('❌ Usage: npm run build:verify check <hash>');
      process.exit(1);
    }
    verifyBuild(expectedHash);
  } else {
    // Default: generate marker
    const marker = generateBuildMarker();
    console.log('📝 Build marker generated');
    console.log('🔄 Restart your container to activate verification');
  }
}

export { generateBuildMarker, verifyBuild };