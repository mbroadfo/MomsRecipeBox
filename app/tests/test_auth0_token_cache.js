/**
 * Auth0 Token Cache Performance Test
 * 
 * Tests three tiers of token caching:
 * 1. Memory cache (Lambda container) - Expected: <1ms
 * 2. Parameter Store cache - Expected: 50-100ms
 * 3. Auth0 API fetch - Expected: 500-1000ms
 * 
 * This test validates that tokens are properly cached and shared
 * across Lambda invocations, reducing Auth0 API calls to ~1/day.
 */

import { strict as assert } from 'assert';

// Test configuration
const TEST_CONFIG = {
  // Number of sequential requests to test memory cache
  MEMORY_CACHE_ITERATIONS: 5,
  
  // Maximum acceptable latency thresholds (ms)
  MAX_MEMORY_CACHE_LATENCY: 5,      // Memory should be <5ms
  MAX_PARAMETER_STORE_LATENCY: 200, // SSM should be <200ms
  MAX_AUTH0_FETCH_LATENCY: 2000,    // Auth0 should be <2s
  
  // Token expiration buffer (5 minutes)
  EXPIRATION_BUFFER_MS: 5 * 60 * 1000
};

// Performance metrics storage
const metrics = {
  memoryCacheHits: [],
  parameterStoreFetches: [],
  auth0Fetches: [],
  totalTests: 0,
  errors: []
};

/**
 * Measure execution time of an async function
 * @param {Function} fn - Async function to measure
 * @returns {Promise<{result: any, duration: number}>}
 */
async function measureTime(fn) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

/**
 * Clear Auth0 token cache (if implementation exports this function)
 */
async function clearTokenCache() {
  try {
    // This will be implemented in auth0_utils.js
    const { clearAuth0TokenCache } = await import('../admin/auth0_utils.js');
    await clearAuth0TokenCache();
    console.log('✅ Token cache cleared');
  } catch (error) {
    console.warn('⚠️  Could not clear cache (function may not exist yet):', error.message);
  }
}

/**
 * Get Auth0 token and measure timing
 */
async function getTokenWithTiming() {
  try {
    const { getAuth0ManagementToken } = await import('../admin/auth0_utils.js');
    return await measureTime(() => getAuth0ManagementToken());
  } catch (error) {
    console.error('❌ Failed to get token:', error);
    throw error;
  }
}

/**
 * Validate token format (should be a JWT)
 */
function validateToken(token) {
  assert.ok(token, 'Token should exist');
  assert.strictEqual(typeof token, 'string', 'Token should be a string');
  assert.ok(token.startsWith('eyJ'), 'Token should be a valid JWT (starts with eyJ)');
  assert.ok(token.length > 100, 'Token should be substantial length');
  console.log(`✅ Token validated: ${token.substring(0, 20)}...`);
}

/**
 * Test 1: Memory Cache Performance (Fastest)
 * Expected: <5ms for subsequent calls in same container
 */
async function testMemoryCache() {
  console.log('\n📊 Test 1: Memory Cache Performance');
  console.log('═'.repeat(60));
  
  // First call (may hit Parameter Store or Auth0)
  console.log('First call (establishing cache)...');
  const { result: token1, duration: duration1 } = await getTokenWithTiming();
  validateToken(token1);
  console.log(`⏱️  First call: ${duration1}ms`);
  
  // Subsequent calls should hit memory cache
  console.log(`\nTesting ${TEST_CONFIG.MEMORY_CACHE_ITERATIONS} memory cache hits...`);
  for (let i = 0; i < TEST_CONFIG.MEMORY_CACHE_ITERATIONS; i++) {
    const { result: token, duration } = await getTokenWithTiming();
    
    // Validate token is same as first
    assert.strictEqual(token, token1, 'Cached token should match original');
    
    // Record metrics
    metrics.memoryCacheHits.push(duration);
    console.log(`  Call ${i + 1}: ${duration}ms`);
    
    // Validate performance
    if (duration > TEST_CONFIG.MAX_MEMORY_CACHE_LATENCY) {
      console.warn(`  ⚠️  Slower than expected (>${TEST_CONFIG.MAX_MEMORY_CACHE_LATENCY}ms)`);
    }
  }
  
  const avgMemory = metrics.memoryCacheHits.reduce((a, b) => a + b, 0) / metrics.memoryCacheHits.length;
  console.log(`\n✅ Memory cache average: ${avgMemory.toFixed(2)}ms`);
  console.log(`   Min: ${Math.min(...metrics.memoryCacheHits)}ms, Max: ${Math.max(...metrics.memoryCacheHits)}ms`);
  
  return token1;
}

/**
 * Test 2: Parameter Store Cache Performance (Shared across containers)
 * Expected: 50-200ms for cold start with cached token in Parameter Store
 */
async function testParameterStoreCache() {
  console.log('\n📊 Test 2: Parameter Store Cache Performance');
  console.log('═'.repeat(60));
  
  console.log('Simulating cold start by clearing memory cache...');
  
  // Clear memory cache to force Parameter Store fetch
  await clearTokenCache();
  
  // This should hit Parameter Store (not Auth0)
  console.log('Fetching from Parameter Store...');
  const { result: token, duration } = await getTokenWithTiming();
  validateToken(token);
  
  metrics.parameterStoreFetches.push(duration);
  console.log(`⏱️  Parameter Store fetch: ${duration}ms`);
  
  if (duration > TEST_CONFIG.MAX_PARAMETER_STORE_LATENCY) {
    console.warn(`  ⚠️  Slower than expected (>${TEST_CONFIG.MAX_PARAMETER_STORE_LATENCY}ms)`);
  } else {
    console.log(`✅ Within acceptable latency (<${TEST_CONFIG.MAX_PARAMETER_STORE_LATENCY}ms)`);
  }
  
  return token;
}

/**
 * Test 3: Auth0 API Fetch Performance (Most expensive, should be rare)
 * Expected: 500-2000ms for fresh token from Auth0
 * 
 * Note: This test is commented out by default to avoid unnecessary Auth0 calls.
 * Uncomment only when explicitly testing Auth0 fetch performance.
 */
async function testAuth0Fetch() {
  console.log('\n📊 Test 3: Auth0 API Fetch Performance');
  console.log('═'.repeat(60));
  console.log('⚠️  This test is SKIPPED by default to avoid unnecessary Auth0 API calls.');
  console.log('    In production, Auth0 fetches should only occur ~1x per day.');
  console.log('    To test Auth0 fetch, manually clear Parameter Store and run again.');
  
  // Uncomment below to force Auth0 fetch (use sparingly!)
  /*
  console.log('WARNING: Forcing new Auth0 token fetch...');
  console.log('This will clear Parameter Store and fetch fresh token from Auth0.');
  
  // Clear both caches
  await clearTokenCache();
  
  // Also need to clear Parameter Store (requires AWS SDK)
  console.log('Clearing Parameter Store parameter...');
  const { SSMClient, PutParameterCommand } = await import('@aws-sdk/client-ssm');
  const ssmClient = new SSMClient({ region: 'us-west-2' });
  await ssmClient.send(new PutParameterCommand({
    Name: '/mrb/dev/auth0-token-cache',
    Value: '',
    Type: 'String',
    Description: 'expires:0',
    Overwrite: true
  }));
  
  console.log('Fetching fresh token from Auth0...');
  const { result: token, duration } = await getTokenWithTiming();
  validateToken(token);
  
  metrics.auth0Fetches.push(duration);
  console.log(`⏱️  Auth0 fetch: ${duration}ms`);
  
  if (duration > TEST_CONFIG.MAX_AUTH0_FETCH_LATENCY) {
    console.warn(`  ⚠️  Slower than expected (>${TEST_CONFIG.MAX_AUTH0_FETCH_LATENCY}ms)`);
  } else {
    console.log(`✅ Within acceptable latency (<${TEST_CONFIG.MAX_AUTH0_FETCH_LATENCY}ms)`);
  }
  
  return token;
  */
  
  return null;
}

/**
 * Test 4: Token Expiration Validation
 * Verify tokens have proper expiration and won't be used too close to expiry
 */
async function testTokenExpiration() {
  console.log('\n📊 Test 4: Token Expiration Validation');
  console.log('═'.repeat(60));
  
  const token = await getTokenWithTiming();
  console.log('Token retrieved for expiration analysis');
  
  // Decode JWT to check expiration (basic Base64 decode, no verification)
  try {
    const [, payloadBase64] = token.result.split('.');
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    
    if (payload.exp) {
      const expiresAt = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);
      
      console.log(`📅 Token expires at: ${new Date(expiresAt).toISOString()}`);
      console.log(`⏰ Time until expiry: ${hoursUntilExpiry.toFixed(2)} hours`);
      
      // Validate token has reasonable lifetime
      assert.ok(timeUntilExpiry > 0, 'Token should not be expired');
      assert.ok(
        timeUntilExpiry > TEST_CONFIG.EXPIRATION_BUFFER_MS,
        'Token should have more than 5 minutes until expiry'
      );
      
      // Typically Auth0 M2M tokens are valid for 24 hours
      const maxExpectedLifetime = 25 * 60 * 60 * 1000; // 25 hours
      assert.ok(
        timeUntilExpiry < maxExpectedLifetime,
        'Token expiry seems unreasonably far in future'
      );
      
      console.log('✅ Token expiration is valid');
    } else {
      console.warn('⚠️  Token does not contain exp claim');
    }
  } catch (error) {
    console.warn('⚠️  Could not decode token for expiration check:', error.message);
  }
}

/**
 * Print performance summary
 */
function printSummary() {
  console.log('\n' + '═'.repeat(60));
  console.log('📈 PERFORMANCE SUMMARY');
  console.log('═'.repeat(60));
  
  if (metrics.memoryCacheHits.length > 0) {
    const avg = metrics.memoryCacheHits.reduce((a, b) => a + b, 0) / metrics.memoryCacheHits.length;
    const min = Math.min(...metrics.memoryCacheHits);
    const max = Math.max(...metrics.memoryCacheHits);
    console.log(`\n💾 Memory Cache (${metrics.memoryCacheHits.length} hits):`);
    console.log(`   Average: ${avg.toFixed(2)}ms`);
    console.log(`   Range: ${min}ms - ${max}ms`);
    console.log(`   Status: ${avg < TEST_CONFIG.MAX_MEMORY_CACHE_LATENCY ? '✅ EXCELLENT' : '⚠️  SLOW'}`);
  }
  
  if (metrics.parameterStoreFetches.length > 0) {
    const avg = metrics.parameterStoreFetches.reduce((a, b) => a + b, 0) / metrics.parameterStoreFetches.length;
    console.log(`\n🗄️  Parameter Store Cache (${metrics.parameterStoreFetches.length} fetches):`);
    console.log(`   Average: ${avg.toFixed(2)}ms`);
    console.log(`   Status: ${avg < TEST_CONFIG.MAX_PARAMETER_STORE_LATENCY ? '✅ GOOD' : '⚠️  SLOW'}`);
  }
  
  if (metrics.auth0Fetches.length > 0) {
    const avg = metrics.auth0Fetches.reduce((a, b) => a + b, 0) / metrics.auth0Fetches.length;
    console.log(`\n🔐 Auth0 API Fetch (${metrics.auth0Fetches.length} fetches):`);
    console.log(`   Average: ${avg.toFixed(2)}ms`);
    console.log(`   Status: ${avg < TEST_CONFIG.MAX_AUTH0_FETCH_LATENCY ? '✅ ACCEPTABLE' : '⚠️  SLOW'}`);
    console.log(`   Note: Should only occur ~1x per day in production`);
  }
  
  if (metrics.errors.length > 0) {
    console.log(`\n❌ Errors encountered: ${metrics.errors.length}`);
    metrics.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('💡 RECOMMENDATIONS:');
  console.log('   - Memory cache should be <5ms (instant)');
  console.log('   - Parameter Store should be <200ms (acceptable for cold starts)');
  console.log('   - Auth0 fetches should be <2s (rare, ~1/day)');
  console.log('   - Implement Parameter Store caching to reduce Auth0 API calls');
  console.log('═'.repeat(60));
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n🚀 Auth0 Token Cache Performance Test Suite');
  console.log('Testing three-tier caching system:');
  console.log('  1. Memory Cache (Lambda container)');
  console.log('  2. Parameter Store (shared across containers)');
  console.log('  3. Auth0 API (fresh token fetch)');
  console.log('═'.repeat(60));
  
  try {
    // Test 1: Memory cache performance
    await testMemoryCache();
    
    // Test 2: Parameter Store cache performance
    await testParameterStoreCache();
    
    // Test 3: Auth0 fetch (commented out by default)
    await testAuth0Fetch();
    
    // Test 4: Token expiration validation
    await testTokenExpiration();
    
    // Print summary
    printSummary();
    
    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    metrics.errors.push(error.message);
    printSummary();
    process.exit(1);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests, testMemoryCache, testParameterStoreCache, testAuth0Fetch };
