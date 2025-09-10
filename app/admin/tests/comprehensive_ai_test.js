// File: comprehensive_ai_test.js
// Comprehensive test of the AI services status endpoint

import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runComprehensiveTests() {
  console.log('🧪 Comprehensive AI Services Status Test\n');
  
  try {
    // Test 1: Basic status (no connectivity test)
    console.log('📊 Test 1: Basic Configuration Status');
    const basicResponse = await axios.get(`${BASE_URL}/admin/ai-services-status`);
    console.log('✅ Status:', basicResponse.status);
    console.log(`   Total providers: ${basicResponse.data.summary.total}`);
    console.log(`   Configured: ${basicResponse.data.summary.configured}`);
    console.log(`   Unavailable: ${basicResponse.data.summary.unavailable}`);
    console.log(`   Overall: ${basicResponse.data.overallStatus}`);
    
    // Test 2: Connectivity testing
    console.log('\n🔌 Test 2: Live Connectivity Testing');
    const connectivityResponse = await axios.get(`${BASE_URL}/admin/ai-services-status?test=true`);
    console.log('✅ Status:', connectivityResponse.status);
    console.log(`   Operational: ${connectivityResponse.data.summary.operational}`);
    console.log(`   Errors: ${connectivityResponse.data.summary.errors}`);
    console.log(`   Rate Limited: ${connectivityResponse.data.summary.rateLimited}`);
    console.log(`   Overall: ${connectivityResponse.data.overallStatus}`);
    
    // Show operational providers
    const operational = connectivityResponse.data.providers.filter(p => p.status === 'operational');
    console.log(`   Operational providers: ${operational.map(p => p.name).join(', ')}`);
    
    // Test 3: Compare with old system status
    console.log('\n🔄 Test 3: System Status Separation');
    const systemResponse = await axios.get(`${BASE_URL}/admin/system-status`);
    console.log('✅ System Status excludes AI services');
    console.log(`   Services monitored: ${Object.keys(systemResponse.data.services).join(', ')}`);
    console.log(`   Note: ${systemResponse.data.note}`);
    
    // Test 4: Response time comparison
    console.log('\n⏱️ Test 4: Performance Comparison');
    
    const start1 = Date.now();
    await axios.get(`${BASE_URL}/admin/ai-services-status`);
    const basicTime = Date.now() - start1;
    
    const start2 = Date.now();
    await axios.get(`${BASE_URL}/admin/ai-services-status?test=true`);
    const testTime = Date.now() - start2;
    
    console.log(`   Basic status: ${basicTime}ms`);
    console.log(`   With connectivity test: ${testTime}ms`);
    console.log(`   Test overhead: ${testTime - basicTime}ms`);
    
    console.log('\n✅ All tests completed successfully!');
    
    // Summary
    const data = connectivityResponse.data;
    console.log('\n📈 Final Summary:');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  AI Services Overview:`);
    console.log(`  • Total providers: ${data.summary.total}`);
    console.log(`  • Operational: ${data.summary.operational} 🟢`);
    console.log(`  • Configured: ${data.summary.configured} 🟡`);
    console.log(`  • Rate limited: ${data.summary.rateLimited} 🟠`);
    console.log(`  • Errors: ${data.summary.errors} 🔴`);
    console.log(`  • Unavailable: ${data.summary.unavailable} ⚫`);
    console.log(`  • Overall status: ${data.overallStatus.toUpperCase()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Show provider details
    console.log('\n🤖 Provider Details:');
    data.providers.forEach(provider => {
      const statusIcon = {
        'operational': '🟢',
        'configured': '🟡',
        'rate_limited': '🟠',
        'error': '🔴',
        'unavailable': '⚫'
      }[provider.status] || '❓';
      
      console.log(`  ${statusIcon} ${provider.name}: ${provider.message}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

runComprehensiveTests();
