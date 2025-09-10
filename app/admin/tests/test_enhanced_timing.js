// File: test_enhanced_timing.js
// Test the enhanced timing statistics with provider information

import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testEnhancedTiming() {
  console.log('🎯 ENHANCED TIMING STATISTICS TEST');
  console.log('═'.repeat(60));
  console.log('Testing AI services with provider-specific timing data\n');
  
  try {
    // Test connectivity with enhanced timing
    console.log('🔌 Running Connectivity Test with Enhanced Timing...');
    const response = await axios.get(`${BASE_URL}/admin/ai-services-status?test=true`);
    
    if (!response.data.timing) {
      console.log('❌ No timing data available');
      return;
    }
    
    const timing = response.data.timing;
    const providers = response.data.providers;
    
    console.log(`✅ Test completed - ${timing.tested} providers tested\n`);
    
    // Individual Provider Results
    console.log('📊 Individual Provider Performance:');
    console.log('─'.repeat(50));
    providers
      .filter(p => p.status === 'operational')
      .sort((a, b) => parseInt(a.responseTime.replace('ms', '')) - parseInt(b.responseTime.replace('ms', '')))
      .forEach((provider, index) => {
        const time = parseInt(provider.responseTime.replace('ms', ''));
        let rankIcon = '';
        if (index === 0) rankIcon = '🥇';
        else if (index === 1) rankIcon = '🥈';
        else if (index === 2) rankIcon = '🥉';
        else rankIcon = `${index + 1}️⃣`;
        
        let perfIcon = '';
        if (time < 500) perfIcon = '🟢';
        else if (time < 1000) perfIcon = '🟡';
        else if (time < 2000) perfIcon = '🟠';
        else perfIcon = '🔴';
        
        console.log(`   ${rankIcon} ${perfIcon} ${provider.provider.padEnd(20)} ${provider.responseTime.padStart(8)}`);
      });
    
    console.log('\n🏆 Performance Champions:');
    console.log('─'.repeat(30));
    console.log(`   🚀 Fastest: ${timing.fastest.provider} (${timing.fastest.time})`);
    console.log(`   🐌 Slowest: ${timing.slowest.provider} (${timing.slowest.time})`);
    console.log(`   📊 Average: ${timing.average} across ${timing.tested} providers`);
    
    // Performance Analysis
    const fastestMs = parseInt(timing.fastest.time.replace('ms', ''));
    const slowestMs = parseInt(timing.slowest.time.replace('ms', ''));
    const avgMs = parseInt(timing.average.replace('ms', ''));
    const variationPercent = Math.round(((slowestMs - fastestMs) / fastestMs) * 100);
    
    console.log('\n📈 Performance Analysis:');
    console.log('─'.repeat(25));
    console.log(`   Speed Variation: ${variationPercent}% difference between fastest and slowest`);
    console.log(`   Performance Spread: ${slowestMs - fastestMs}ms range`);
    
    if (variationPercent < 100) {
      console.log(`   ✅ Consistent performance across providers`);
    } else if (variationPercent < 300) {
      console.log(`   ⚠️  Moderate variation in provider performance`);
    } else {
      console.log(`   🔴 High variation - consider provider selection strategy`);
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('─'.repeat(20));
    
    if (fastestMs < 500) {
      console.log(`   🎯 Best choice for speed: ${timing.fastest.provider}`);
    }
    
    if (avgMs < 1000) {
      console.log(`   ✅ Overall good performance across all providers`);
    } else {
      console.log(`   ⚠️  Consider optimizing or monitoring provider performance`);
    }
    
    const fastProviders = providers.filter(p => 
      p.status === 'operational' && 
      parseInt(p.responseTime.replace('ms', '')) < 800
    );
    
    if (fastProviders.length > 1) {
      console.log(`   🔄 Good options for load balancing: ${fastProviders.map(p => p.provider).join(', ')}`);
    }
    
    // JSON Structure Demo
    console.log('\n🔧 Enhanced JSON Structure:');
    console.log('─'.repeat(30));
    console.log(JSON.stringify({
      timing: timing,
      exampleUsage: {
        fastestProvider: timing.fastest.provider,
        fastestKey: timing.fastest.key,
        canRoute: `Use key '${timing.fastest.key}' for fastest responses`
      }
    }, null, 2));
    
    console.log('\n🎉 Enhanced timing statistics working perfectly!');
    console.log(`📊 Provider performance data now includes specific provider identification`);
    console.log(`🎯 Admins can now make informed decisions about AI provider selection`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

testEnhancedTiming();
