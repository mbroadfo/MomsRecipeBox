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

async function testAuth0Setup() {
  console.log('🔍 Testing Auth0 Setup...\n');

  // Check required environment variables
  const requiredVars = [
    'AUTH0_DOMAIN',
    'AUTH0_M2M_CLIENT_ID',
    'AUTH0_M2M_CLIENT_SECRET',
    'REACT_APP_AUTH0_CLIENT_ID',
    'AUTH0_API_AUDIENCE'
  ];

  let allVarsPresent = true;

  console.log('1️⃣ Checking Environment Variables:');
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`   ❌ ${varName}: Not set`);
      allVarsPresent = false;
    }
  }

  if (!allVarsPresent) {
    console.log('\n❌ Missing Auth0 environment variables.');
    console.log('Please ensure your profile is set and Auth0 credentials are in AWS Secrets Manager.');
    console.log('\nTo fix this:');
    console.log('1. Set your AWS profile: $env:AWS_PROFILE="mrb-api"');
    console.log('2. Set your deployment profile: npm run profile:set atlas');
    console.log('3. Update AWS Secrets Manager with Auth0 credentials');
    process.exit(1);
  }

  // Test Auth0 connectivity
  console.log('\n2️⃣ Testing Auth0 Connectivity:');
  
  try {
    const { getManagementToken } = await import('./admin/auth0_utils.js');
    
    console.log('   🔐 Attempting to get Management API token...');
    const token = await getManagementToken();
    console.log('   ✅ Successfully obtained Management API token');
    console.log(`   📊 Token preview: ${token.substring(0, 20)}...`);

    console.log('\n3️⃣ Testing Management API Access:');
    
    const { listAuth0Users } = await import('./admin/auth0_utils.js');
    const result = await listAuth0Users();
    console.log(`   ✅ Successfully connected to Auth0 Management API`);
    console.log(`   👥 Found ${result.users ? result.users.length : 0} users`);
    console.log(`   📊 Total users: ${result.total || 0}`);

    console.log('\n🎉 Auth0 Setup Test: PASSED');
    console.log('\n✅ All Auth0 credentials are properly configured!');
    console.log('✅ Management API connectivity is working!');
    console.log('\nYou can now run the Auth0 export script:');
    console.log('   cd app && node auth0-export.js');

  } catch (error) {
    console.log(`\n❌ Auth0 connectivity test failed: ${error.message}`);
    console.log('\nTroubleshooting steps:');
    console.log('1. Verify Auth0 M2M application has correct scopes');
    console.log('2. Check that client ID and secret are correct');
    console.log('3. Ensure Auth0 domain is accessible');
    process.exit(1);
  }
}

// Check if we're being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAuth0Setup();
}

export default testAuth0Setup;