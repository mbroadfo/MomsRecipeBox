/**
 * Integration test for Phase 4.1 UI Environment Configuration
 * Validates environment detection and API client configuration
 */

// Test environment configuration
console.log('=== Phase 4.1 Environment Integration Test ===');

// Import our configuration modules
import { config, isDevelopment, isLocalBackend, isCloudBackend, getApiUrl, devLog } from '../src/config/environment.js';
import { apiClient } from '../src/lib/api-client.js';

// Test 1: Environment Detection
console.log('\n1. Environment Detection:');
console.log(`   Current Environment: ${config.environment}`);
console.log(`   API Base URL: ${config.API_BASE_URL}`);
console.log(`   API Timeout: ${config.API_TIMEOUT}ms`);
console.log(`   Is Production: ${config.isProduction}`);
console.log(`   Dev Tools Enabled: ${config.enableDevTools}`);

// Test 2: Helper Functions
console.log('\n2. Helper Functions:');
console.log(`   isDevelopment(): ${isDevelopment()}`);
console.log(`   isLocalBackend(): ${isLocalBackend()}`);
console.log(`   isCloudBackend(): ${isCloudBackend()}`);

// Test 3: API URL Construction
console.log('\n3. API URL Construction:');
console.log(`   getApiUrl(): ${getApiUrl()}`);
console.log(`   getApiUrl('health'): ${getApiUrl('health')}`);
console.log(`   getApiUrl('/recipes'): ${getApiUrl('/recipes')}`);
console.log(`   getApiUrl('admin/stats'): ${getApiUrl('admin/stats')}`);

// Test 4: Environment Variables
console.log('\n4. Environment Variables:');
console.log(`   VITE_ENVIRONMENT: ${import.meta.env.VITE_ENVIRONMENT || 'not set'}`);
console.log(`   VITE_API_URL_LOCAL: ${import.meta.env.VITE_API_URL_LOCAL || 'not set'}`);
console.log(`   VITE_API_URL_LAMBDA: ${import.meta.env.VITE_API_URL_LAMBDA || 'not set'}`);
console.log(`   DEV mode: ${import.meta.env.DEV}`);
console.log(`   PROD mode: ${import.meta.env.PROD}`);

// Test 5: API Client Configuration
console.log('\n5. API Client Configuration:');
console.log(`   Base URL configured: ${config.API_BASE_URL}`);

// Test 6: Development Logging
console.log('\n6. Development Logging Test:');
devLog('This is a development log message - should only appear in non-production');

// Test 7: Expected Environment Behaviors
console.log('\n7. Environment Behavior Validation:');

const expectedBehaviors = {
  local: {
    apiUrl: 'http://localhost:3000',
    timeout: 10000,
    isProduction: false,
    enableDevTools: true,
    isLocal: true,
    isCloud: false
  },
  atlas: {
    apiUrl: 'http://localhost:3000',
    timeout: 10000,
    isProduction: false,
    enableDevTools: true,
    isLocal: true,
    isCloud: false
  },
  lambda: {
    apiUrl: /amazonaws\.com/,
    timeout: 15000,
    isProduction: false,
    enableDevTools: true,
    isLocal: false,
    isCloud: true
  },
  production: {
    apiUrl: /amazonaws\.com/,
    timeout: 15000,
    isProduction: true,
    enableDevTools: false,
    isLocal: false,
    isCloud: true
  }
};

const expected = expectedBehaviors[config.environment];
if (expected) {
  const validations = [
    { name: 'API URL', expected: expected.apiUrl, actual: config.API_BASE_URL },
    { name: 'Timeout', expected: expected.timeout, actual: config.API_TIMEOUT },
    { name: 'Is Production', expected: expected.isProduction, actual: config.isProduction },
    { name: 'Dev Tools', expected: expected.enableDevTools, actual: config.enableDevTools },
    { name: 'Is Local Backend', expected: expected.isLocal, actual: isLocalBackend() },
    { name: 'Is Cloud Backend', expected: expected.isCloud, actual: isCloudBackend() },
  ];
  
  let passed = 0;
  validations.forEach(({ name, expected, actual }) => {
    const isMatch = expected instanceof RegExp ? expected.test(actual) : expected === actual;
    console.log(`   ${name}: ${isMatch ? '✅' : '❌'} (expected: ${expected}, actual: ${actual})`);
    if (isMatch) passed++;
  });
  
  console.log(`\n   Validation Summary: ${passed}/${validations.length} tests passed`);
} else {
  console.log('   ❌ Unknown environment - no validation available');
}

console.log('\n=== Integration Test Complete ===\n');

// Export test results for potential automated testing
export const testResults = {
  environment: config.environment,
  apiBaseUrl: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
  isProduction: config.isProduction,
  enableDevTools: config.enableDevTools,
  isDevelopment: isDevelopment(),
  isLocalBackend: isLocalBackend(),
  isCloudBackend: isCloudBackend(),
};