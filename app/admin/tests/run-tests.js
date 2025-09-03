// Admin System - Test Runner
// Runs all admin system tests in sequence

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [
  {
    name: 'Connection Test',
    file: 'connection-test.js',
    description: 'Tests Auth0 M2M connectivity and Management API access'
  },
  {
    name: 'Functions Test', 
    file: 'functions-test.js',
    description: 'Tests admin function structure and file validation'
  },
  {
    name: 'JWT Integration Test',
    file: 'jwt-integration-test.js', 
    description: 'Tests JWT validation and endpoint configuration'
  }
];

function runTest(testFile) {
  return new Promise((resolve, reject) => {
    const testPath = path.join(__dirname, testFile);
    const child = spawn('node', [testPath], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Test failed with exit code ${code}`));
      }
    });
  });
}

async function runAllTests() {
  console.log('🧪 MomsRecipeBox - Admin System Test Suite');
  console.log('==========================================');
  console.log('');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n🔄 Running: ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log('─'.repeat(50));
    
    try {
      await runTest(test.file);
      console.log(`\n✅ ${test.name} - PASSED`);
      passed++;
    } catch (error) {
      console.log(`\n❌ ${test.name} - FAILED`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }
  
  // Summary
  console.log('📊 Test Results Summary');
  console.log('=======================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Total:  ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Admin system is ready.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(console.error);
