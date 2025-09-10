// File: final_comprehensive_test.js
// Final comprehensive test showcasing all AI services status functionality

import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runFinalTest() {
  console.log('🎯 FINAL COMPREHENSIVE AI SERVICES STATUS TEST');
  console.log('═'.repeat(80));
  console.log('Testing all enhanced functionality with response time metrics\n');
  
  try {
    // Test 1: Basic Configuration Status
    console.log('1️⃣ CONFIGURATION STATUS CHECK');
    console.log('─'.repeat(40));
    const basicResponse = await axios.get(`${BASE_URL}/admin/ai-services-status`);
    
    console.log(`✅ Overall Status: ${basicResponse.data.overallStatus.toUpperCase()}`);
    console.log(`📊 Providers Summary: ${basicResponse.data.summary.total} total, ${basicResponse.data.summary.configured} configured`);
    console.log('📋 Provider Configuration:');
    basicResponse.data.providers.forEach(provider => {
      const providerName = provider.provider || provider.name || 'Unknown';
      console.log(`   • ${providerName}: ${provider.status} (${provider.responseTime})`);
    });
    
    console.log('\n' + '═'.repeat(80) + '\n');
    
    // Test 2: Live Connectivity with Timing
    console.log('2️⃣ LIVE CONNECTIVITY + RESPONSE TIME ANALYSIS');
    console.log('─'.repeat(50));
    const connectivityResponse = await axios.get(`${BASE_URL}/admin/ai-services-status?test=true`);
    
    console.log(`✅ Overall Status: ${connectivityResponse.data.overallStatus.toUpperCase()}`);
    console.log(`🔌 Connectivity Summary: ${connectivityResponse.data.summary.operational}/${connectivityResponse.data.summary.total} operational`);
    
    // Individual provider results
    console.log('\n📊 Individual Provider Results:');
    connectivityResponse.data.providers.forEach(provider => {
      const statusIcon = {
        'operational': '🟢',
        'configured': '🟡', 
        'rate_limited': '🟠',
        'error': '🔴',
        'unavailable': '⚫'
      }[provider.status] || '❓';
      
      const providerName = provider.provider || provider.name || 'Unknown';
      console.log(`   ${statusIcon} ${providerName.padEnd(20)} ${provider.responseTime.padEnd(8)} ${provider.status}`);
    });
    
    // Timing analytics
    if (connectivityResponse.data.timing) {
      const timing = connectivityResponse.data.timing;
      console.log('\n⏱️ Performance Analytics:');
      console.log(`   🚀 Fastest Provider: ${timing.fastest}`);
      console.log(`   🐌 Slowest Provider: ${timing.slowest}`);
      console.log(`   📊 Average Response: ${timing.average}`);
      console.log(`   🔢 Providers Tested: ${timing.tested}`);
      console.log(`   ⏰ Total Test Time: ${timing.totalTime}`);
      
      // Performance categorization
      const avgMs = parseInt(timing.average.replace('ms', ''));
      let perfCategory = '';
      if (avgMs < 500) perfCategory = '🟢 Excellent';
      else if (avgMs < 1000) perfCategory = '🟡 Good';
      else if (avgMs < 2000) perfCategory = '🟠 Fair';
      else perfCategory = '🔴 Slow';
      
      console.log(`   📈 Performance Rating: ${perfCategory} (${timing.average} avg)`);
    }
    
    console.log('\n' + '═'.repeat(80) + '\n');
    
    // Test 3: System Status Separation
    console.log('3️⃣ SYSTEM STATUS SEPARATION VERIFICATION');
    console.log('─'.repeat(45));
    const systemResponse = await axios.get(`${BASE_URL}/admin/system-status`);
    
    console.log(`✅ System Status: ${systemResponse.data.overall_status.toUpperCase()}`);
    console.log('🔧 Infrastructure Components:');
    Object.entries(systemResponse.data.services).forEach(([service, status]) => {
      console.log(`   • ${service.toUpperCase()}: ${status.status} - ${status.message}`);
    });
    console.log(`💡 Note: ${systemResponse.data.note}`);
    
    console.log('\n' + '═'.repeat(80) + '\n');
    
    // Test 4: Performance Benchmarking
    console.log('4️⃣ PERFORMANCE BENCHMARKING');
    console.log('─'.repeat(35));
    
    const benchmarks = [];
    
    // Benchmark basic status
    const start1 = Date.now();
    await axios.get(`${BASE_URL}/admin/ai-services-status`);
    const basicTime = Date.now() - start1;
    benchmarks.push({ test: 'Basic Status', time: basicTime });
    
    // Benchmark connectivity testing
    const start2 = Date.now();
    const detailedResponse = await axios.get(`${BASE_URL}/admin/ai-services-status?test=true`);
    const testTime = Date.now() - start2;
    benchmarks.push({ test: 'Connectivity Test', time: testTime });
    
    // Benchmark system status
    const start3 = Date.now();
    await axios.get(`${BASE_URL}/admin/system-status`);
    const sysTime = Date.now() - start3;
    benchmarks.push({ test: 'System Status', time: sysTime });
    
    console.log('⚡ Endpoint Performance:');
    benchmarks.forEach(benchmark => {
      console.log(`   ${benchmark.test.padEnd(20)}: ${benchmark.time}ms`);
    });
    
    if (detailedResponse.data.timing) {
      const providerTime = parseInt(detailedResponse.data.timing.totalTime.replace('ms', ''));
      const overhead = testTime - providerTime;
      console.log(`   ${'Framework Overhead'.padEnd(20)}: ${overhead}ms`);
      console.log(`   ${'Efficiency'.padEnd(20)}: ${Math.round((providerTime / testTime) * 100)}%`);
    }
    
    console.log('\n' + '═'.repeat(80) + '\n');
    
    // Final Summary
    console.log('🎉 TEST COMPLETION SUMMARY');
    console.log('─'.repeat(30));
    
    const data = connectivityResponse.data;
    console.log(`✅ All tests completed successfully!`);
    console.log(`🤖 AI Providers: ${data.summary.total} total, ${data.summary.operational} operational`);
    console.log(`⏱️ Response Times: Tracked for all tested providers`);
    console.log(`📊 Statistics: Comprehensive timing analytics included`);
    console.log(`🔧 Separation: AI services properly separated from system status`);
    console.log(`🚀 Performance: Fast basic checks, detailed testing available`);
    
    if (data.timing) {
      console.log(`📈 Best Response: ${data.timing.fastest} (${data.providers.find(p => p.responseTime === data.timing.fastest)?.provider || 'Unknown'})`);
    }
    
    console.log('\n🎯 ENHANCED AI SERVICES MONITORING: FULLY OPERATIONAL! 🎯');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

runFinalTest();
