#!/usr/bin/env node

/**
 * Lambda Connectivity Test
 * 
 * Modern replacement for run_tests.ps1 
 * Tests Lambda connectivity and permissions safely
 * 
 * Usage:
 *   node scripts/test-lambda.js [function-name]
 *   node scripts/test-lambda.js --no-invoke (skip function invocation)
 *   npm run test:lambda
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

// Color output functions
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Execute AWS CLI command
 */
async function runAwsCommand(args) {
  return new Promise((resolve, reject) => {
    const aws = spawn('aws', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    aws.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    aws.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    aws.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`AWS CLI failed: ${stderr}`));
      }
    });
  });
}

/**
 * Test Lambda function connectivity
 */
async function testLambda(functionName = 'mrb-app-api') {
  try {
    log(`=== Testing Lambda Function: ${functionName} ===`, 'cyan');

    // Ensure we're using the correct AWS profile
    process.env.AWS_PROFILE = 'mrb-api';
    log('🔧 Using AWS profile: mrb-api', 'blue');

    // First, just check if the function exists and get its info
    const infoArgs = ['lambda', 'get-function', '--function-name', functionName];
    
    log('🔍 Checking function information...', 'yellow');
    const functionInfo = await runAwsCommand(infoArgs);
    const info = JSON.parse(functionInfo);
    
    log(`✅ Function found: ${info.Configuration.FunctionName}`, 'green');
    log(`   Runtime: ${info.Configuration.Runtime || 'Container'}`, 'blue');
    log(`   State: ${info.Configuration.State}`, 'blue');
    log(`   Last Modified: ${info.Configuration.LastModified}`, 'blue');

    // Always invoke by default, unless --no-invoke is specified
    const skipInvoke = process.argv.includes('--no-invoke');
    
    if (!skipInvoke) {
      log('⚠️ Invoking function with empty payload...', 'yellow');
      
      // Use Windows-compatible null device
      const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
      
      const invokeArgs = [
        'lambda', 'invoke',
        '--function-name', functionName,
        '--payload', '{}',
        nullDevice,  // Don't write to file, just discard output
        '--cli-binary-format', 'raw-in-base64-out'
      ];

      await runAwsCommand(invokeArgs);
      log('✅ Function invoked successfully', 'green');
      
      return { status: 'success', message: 'Function invoked successfully' };
    } else {
      log('ℹ️ Function test completed (use --no-invoke flag to skip function invocation)', 'blue');
      return { status: 'success', message: 'Function exists and is accessible' };
    }

  } catch (error) {
    log(`❌ Lambda test failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Parse arguments, filtering out flags
    const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
    const functionName = args[0] || 'mrb-app-api';
    
    const results = await testLambda(functionName);
    
    // Exit with appropriate code based on results
    if (results && results.errorMessage) {
      process.exit(1);
    } else {
      log('\n✅ Lambda test completed successfully', 'green');
      process.exit(0);
    }
  } catch (error) {
    log(`❌ Test failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Only run if this file is executed directly
const currentFile = fileURLToPath(import.meta.url);
const scriptFile = resolve(process.argv[1] || '');

if (currentFile === scriptFile) {
  main();
}

export { testLambda };