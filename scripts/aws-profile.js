#!/usr/bin/env node

/**
 * AWS Profile Manager
 * 
 * Modern replacement for infra AWS profile PowerShell scripts
 * Manages switching between mrb-api and terraform-mrb profiles
 * 
 * Usage:
 *   node scripts/aws-profile.js [mrb-api|terraform-mrb|toggle|status]
 *   npm run aws:mrb-api
 *   npm run aws:terraform
 *   npm run aws:toggle
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);

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

/**
 * Execute AWS CLI command
 */
async function runAwsCommand(args, profile = null) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    if (profile) {
      env.AWS_PROFILE = profile;
    }

    const aws = spawn('aws', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env
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
 * Get current AWS identity
 */
async function getCurrentIdentity(profile = null) {
  try {
    const identity = await runAwsCommand(['sts', 'get-caller-identity'], profile);
    return JSON.parse(identity);
  } catch (error) {
    throw new Error(`Failed to get AWS identity: ${error.message}`);
  }
}

/**
 * Set AWS profile
 */
function setProfile(profileName) {
  process.env.AWS_PROFILE = profileName;
  
  // Also set it for the current shell session if possible
  if (process.platform === 'win32') {
    // On Windows, we can try to set it via the registry or suggest the user run a command
    log(`✅ AWS profile set to: ${profileName}`, 'green');
    log(`💡 For persistent setting in PowerShell, run: $env:AWS_PROFILE="${profileName}"`, 'blue');
  } else {
    log(`✅ AWS profile set to: ${profileName}`, 'green');
    log(`💡 For persistent setting in bash, run: export AWS_PROFILE="${profileName}"`, 'blue');
  }
}

/**
 * Toggle between profiles
 */
function toggleProfile() {
  const current = process.env.AWS_PROFILE;
  let newProfile;

  if (!current) {
    newProfile = 'mrb-api';
    log('Switched to: mrb-api (was unset)', 'yellow');
  } else if (current === 'mrb-api') {
    newProfile = 'terraform-mrb';
    log('Switched to: terraform-mrb', 'yellow');
  } else if (current === 'terraform-mrb') {
    newProfile = 'mrb-api';
    log('Switched to: mrb-api', 'yellow');
  } else {
    newProfile = 'mrb-api';
    log(`Switched to: mrb-api (from ${current})`, 'yellow');
  }

  setProfile(newProfile);
  return newProfile;
}

/**
 * Show current profile status
 */
async function showStatus() {
  try {
    const currentProfile = process.env.AWS_PROFILE || 'default';
    log(`Current AWS Profile: ${currentProfile}`, 'cyan');
    
    log('Current identity:', 'cyan');
    const identity = await getCurrentIdentity();
    console.log(JSON.stringify(identity, null, 2));

    return { profile: currentProfile, identity };

  } catch (error) {
    log(`❌ Failed to get status: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Validate that required profiles exist
 */
async function validateProfiles() {
  const profiles = ['mrb-api', 'terraform-mrb'];
  const results = {};

  for (const profile of profiles) {
    try {
      await getCurrentIdentity(profile);
      results[profile] = { status: 'valid', error: null };
      log(`✅ Profile '${profile}' is valid`, 'green');
    } catch (error) {
      results[profile] = { status: 'invalid', error: error.message };
      log(`❌ Profile '${profile}' is invalid: ${error.message}`, 'red');
    }
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'status';

  try {
    switch (command.toLowerCase()) {
      case 'mrb-api':
        setProfile('mrb-api');
        await showStatus();
        break;

      case 'terraform-mrb':
      case 'terraform':
        setProfile('terraform-mrb');
        await showStatus();
        break;

      case 'toggle':
        const newProfile = toggleProfile();
        await showStatus();
        break;

      case 'status':
        await showStatus();
        break;

      case 'validate':
        await validateProfiles();
        break;

      default:
        log('Usage: node scripts/aws-profile.js [mrb-api|terraform-mrb|toggle|status|validate]', 'yellow');
        log('   or: npm run aws:[mrb-api|terraform|toggle|status]', 'yellow');
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

export { setProfile, toggleProfile, getCurrentIdentity, showStatus, validateProfiles };