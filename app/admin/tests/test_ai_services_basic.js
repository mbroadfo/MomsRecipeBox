// File: test_ai_services_basic.js
// Simple test without authentication to verify the endpoint exists

import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testBasicEndpoint() {
  console.log('🧪 Testing AI Services Status Endpoint (Basic Test)\n');
  
  try {
    // Test without authentication to see if endpoint exists
    console.log('📊 Testing endpoint availability...');
    const response = await axios.get(`${BASE_URL}/admin/ai-services-status`);
    
    console.log('✅ Endpoint is accessible!');
    console.log('Status:', response.status);
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Endpoint exists and requires authentication (expected)');
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else if (error.response?.status === 404) {
      console.log('❌ Endpoint not found - route may not be registered');
      console.log('Status:', error.response.status);
    } else {
      console.log('❌ Unexpected error:');
      console.log('Status:', error.response?.status || 'No response');
      console.log('Error:', error.message);
      if (error.response?.data) {
        console.log('Response data:', error.response.data);
      }
    }
  }
}

// Test if server is running
async function testServerHealth() {
  try {
    console.log('🏥 Testing server health...');
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running');
    console.log('Health response:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Server may not be running:');
    console.log('Error:', error.message);
    return false;
  }
}

async function runTests() {
  const serverRunning = await testServerHealth();
  if (serverRunning) {
    console.log('\n' + '='.repeat(60) + '\n');
    await testBasicEndpoint();
  }
}

runTests();
