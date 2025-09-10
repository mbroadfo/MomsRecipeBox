// File: test_response_times.js
// Test the new response time functionality

import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testResponseTimes() {
  console.log('⏱️ Testing AI Services Response Time Functionality\n');
  
  try {
    // Test 1: Basic status (should show N/A for response times)
    console.log('📊 Test 1: Basic Status (No Response Times)');
    const basicResponse = await axios.get(`${BASE_URL}/admin/ai-services-status`);
    
    console.log('✅ Status:', basicResponse.status);
    console.log('Response times for basic check:');
    basicResponse.data.providers.forEach(provider => {
      console.log(`   ${provider.name}: ${provider.responseTime}`);
    });
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 2: Connectivity testing with response times
    console.log('🔌 Test 2: Connectivity Testing (With Response Times)');
    const connectivityResponse = await axios.get(`${BASE_URL}/admin/ai-services-status?test=true`);
    
    console.log('✅ Status:', connectivityResponse.status);
    console.log('Individual provider response times:');
    connectivityResponse.data.providers.forEach(provider => {
      const statusIcon = provider.status === 'operational' ? '🟢' : 
                        provider.status === 'error' ? '🔴' : 
                        provider.status === 'rate_limited' ? '🟠' : '⚫';
      console.log(`   ${statusIcon} ${provider.name}: ${provider.responseTime} (${provider.status})`);
    });
    
    // Show timing statistics if available
    if (connectivityResponse.data.timing) {
      console.log('\n📈 Aggregate Timing Statistics:');
      const timing = connectivityResponse.data.timing;
      console.log(`   Providers tested: ${timing.tested}`);
      console.log(`   Fastest response: ${timing.fastest}`);
      console.log(`   Slowest response: ${timing.slowest}`);
      console.log(`   Average response: ${timing.average}`);
      console.log(`   Total test time: ${timing.totalTime}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 3: Performance comparison
    console.log('🏎️ Test 3: Performance Comparison');
    
    const start1 = Date.now();
    await axios.get(`${BASE_URL}/admin/ai-services-status`);
    const basicTime = Date.now() - start1;
    
    const start2 = Date.now();
    const detailedResponse = await axios.get(`${BASE_URL}/admin/ai-services-status?test=true`);
    const testTime = Date.now() - start2;
    
    console.log(`Endpoint response times:`);
    console.log(`   Basic status check: ${basicTime}ms`);
    console.log(`   With connectivity testing: ${testTime}ms`);
    console.log(`   Testing overhead: ${testTime - basicTime}ms`);
    
    // Calculate efficiency metrics
    if (detailedResponse.data.timing) {
      const timing = detailedResponse.data.timing;
      const totalProviderTime = parseInt(timing.totalTime.replace('ms', ''));
      const overhead = testTime - totalProviderTime;
      console.log(`   Provider testing time: ${timing.totalTime}`);
      console.log(`   Framework overhead: ${overhead}ms`);
      console.log(`   Efficiency: ${Math.round((totalProviderTime / testTime) * 100)}% provider testing`);
    }
    
    console.log('\n✅ Response time testing completed successfully!');
    
    // Summary insights
    console.log('\n🎯 Performance Insights:');
    if (connectivityResponse.data.timing) {
      const timing = connectivityResponse.data.timing;
      const fastest = parseInt(timing.fastest.replace('ms', ''));
      const slowest = parseInt(timing.slowest.replace('ms', ''));
      const average = parseInt(timing.average.replace('ms', ''));
      
      console.log(`   Most responsive provider: ${timing.fastest}`);
      console.log(`   Least responsive provider: ${timing.slowest}`);
      console.log(`   Performance variation: ${Math.round(((slowest - fastest) / fastest) * 100)}% difference`);
      
      if (average < 1000) {
        console.log(`   🟢 Excellent average response time: ${timing.average}`);
      } else if (average < 3000) {
        console.log(`   🟡 Good average response time: ${timing.average}`);
      } else {
        console.log(`   🟠 Slow average response time: ${timing.average}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

testResponseTimes();
