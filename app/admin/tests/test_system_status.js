// Quick test for the new system status endpoint
import axios from 'axios';

async function testSystemStatus() {
  try {
    console.log('🔧 Testing System Status Endpoint');
    console.log('=================================\n');

    // Test the endpoint without authentication first to see structure
    const response = await axios.get('http://localhost:3000/admin/system-status', {
      timeout: 15000 // 15 second timeout for AI tests
    });

    console.log('✅ System Status Response:');
    console.log('Status Code:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));

    // Test specific service statuses
    const { services, overall_status } = response.data;
    
    console.log('\n📊 Service Status Summary:');
    console.log(`Overall Status: ${overall_status}`);
    console.log(`S3 Status: ${services.s3.status} - ${services.s3.message}`);
    console.log(`AI Status: ${services.ai.status} - ${services.ai.message}`);
    
    if (services.ai.provider) {
      console.log(`AI Provider: ${services.ai.provider}`);
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ HTTP Error:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('❌ Request Error:', error.message);
    }
  }
}

// Run the test
testSystemStatus();
