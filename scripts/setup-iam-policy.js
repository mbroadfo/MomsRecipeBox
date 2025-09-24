#!/usr/bin/env node

/**
 * IAM Policy Setup Helper
 * 
 * Creates the necessary IAM policy for mrb-api user to support modernized scripts
 * 
 * Usage:
 *   node scripts/setup-iam-policy.js [create|attach|status]
 *   npm run iam:setup
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { promises as fs } from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

// Color output functions
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const POLICY_NAME = 'MRBDevOpsOperations';
const USER_NAME = 'mrb-api';
const POLICY_FILE = path.join(projectRoot, 'docs', 'iam-policy-mrb-api-additional.json');

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
        reject(new Error(`AWS CLI failed (code ${code}): ${stderr}`));
      }
    });
  });
}

/**
 * Check if policy exists
 */
async function policyExists() {
  try {
    const accountId = '491696534851'; // Your account ID
    const policyArn = `arn:aws:iam::${accountId}:policy/${POLICY_NAME}`;
    
    await runAwsCommand(['iam', 'get-policy', '--policy-arn', policyArn]);
    return { exists: true, arn: policyArn };
  } catch (error) {
    if (error.message.includes('NoSuchEntity')) {
      return { exists: false, arn: null };
    }
    throw error;
  }
}

/**
 * Create IAM policy
 */
async function createPolicy() {
  try {
    log('📋 Creating IAM policy...', 'blue');
    
    // Read policy document
    const policyDoc = await fs.readFile(POLICY_FILE, 'utf8');
    
    const args = [
      'iam', 'create-policy',
      '--policy-name', POLICY_NAME,
      '--description', 'DevOps operations policy for MomsRecipeBox mrb-api user',
      '--policy-document', `file://${POLICY_FILE}`
    ];

    const result = await runAwsCommand(args);
    const policy = JSON.parse(result);
    
    log(`✅ Policy created: ${policy.Policy.PolicyName}`, 'green');
    log(`   ARN: ${policy.Policy.Arn}`, 'blue');
    
    return policy.Policy.Arn;

  } catch (error) {
    if (error.message.includes('EntityAlreadyExists')) {
      log(`⚠️ Policy ${POLICY_NAME} already exists`, 'yellow');
      return null;
    }
    throw error;
  }
}

/**
 * Attach policy to user
 */
async function attachPolicy(policyArn) {
  try {
    log(`🔗 Attaching policy to user ${USER_NAME}...`, 'blue');
    
    await runAwsCommand([
      'iam', 'attach-user-policy',
      '--user-name', USER_NAME,
      '--policy-arn', policyArn
    ]);
    
    log(`✅ Policy attached to user ${USER_NAME}`, 'green');

  } catch (error) {
    if (error.message.includes('NoSuchEntity')) {
      log(`❌ User ${USER_NAME} not found`, 'red');
      throw new Error(`User ${USER_NAME} does not exist`);
    }
    throw error;
  }
}

/**
 * Check current user policies
 */
async function checkUserPolicies() {
  try {
    log(`📊 Checking policies for user ${USER_NAME}...`, 'cyan');
    
    const attachedPolicies = await runAwsCommand([
      'iam', 'list-attached-user-policies',
      '--user-name', USER_NAME
    ]);
    
    const policies = JSON.parse(attachedPolicies);
    
    log(`Current attached policies for ${USER_NAME}:`, 'blue');
    policies.AttachedPolicies.forEach(policy => {
      const hasDevOps = policy.PolicyName === POLICY_NAME;
      const status = hasDevOps ? '✅' : '  ';
      log(`${status} ${policy.PolicyName}`, hasDevOps ? 'green' : 'reset');
    });
    
    return policies.AttachedPolicies.some(p => p.PolicyName === POLICY_NAME);

  } catch (error) {
    log(`❌ Failed to check user policies: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Full setup process
 */
async function setupIAMPolicy() {
  try {
    log('🚀 Setting up IAM policy for mrb-api user...', 'cyan');
    
    // Check if policy exists
    const { exists, arn } = await policyExists();
    let policyArn = arn;
    
    if (!exists) {
      policyArn = await createPolicy();
      if (!policyArn) {
        // Policy already existed, get ARN
        const accountId = '491696534851';
        policyArn = `arn:aws:iam::${accountId}:policy/${POLICY_NAME}`;
      }
    } else {
      log(`✅ Policy ${POLICY_NAME} already exists`, 'green');
    }
    
    // Check if already attached
    const isAttached = await checkUserPolicies();
    
    if (!isAttached) {
      await attachPolicy(policyArn);
    } else {
      log(`✅ Policy already attached to user ${USER_NAME}`, 'green');
    }
    
    log('\\n🎉 IAM setup complete! Your mrb-api user now has the necessary permissions.', 'green');
    log('You can now use the modernized scripts:', 'blue');
    log('  • npm run test:lambda', 'blue');
    log('  • npm run tunnel:start', 'blue');
    log('  • npm run deploy:lambda', 'blue');

  } catch (error) {
    log(`❌ IAM setup failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'setup';

  try {
    switch (command.toLowerCase()) {
      case 'create':
        await createPolicy();
        break;
      case 'attach':
        const accountId = '491696534851';
        const policyArn = `arn:aws:iam::${accountId}:policy/${POLICY_NAME}`;
        await attachPolicy(policyArn);
        break;
      case 'status':
        await checkUserPolicies();
        break;
      case 'setup':
        await setupIAMPolicy();
        break;
      default:
        log('Usage: node scripts/setup-iam-policy.js [create|attach|status|setup]', 'yellow');
        log('   or: npm run iam:setup', 'yellow');
        process.exit(1);
    }
  } catch (error) {
    log(`❌ Command failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Only run if this file is executed directly
const currentFile = fileURLToPath(import.meta.url);
const scriptFile = resolve(process.argv[1] || '');

if (currentFile === scriptFile) {
  main();
}

export { setupIAMPolicy, createPolicy, attachPolicy, checkUserPolicies };