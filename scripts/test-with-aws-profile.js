#!/usr/bin/env node

/**
 * Test Wrapper with Automatic AWS Profile Management
 * 
 * This script ensures tests always run with the correct AWS profile (mrb-api)
 * and sets the PowerShell environment variable automatically.
 * 
 * Usage: node scripts/test-with-aws-profile.js [test-command]
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔧 Setting up AWS profile for tests...');

try {
  // 1. Set AWS profile using the Node.js script
  console.log('📡 Setting AWS profile to mrb-api...');
  execSync('npm run aws:mrb-api', { 
    cwd: rootDir, 
    stdio: 'inherit' 
  });

  // 2. Set PowerShell environment variable
  console.log('🔧 Setting PowerShell AWS_PROFILE environment variable...');
  execSync('powershell -Command "$env:AWS_PROFILE=\'mrb-api\'"', { 
    cwd: rootDir, 
    stdio: 'inherit' 
  });

  // 3. Verify AWS profile is set correctly
  console.log('✅ Verifying AWS profile...');
  const identity = execSync('aws sts get-caller-identity', { 
    cwd: rootDir, 
    encoding: 'utf8' 
  });
  
  const identityObj = JSON.parse(identity);
  if (!identityObj.Arn.includes('mrb-api')) {
    throw new Error(`Wrong AWS profile! Expected mrb-api, got: ${identityObj.Arn}`);
  }
  
  console.log(`✅ AWS Profile verified: ${identityObj.Arn}`);

  // 4. Run the actual test command
  const testCommand = process.argv[2] || 'cd app/tests && npm run test';
  console.log(`🧪 Running tests: ${testCommand}`);
  
  execSync(testCommand, { 
    cwd: rootDir, 
    stdio: 'inherit',
    env: {
      ...process.env,
      AWS_PROFILE: 'mrb-api',
      APP_MODE: 'lambda'
    }
  });

  console.log('✅ Tests completed successfully!');

} catch (error) {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
}