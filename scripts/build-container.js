#!/usr/bin/env node

/**
 * Container Build and Push Manager
 * 
 * Cross-platform replacement for PushAppTierContainer.ps1
 * Builds Docker image, pushes to ECR with multiple tags, and updates Lambda
 * 
 * Usage:
 *   node scripts/build-container.js [options]
 *   npm run build:container
 *   npm run build:container -- --tag production
 *   npm run build:push -- --update-lambda
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

// ASCII Banner
const BANNER = `
╔═══════════════════════════════════════════════════════════════╗
║                    MOM'S RECIPE BOX                          ║
║                Container Build & Push Tool                   ║
║                   Cross-Platform Edition                     ║
╚═══════════════════════════════════════════════════════════════╝
`;

// Color output functions
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function banner() {
  log(BANNER, 'cyan');
}

/**
 * Execute shell command with proper error handling
 */
async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: true,
      cwd: options.cwd || projectRoot,
      env: { ...process.env, ...options.env }
    });

    let stdout = '';
    let stderr = '';

    if (options.silent) {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`Command failed (code ${code}): ${command} ${args.join(' ')}${stderr ? `\\n${stderr}` : ''}`));
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Command error: ${error.message}`));
    });
  });
}

/**
 * Get short Git SHA
 */
async function getGitSha() {
  try {
    const sha = await runCommand('git', ['rev-parse', '--short', 'HEAD'], { silent: true });
    log(`📋 Git SHA: ${sha}`, 'yellow');
    return sha.trim();
  } catch (error) {
    log('⚠️ Could not get Git SHA, using timestamp', 'yellow');
    return Date.now().toString();
  }
}

/**
 * Check if Docker is running
 */
async function checkDockerRunning() {
  try {
    await runCommand('docker', ['info'], { silent: true });
    log('✅ Docker is running', 'green');
    return true;
  } catch (error) {
    log('❌ Docker is not running or not accessible', 'red');
    log('Please start Docker Desktop and try again', 'yellow');
    return false;
  }
}

/**
 * Check AWS CLI availability and credentials
 */
async function checkAwsCredentials(profile) {
  try {
    log('🔑 Checking AWS credentials...', 'blue');
    
    const result = await runCommand('aws', [
      'sts', 'get-caller-identity',
      '--profile', profile
    ], { silent: true });

    const identity = JSON.parse(result);
    log(`✅ AWS credentials valid for account: ${identity.Account}`, 'green');
    return true;
  } catch (error) {
    log(`❌ AWS credentials not configured for profile: ${profile}`, 'red');
    log('Please run: aws configure --profile ' + profile, 'yellow');
    return false;
  }
}

/**
 * ECR Docker login
 */
async function ecrLogin(awsProfile, region, ecrRepository) {
  try {
    log('🔐 Authenticating Docker with ECR...', 'blue');
    
    // Get ECR login password
    const loginToken = await runCommand('aws', [
      'ecr', 'get-login-password',
      '--region', region,
      '--profile', awsProfile
    ], { silent: true });

    // Docker login using password from stdin
    const registryUrl = ecrRepository.split('/')[0];
    const child = spawn('docker', ['login', '--username', 'AWS', '--password-stdin', registryUrl], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    child.stdin.write(loginToken);
    child.stdin.end();

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          log('✅ ECR authentication successful', 'green');
          resolve();
        } else {
          reject(new Error(`Docker login failed: ${stderr}`));
        }
      });
    });

  } catch (error) {
    log(`❌ ECR login failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Build Docker image with Lambda-compatible settings
 */
async function buildImage(ecrRepository, gitSha) {
  try {
    log('🏗️ Building Docker image for Lambda compatibility...', 'blue');
    log('  Platform: linux/amd64', 'yellow');
    log('  Attestations: disabled', 'yellow');
    log('  SBOM: disabled', 'yellow');
    
    const localTag = 'mrb-app-api:latest';
    
    // Build with Lambda-compatible settings (same as PowerShell version)
    await runCommand('docker', [
      'build',
      '--platform', 'linux/amd64',
      '--provenance=false',
      '--sbom=false',
      '-f', 'app/Dockerfile',
      '-t', localTag,
      '.'
    ]);
    
    log(`✅ Image built: ${localTag}`, 'green');
    return localTag;

  } catch (error) {
    log(`❌ Docker build failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Tag image with multiple tags (latest, dev, git-sha)
 */
async function tagImage(localTag, ecrRepository, gitSha) {
  try {
    log('🏷️ Tagging image with multiple tags...', 'blue');
    
    const tags = [
      `${ecrRepository}:latest`,
      `${ecrRepository}:dev`, 
      `${ecrRepository}:git-${gitSha}`
    ];

    for (const tag of tags) {
      await runCommand('docker', ['tag', localTag, tag]);
      log(`  ✅ Tagged: ${tag}`, 'green');
    }
    
    return tags;

  } catch (error) {
    log(`❌ Image tagging failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Push all tags to ECR
 */
async function pushAllTags(tags) {
  try {
    log('📤 Pushing all tags to ECR...', 'blue');
    
    for (const tag of tags) {
      log(`  Pushing: ${tag}`, 'yellow');
      await runCommand('docker', ['push', tag]);
      log(`  ✅ Pushed: ${tag}`, 'green');
    }

  } catch (error) {
    log(`❌ Docker push failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Update Lambda function with new image
 */
async function updateLambda(awsProfile, region, lambdaFunction, imageUri) {
  try {
    log('🚀 Updating Lambda function...', 'blue');
    log(`  Function: ${lambdaFunction}`, 'yellow');
    log(`  Image: ${imageUri}`, 'yellow');
    
    await runCommand('aws', [
      'lambda', 'update-function-code',
      '--function-name', lambdaFunction,
      '--image-uri', imageUri,
      '--region', region,
      '--profile', awsProfile
    ]);
    
    log(`✅ Lambda function updated successfully`, 'green');

  } catch (error) {
    log(`❌ Lambda update failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Show build summary
 */
function showSummary(options, gitSha, tags, duration) {
  log('\\n' + '='.repeat(60), 'cyan');
  log('📊 BUILD SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Git SHA: ${gitSha}`, 'white');
  log(`ECR Repository: ${options.ecrRepository}`, 'white');
  log(`AWS Profile: ${options.awsProfile}`, 'white');
  log(`Region: ${options.region}`, 'white');
  log(`Lambda Function: ${options.lambdaFunction}`, 'white');
  log(`Build Duration: ${duration}s`, 'white');
  log('\\nTags pushed:', 'white');
  tags.forEach(tag => log(`  • ${tag}`, 'green'));
  if (options.updateLambda) {
    log(`\\nLambda updated with: ${options.ecrRepository}:dev`, 'green');
  }
  log('='.repeat(60), 'cyan');
}

/**
 * Main build and push process
 */
async function buildAndPush(options) {
  const startTime = Date.now();
  
  try {
    banner();
    
    log('🚀 Starting Container Build & Push Process', 'cyan');
    log(`Profile: ${options.awsProfile}`, 'yellow');
    log(`Region: ${options.region}`, 'yellow');
    log(`Repository: ${options.ecrRepository}`, 'yellow');
    log(`Update Lambda: ${options.updateLambda ? 'Yes' : 'No'}`, 'yellow');

    // Pre-flight checks
    log('\\n🔍 Running pre-flight checks...', 'blue');
    
    if (!await checkDockerRunning()) {
      process.exit(1);
    }
    
    if (!await checkAwsCredentials(options.awsProfile)) {
      process.exit(1);
    }
    
    // Get Git SHA
    const gitSha = await getGitSha();

    // Set AWS profile environment
    process.env.AWS_PROFILE = options.awsProfile;

    // ECR login
    await ecrLogin(options.awsProfile, options.region, options.ecrRepository);

    // Build image
    const localTag = await buildImage(options.ecrRepository, gitSha);

    // Tag image
    const tags = await tagImage(localTag, options.ecrRepository, gitSha);

    // Push all tags
    await pushAllTags(tags);

    // Update Lambda if requested
    if (options.updateLambda) {
      const devImageUri = `${options.ecrRepository}:dev`;
      await updateLambda(options.awsProfile, options.region, options.lambdaFunction, devImageUri);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    showSummary(options, gitSha, tags, duration);
    
    log(`\\n🎉 Container build and push completed successfully!`, 'green');

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`\\n❌ Build failed after ${duration}s: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Show help with examples
 */
function showHelp() {
  banner();
  log('Container Build & Push Tool - Cross-Platform PowerShell Replacement\\n', 'cyan');
  
  log('USAGE:', 'bright');
  log('  node scripts/build-container.js [options]', 'white');
  log('  npm run build:container', 'white');
  log('  npm run build:push', 'white');
  log('');
  
  log('EXAMPLES:', 'bright');
  log('  # Build and push with default settings', 'white');
  log('  npm run build:container', 'green');
  log('');
  log('  # Build, push, and update Lambda function', 'white');
  log('  npm run build:push', 'green');
  log('');
  log('  # Build with specific AWS profile', 'white');
  log('  node scripts/build-container.js --aws-profile production', 'green');
  log('');
  log('  # Show what would be built without executing', 'white');
  log('  node scripts/build-container.js --dry-run', 'green');
  log('');
  
  log('MIGRATION FROM POWERSHELL:', 'bright');
  log('  Old: .\\\\scripts\\\\PushAppTierContainer.ps1', 'yellow');
  log('  New: npm run build:push', 'green');
  log('');
}

/**
 * CLI setup and main execution
 */
async function main() {
  const program = new Command();
  
  program
    .name('build-container')
    .description('Build and push container images to ECR (replaces PushAppTierContainer.ps1)')
    .version('1.0.0')
    .option('-p, --aws-profile <profile>', 'AWS profile to use', 'terraform-mrb')
    .option('-r, --region <region>', 'AWS region', 'us-west-2')
    .option('-e, --ecr-repository <repository>', 'ECR repository URL', '491696534851.dkr.ecr.us-west-2.amazonaws.com/mrb-app-api')
    .option('-f, --lambda-function <function>', 'Lambda function name', 'mrb-app-api')
    .option('-u, --update-lambda', 'Update Lambda function with new image')
    .option('--dry-run', 'Show what would be built without executing')
    .option('-h, --help', 'Show detailed help with examples')
    .parse();

  const options = program.opts();

  if (options.help) {
    showHelp();
    return;
  }

  if (options.dryRun) {
    banner();
    log('🔍 Dry run - showing build configuration:', 'cyan');
    console.log(JSON.stringify({
      awsProfile: options.awsProfile,
      region: options.region,
      ecrRepository: options.ecrRepository,
      lambdaFunction: options.lambdaFunction,
      updateLambda: options.updateLambda || false
    }, null, 2));
    return;
  }

  try {
    await buildAndPush(options);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Only run if this file is executed directly
const currentFile = fileURLToPath(import.meta.url);
const scriptFile = resolve(process.argv[1] || '');

if (currentFile === scriptFile) {
  main().catch(console.error);
}

export { buildAndPush };