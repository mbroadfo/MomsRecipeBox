#!/usr/bin/env node

/**
 * Auth0 Credentials Test Script
 * 
 * This script tests that Auth0 credentials are properly loaded from AWS Secrets Manager
 * and that basic Auth0 connectivity works.
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
config({ path: path.join(__dirname, '../.env') });
config({ path: path.join(__dirname, '../config/current-profile.env'), override: true });

async function testAuth0Setup() {
  console.log('🔍 Testing Auth0 Setup with Container-Native Secret Retrieval...\n');

  // Check if we're using placeholder values (need AWS retrieval)
  console.log('1️⃣ Checking Auth0 Configuration Source:');
  const needsAWSSecrets = !process.env.AUTH0_DOMAIN || 
                         process.env.AUTH0_DOMAIN.includes('${') ||
                         !process.env.AUTH0_M2M_CLIENT_ID ||
                         process.env.AUTH0_M2M_CLIENT_ID.includes('${');
  
  if (needsAWSSecrets) {
    console.log('   🔐 Auth0 secrets will be retrieved from AWS Secrets Manager');
    console.log('   📋 Profile file contains placeholders - this is expected and secure');
  } else {
    console.log('   📝 Using resolved environment variables');
  }

  // Test Auth0 connectivity using the updated auth0_utils
  console.log('\n2️⃣ Testing Auth0 Management API Connectivity:');
  
  try {
    console.log('   📦 Importing auth0_utils...');
    const { getManagementToken, listAuth0Users } = await import('./admin/auth0_utils.js');
    console.log('   ✅ auth0_utils imported successfully');
    
    console.log('   🔐 Attempting to get Management API token...');
    const token = await getManagementToken();
    console.log('   ✅ Successfully obtained Management API token');
    console.log(`   📊 Token preview: ${token.substring(0, 20)}...`);

    const result = await listAuth0Users();
    console.log(`   ✅ Successfully connected to Auth0 Management API`);
    console.log(`   👥 Found ${result.users ? result.users.length : 0} users`);
    console.log(`   📊 Total users: ${result.total || 0}`);

    console.log('\n🎉 Auth0 Setup Test: PASSED');
    console.log('\n✅ Container-native secret retrieval working!');
    console.log('✅ Auth0 Management API connectivity is working!');
    console.log('\nThe Auth0 system is ready for user management integration.');

  } catch (error) {
    console.log(`\n❌ Auth0 connectivity test failed: ${error.message}`);
    console.log('\nTroubleshooting steps:');
    console.log('1. Verify AWS credentials are properly configured');
    console.log('2. Check that Auth0 secrets are in AWS Secrets Manager');
    console.log('3. Verify Auth0 M2M application has correct scopes');
    console.log('4. Ensure Auth0 domain and credentials are correct in AWS secrets');
    process.exit(1);
  }
}

// Check if we're being run directly
if (import.meta.url.startsWith('file:') && process.argv[1] && import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  testAuth0Setup();
}

export default testAuth0Setup;