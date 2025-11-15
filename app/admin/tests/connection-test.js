// Admin System - Connection Test
// Tests Auth0 M2M connectivity, Management API access, and token caching

import dotenv from 'dotenv';
import { getManagementToken, listAuth0Users, getAuth0Config } from '../auth0_utils.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function testConnection() {
  console.log('🔐 Admin System - Connection Test');
  console.log('==================================');
  
  try {
    // Test M2M token acquisition
    console.log('\n1️⃣ Testing M2M Token...');
    const token = await getManagementToken();
    console.log('   ✅ M2M token obtained');
    console.log(`   📄 Token length: ${token.length} characters`);
    
    // Test token caching (second call should use cache)
    console.log('\n2️⃣ Testing Token Caching...');
    const startTime = Date.now();
    const cachedToken = await getManagementToken();
    const duration = Date.now() - startTime;
    console.log(`   ✅ Second token call completed in ${duration}ms (should be fast if cached)`);
    console.log(`   📄 Tokens match: ${token === cachedToken}`);
    
    // Decode and examine token
    console.log('\n3️⃣ Testing Token Scopes...');
    const decoded = jwt.decode(token);
    if (decoded.scope) {
      const scopes = decoded.scope.split(' ');
      const requiredScopes = ['read:users', 'create:users', 'delete:users'];
      
      requiredScopes.forEach(scope => {
        if (scopes.includes(scope)) {
          console.log(`   ✅ ${scope}`);
        } else {
          console.log(`   ❌ ${scope} - MISSING`);
        }
      });
    }
    
    // Test Management API access
    console.log('\n4️⃣ Testing Management API...');
    const result = await listAuth0Users();
    console.log('   ✅ Successfully connected to Auth0 Management API');
    console.log(`   👥 Found ${result.users.length} users`);
    console.log(`   📊 Total users: ${result.total}`);
    
    // Test direct API call
    console.log('\n5️⃣ Testing Direct API Call...');
    const config = await getAuth0Config();
    const response = await axios.get(`https://${config.AUTH0_DOMAIN}/api/v2/users?per_page=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   ✅ Direct API call successful (Status: ${response.status})`);
    
    // Show sample user data (if available)
    if (result.users.length > 0) {
      const user = result.users[0];
      console.log('\n6️⃣ Sample User Data:');
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🆔 User ID: ${user.user_id}`);
      console.log(`   📅 Created: ${new Date(user.created_at).toLocaleDateString()}`);
      console.log(`   🔐 Login Count: ${user.logins_count || 0}`);
    }
    
    console.log('\n✅ All connection tests passed!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Verify M2M app has Management API access');
      console.log('   2. Check required scopes: read:users, create:users, delete:users');
    } else if (error.message.includes('400')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('   1. Check client credentials in .env file');
      console.log('   2. Verify AUTH0_DOMAIN is correct');
    }
    
    process.exit(1);
  }
}

// Run the test
testConnection();
