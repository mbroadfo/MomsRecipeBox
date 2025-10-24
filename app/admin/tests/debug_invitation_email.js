#!/usr/bin/env node

/**
 * Debug Invitation Email Flow
 * 
 * This script tests the user invitation process step by step to identify
 * why the password reset/welcome email isn't being sent.
 */

import { inviteAuth0User, getManagementToken, getAuth0Config } from '../auth0_utils.js';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../config/current-profile.env'), override: true });

const TEST_EMAIL = 'uhqntdhg7@mozmail.com';

async function debugInvitationFlow() {
  console.log('🔍 Debug Invitation Email Flow');
  console.log('==============================\n');

  try {
    // Step 1: Test basic Auth0 connectivity
    console.log('1️⃣ Testing Auth0 Management Token...');
    const token = await getManagementToken();
    console.log(`   ✅ Token obtained: ${token.substring(0, 20)}...`);

    // Step 2: Get Auth0 configuration
    console.log('\n2️⃣ Getting Auth0 configuration...');
    const config = await getAuth0Config();
    console.log(`   ✅ Domain: ${config.AUTH0_DOMAIN}`);
    
    // Step 3: Clean up any existing test user
    console.log('\n3️⃣ Cleaning up existing test user...');
    try {
      const searchUrl = `https://${config.AUTH0_DOMAIN}/api/v2/users-by-email?email=${encodeURIComponent(TEST_EMAIL)}`;
      const searchResponse = await axios.get(searchUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (searchResponse.data && searchResponse.data.length > 0) {
        const userId = searchResponse.data[0].user_id;
        console.log(`   🗑️ Found existing user: ${userId}, deleting...`);
        
        const deleteUrl = `https://${config.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`;
        await axios.delete(deleteUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   ✅ Existing user deleted');
      } else {
        console.log('   ✅ No existing user found');
      }
    } catch (error) {
      console.log('   ℹ️ No existing user to clean up');
    }

    // Step 4: Test user creation only (without email)
    console.log('\n4️⃣ Testing user creation (without email trigger)...');
    const userUrl = `https://${config.AUTH0_DOMAIN}/api/v2/users`;
    const userData = {
      email: TEST_EMAIL,
      email_verified: false,
      given_name: 'Test',
      family_name: 'User',
      name: 'Test User',
      connection: 'Username-Password-Authentication',
      password: 'TempPassword123!',
      verify_email: false
    };

    const createResponse = await axios.post(userUrl, userData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const newUser = createResponse.data;
    console.log(`   ✅ User created: ${newUser.user_id}`);
    console.log(`   📧 Email: ${newUser.email}`);
    console.log(`   🔢 Logins: ${newUser.logins_count || 0}`);

    // Step 5: Test tickets endpoint manually (the correct new approach)
    console.log('\n5️⃣ Testing tickets endpoint...');
    const ticketUrl = `https://${config.AUTH0_DOMAIN}/api/v2/tickets/password-change`;
    const ticketData = {
      user_id: newUser.user_id,
      result_url: 'https://da389rkfiajdk.cloudfront.net',
      ttl_sec: 432000
    };

    console.log(`   📡 Calling: POST ${ticketUrl}`);
    console.log(`   📦 Payload:`, JSON.stringify(ticketData, null, 2));

    try {
      const ticketResponse = await axios.post(ticketUrl, ticketData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   ✅ Tickets API call successful!`);
      console.log(`   📊 Status: ${ticketResponse.status}`);
      console.log(`   🎫 Ticket URL: ${ticketResponse.data.ticket}`);
      
    } catch (ticketError) {
      console.log(`   ❌ Tickets API call failed!`);
      console.log(`   📊 Status: ${ticketError.response?.status}`);
      console.log(`   📄 Error:`, JSON.stringify(ticketError.response?.data, null, 2));
    }

    // Step 6: Test full invitation flow
    console.log('\n6️⃣ Testing full invitation flow...');
    try {
      // Delete the test user first
      const deleteUrl = `https://${config.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(newUser.user_id)}`;
      await axios.delete(deleteUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('   🗑️ Test user deleted for clean test');

      // Now test the full flow
      const result = await inviteAuth0User(TEST_EMAIL, 'Test', 'User', ['user']);
      console.log('   ✅ Full invitation flow completed!');
      console.log('   📧 Email sent:', result.inviteEmailSent);
      if (result.inviteEmailError) {
        console.log('   ❌ Email error:', result.inviteEmailError);
      }
      
    } catch (inviteError) {
      console.log('   ❌ Full invitation flow failed:', inviteError.message);
    }

    console.log('\n🎉 Debug completed! Check Auth0 logs for email delivery status.');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the debug
debugInvitationFlow();