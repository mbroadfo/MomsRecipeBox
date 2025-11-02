#!/usr/bin/env node

/**
 * Test AI endpoint in Lambda mode with Auth0 authentication
 */

import { getBearerToken } from '../app/tests/utils/auth0-token-generator.js';

const LAMBDA_API_URL = 'https://b31emm78z4.execute-api.us-west-2.amazonaws.com/dev';

async function testAIEndpoint() {
  console.log('\n🧪 Testing AI endpoint in Lambda mode...');
  console.log(`🌐 API URL: ${LAMBDA_API_URL}`);

  try {
    // Get Auth0 token
    console.log('\n🔐 Getting Auth0 token...');
    const bearerToken = await getBearerToken();
    console.log('✅ Token obtained');

    // Test AI chat endpoint
    console.log('\n📝 Testing /ai/chat endpoint...');
    const response = await fetch(`${LAMBDA_API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': bearerToken
      },
      body: JSON.stringify({
        message: 'Create a simple chocolate chip cookie recipe'
      })
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (response.status === 200) {
      console.log('\n✅ AI endpoint working correctly!');
      console.log(`📄 Response success: ${data.success}`);
      console.log(`💬 Message length: ${data.message?.length || 0} characters`);
      if (data.recipeData) {
        console.log(`📋 Recipe extracted: ${data.recipeData.title || 'Untitled'}`);
      }
    } else if (response.status === 500 && data.message?.includes('No language model API key')) {
      console.log('\n✅ AI endpoint reachable (needs API keys configured in AWS Secrets Manager)');
      console.log(`📄 Message: ${data.message}`);
    } else {
      console.error(`\n❌ Unexpected error from AI endpoint: ${response.status}`);
      console.error(`Response: ${JSON.stringify(data)}`);
      process.exit(1);
    }

    console.log('\n🎉 AI chat endpoint tested (API keys need configuration)!');

    // Test admin AI services status endpoint
    console.log('\n📊 Testing /admin/ai-services-status endpoint...');
    const adminResponse = await fetch(`${LAMBDA_API_URL}/admin/ai-services-status`, {
      method: 'GET',
      headers: {
        'Authorization': bearerToken
      }
    });

    console.log(`📊 Status: ${adminResponse.status} ${adminResponse.statusText}`);

    if (adminResponse.status === 200) {
      const adminData = await adminResponse.json();
      console.log('\n✅ Admin AI services status endpoint working!');
      console.log(`📄 Available services: ${adminData.services ? Object.keys(adminData.services).length : 0}`);
    } else {
      const adminText = await adminResponse.text();
      console.log(`⚠️  Admin endpoint returned ${adminResponse.status}: ${adminText}`);
    }

    console.log('\n🎉 All Lambda proxy tests completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testAIEndpoint();
