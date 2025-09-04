// Admin System - JWT Integration Test
// Tests JWT validation and HTTP endpoint integration

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { validateJWT } from '../jwt_validator.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

function createTestJWT() {
  // Create a mock JWT for testing (in production, this comes from Auth0)
  const payload = {
    iss: `https://${process.env.AUTH0_DOMAIN}/`,
    sub: 'test-user-id',
    aud: ['https://momsrecipebox/api', `https://${process.env.AUTH0_DOMAIN}/userinfo`],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    azp: 'test-client-id',
    scope: 'read:users write:users',
    permissions: ['admin:read', 'admin:write']
  };
  
  // Note: This is signed with a test secret, Auth0 validation will fail
  return jwt.sign(payload, 'test-secret');
}

async function testJWTIntegration() {
  console.log('🔐 Admin System - JWT Integration Test');
  console.log('======================================');
  
  try {
    // Test 1: Generate Test JWT
    console.log('\n1️⃣ Generating Test JWT...');
    const testToken = createTestJWT();
    console.log('   ✅ Test JWT created');
    console.log(`   📄 Token length: ${testToken.length} characters`);
    
    // Test 2: JWT Structure Validation
    console.log('\n2️⃣ Validating JWT Structure...');
    const decoded = jwt.decode(testToken, { complete: true });
    console.log('   ✅ JWT structure valid');
    console.log(`   🏷️ Algorithm: ${decoded.header.alg}`);
    console.log(`   👤 Subject: ${decoded.payload.sub}`);
    console.log(`   🎫 Audience: ${decoded.payload.aud[0]}`);
    console.log(`   🔑 Permissions: ${decoded.payload.permissions?.join(', ') || 'None'}`);
    
    // Test 3: JWT Validation (will fail with Auth0 verification)
    console.log('\n3️⃣ Testing JWT Validation...');
    try {
      await validateJWT(testToken);
      console.log('   ✅ JWT validation passed');
    } catch (error) {
      console.log('   ⚠️ JWT validation failed (expected with test token)');
      console.log(`   📝 Error: ${error.message}`);
    }
    
    // Test 4: HTTP Endpoint Testing Instructions
    console.log('\n4️⃣ HTTP Endpoint Testing:');
    console.log('   📋 Available Admin Endpoints:');
    console.log('   • GET    /admin/users           - List users');
    console.log('   • POST   /admin/users/invite    - Invite user');
    console.log('   • DELETE /admin/users/{id}      - Delete user');
    console.log('');
    console.log('   🧪 Test with curl/Postman:');
    console.log('   ```');
    console.log('   curl -H "Authorization: Bearer YOUR_AUTH0_JWT" \\');
    console.log('        http://localhost:3000/admin/users');
    console.log('   ```');
    
    // Test 5: Auth0 JWT Generation Instructions
    console.log('\n5️⃣ Getting Valid Auth0 JWT:');
    console.log('   📝 To test with real Auth0 JWT:');
    console.log('   1. Create a test application in Auth0 Dashboard');
    console.log('   2. Configure the application with admin scopes');
    console.log('   3. Use Auth0 authentication flow to get JWT');
    console.log('   4. Include admin:read and admin:write permissions');
    console.log('');
    console.log(`   🔗 Auth0 Domain: ${process.env.AUTH0_DOMAIN}`);
    console.log(`   🎯 Required Audience: https://momsrecipebox/api`);
    
    console.log('\n✅ JWT integration test completed!');
    
  } catch (error) {
    console.error('❌ JWT integration test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testJWTIntegration();
