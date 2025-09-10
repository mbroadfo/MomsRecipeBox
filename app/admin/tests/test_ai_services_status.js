// File: test_ai_services_status.js
import axios from 'axios';
import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function getToken() {
  try {
    // Try to get a token from the admin test token script
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('node admin/get-test-token.js', { cwd: process.cwd() });
    const token = stdout.trim();
    
    if (token && token.startsWith('eyJ')) {
      return token;
    }
    
    throw new Error('Invalid token format');
  } catch (error) {
    console.error('Failed to get test token:', error.message);
    console.log('Please ensure you have admin credentials configured and run this from the app directory');
    process.exit(1);
  }
}

async function testAIServicesStatus() {
  console.log('🧪 Testing AI Services Status Endpoint\n');
  
  try {
    const token = await getToken();
    console.log('✅ Got admin token\n');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Test 1: Basic status check (no connectivity test)
    console.log('📊 Test 1: Basic AI Services Status');
    const basicResponse = await axios.get(`${BASE_URL}/admin/ai-services-status`, { headers });
    
    console.log('Status:', basicResponse.status);
    console.log('Response:');
    console.log(JSON.stringify(basicResponse.data, null, 2));
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 2: With connectivity testing
    console.log('🔌 Test 2: AI Services Status with Connectivity Testing');
    const connectivityResponse = await axios.get(`${BASE_URL}/admin/ai-services-status?test=true`, { headers });
    
    console.log('Status:', connectivityResponse.status);
    console.log('Response:');
    console.log(JSON.stringify(connectivityResponse.data, null, 2));
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 3: Including unavailable providers
    console.log('📋 Test 3: AI Services Status including unavailable providers');
    const allProvidersResponse = await axios.get(`${BASE_URL}/admin/ai-services-status?test=true&includeUnavailable=true`, { headers });
    
    console.log('Status:', allProvidersResponse.status);
    console.log('Response:');
    console.log(JSON.stringify(allProvidersResponse.data, null, 2));
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 4: Compare with old system status
    console.log('🔄 Test 4: Updated System Status (should exclude AI)');
    const systemResponse = await axios.get(`${BASE_URL}/admin/system-status`, { headers });
    
    console.log('Status:', systemResponse.status);
    console.log('Response:');
    console.log(JSON.stringify(systemResponse.data, null, 2));
    
    console.log('\n✅ All tests completed successfully!');
    
    // Summary
    const aiData = connectivityResponse.data;
    console.log('\n📈 AI Services Summary:');
    console.log(`- Total providers: ${aiData.summary.total}`);
    console.log(`- Operational: ${aiData.summary.operational}`);
    console.log(`- Configured: ${aiData.summary.configured}`);
    console.log(`- Rate limited: ${aiData.summary.rateLimited}`);
    console.log(`- Errors: ${aiData.summary.errors}`);
    console.log(`- Unavailable: ${aiData.summary.unavailable}`);
    console.log(`- Overall status: ${aiData.overallStatus}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

// Run the test
testAIServicesStatus();
