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

const BUILD_MARKER_FILE = 'app/build-marker.js';

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
    
    // Wait a moment for container to start
    setTimeout(() => {
      try {
        const logs = execSync('docker logs momsrecipebox-app-atlas --tail 10', { encoding: 'utf8' });
        
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
        return null;
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Build verification error:', error.message);
    return false;
  }
}

// If called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const marker = generateBuildMarker();
  console.log('🔄 Restart your container, then run: node scripts/verify-build.js check ' + marker.hash);
}

export { generateBuildMarker, verifyBuild };