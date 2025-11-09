#!/usr/bin/env node

/**
 * Test AI providers status endpoint
 */

import { getBearerToken } from '../app/tests/utils/auth0-token-generator.js';

// Automatically set AWS profile to mrb-api for testing
process.env.AWS_PROFILE = 'mrb-api';
console.log('🔧 AWS Profile automatically set to: mrb-api');

const LAMBDA_API_URL = 'https://b31emm78z4.execute-api.us-west-2.amazonaws.com/dev';

async function testAIProvidersStatus() {
  console.log('\n🔍 Testing AI providers status endpoint...');
  console.log(`🌐 API URL: ${LAMBDA_API_URL}`);

  try {
    // Get Auth0 token
    console.log('\n🔐 Getting Auth0 token...');
    const bearerToken = await getBearerToken();
    console.log('✅ Token obtained');

    // Test AI providers list endpoint
    console.log('\n📋 Testing /ai/providers endpoint...');
    const providersResponse = await fetch(`${LAMBDA_API_URL}/ai/providers`, {
      method: 'GET',
      headers: {
        'Authorization': bearerToken
      }
    });

    console.log(`📊 Status: ${providersResponse.status}`);

    if (providersResponse.status === 200) {
      const data = await providersResponse.json();
      console.log('\n✅ AI providers endpoint working!');
      console.log(`📄 Response:`, JSON.stringify(data, null, 2));

      if (data.providers && Array.isArray(data.providers)) {
        console.log(`\n📊 Available AI Providers (${data.providers.length}):`);
        data.providers.forEach(provider => {
          const icon = provider.status === 'available' ? '✅' :
                       provider.status === 'rate-limited' ? '⏳' : '❌';
          console.log(`   ${icon} ${provider.name} (${provider.key}): ${provider.status}`);
        });
      }
    } else {
      const text = await providersResponse.text();
      console.error(`❌ Providers endpoint failed: ${providersResponse.status}`);
      console.error(`Response: ${text}`);
    }

    // Test admin AI services status endpoint
    console.log('\n📊 Testing /admin/ai-services-status endpoint...');
    const adminResponse = await fetch(`${LAMBDA_API_URL}/admin/ai-services-status`, {
      method: 'GET',
      headers: {
        'Authorization': bearerToken
      }
    });

    console.log(`📊 Status: ${adminResponse.status}`);

    if (adminResponse.status === 200) {
      const adminData = await adminResponse.json();
      console.log('\n✅ Admin AI services status working!');
      console.log(`📄 Response:`, JSON.stringify(adminData, null, 2));
    } else {
      const text = await adminResponse.text();
      console.error(`❌ Admin endpoint failed: ${adminResponse.status}`);
      console.error(`Response: ${text}`);
    }

    console.log('\n🎉 AI providers testing complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testAIProvidersStatus();
