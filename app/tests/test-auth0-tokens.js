/**
 * Test Auth0 JWT Token Generation
 * 
 * This script tests the Auth0 token generation utility and validates
 * that tokens work with the API Gateway JWT authorizer.
 */

import { tokenGenerator, validateConfig } from './utils/auth0-token-generator.js';
import axios from 'axios';

const API_BASE_URL = process.env.APP_BASE_URL || 'https://b31emm78z4.execute-api.us-west-2.amazonaws.com/dev';

async function testTokenGeneration() {
    console.log('🔐 Testing Auth0 JWT Token Generation\n');

    try {
        // Step 1: Validate configuration
        console.log('1. Validating Auth0 configuration...');
        validateConfig();
        console.log('✅ Configuration valid\n');

        // Step 2: Generate token
        console.log('2. Generating Auth0 JWT token...');
        const token = await tokenGenerator.getToken();
        console.log(`✅ Token generated: ${token.substring(0, 50)}...\n`);

        // Step 3: Test token with API Gateway
        console.log('3. Testing token with API Gateway...');
        const bearerToken = await tokenGenerator.getBearerToken();
        
        const response = await axios.get(`${API_BASE_URL}/recipes`, {
            headers: {
                'Authorization': bearerToken
            },
            timeout: 10000
        });

        console.log(`✅ API Gateway responded with status: ${response.status}`);
        console.log(`✅ Response data: ${JSON.stringify(response.data).substring(0, 200)}...\n`);

        // Step 4: Test cached token
        console.log('4. Testing cached token...');
        const cachedToken = await tokenGenerator.getToken();
        console.log(`✅ Cached token retrieved: ${cachedToken.substring(0, 50)}...\n`);

        console.log('🎉 All tests passed! JWT authentication is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.response) {
            console.error('HTTP Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
        
        process.exit(1);
    }
}

// Run the test  
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    console.log('🔐 Testing Auth0 JWT Token Generation\n');
    testTokenGeneration();
}

export { testTokenGeneration };