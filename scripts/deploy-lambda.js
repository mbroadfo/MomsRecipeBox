#!/usr/bin/env node

/**
 * Lambda Deployment Manager
 * 
 * Modern replacement for Deploy-Lambda.ps1
 * Builds Docker image, pushes to ECR, and updates Lambda function
 * 
 * Usage:
 *   node scripts/deploy-lambda.js [options]
 *   npm run deploy:lambda
 *   npm run deploy:lambda -- --tag production
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

// Color output functions
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Execute shell command
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
        reject(new Error(`Command failed (code ${code}): ${command} ${args.join(' ')}\\n${stderr}`));
      }
    });
  });
}

/**
 * Load environment configuration
 */
async function loadEnvConfig() {
  const envPath = path.join(projectRoot, '.env');
  
  try {
    const envContent = await fs.readFile(envPath, 'utf8');
    const config = {};
    
    envContent.split('\\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        config[match[1].trim()] = match[2].trim();
      }
    });
    
    return config;
  } catch (error) {
    log('⚠️ Could not load .env file, using defaults', 'yellow');
    return {};
  }
}

/**
 * Docker login to ECR
 */
async function ecrLogin(awsProfile, region, ecrRepository) {
  try {
    log('🔐 Authenticating with ECR...', 'blue');
    
    // Get ECR login token
    const loginCommand = await runCommand('aws', [
      'ecr', 'get-login-password',
      '--region', region,
      '--profile', awsProfile
    ], { silent: true });

    // Docker login
    const registryUrl = ecrRepository.split('/')[0];
    await runCommand('docker', ['login', '--username', 'AWS', '--password-stdin', registryUrl], {
      silent: true,
      input: loginCommand
    });

    log('✅ ECR authentication successful', 'green');

  } catch (error) {
    log(`❌ ECR login failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Build Docker image
 */
async function buildImage(imageTag, ecrRepository) {
  try {
    log('🏗️ Building Docker image...', 'blue');
    
    const fullImageTag = `${ecrRepository}:${imageTag}`;
    
    await runCommand('docker', ['build', '-t', fullImageTag, '-f', 'app/Dockerfile', '.']);
    
    log(`✅ Image built: ${fullImageTag}`, 'green');
    return fullImageTag;

  } catch (error) {
    log(`❌ Docker build failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Push image to ECR
 */
async function pushImage(fullImageTag) {
  try {
    log('📤 Pushing image to ECR...', 'blue');
    
    await runCommand('docker', ['push', fullImageTag]);
    
    log(`✅ Image pushed: ${fullImageTag}`, 'green');

  } catch (error) {
    log(`❌ Docker push failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Update Lambda function
 */
async function updateLambda(awsProfile, region, lambdaFunction, imageUri) {
  try {
    log('🚀 Updating Lambda function...', 'blue');
    
    await runCommand('aws', [
      'lambda', 'update-function-code',
      '--function-name', lambdaFunction,
      '--image-uri', imageUri,
      '--region', region,
      '--profile', awsProfile
    ]);
    
    log(`✅ Lambda function updated: ${lambdaFunction}`, 'green');

  } catch (error) {
    log(`❌ Lambda update failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Wait for Lambda function to be ready
 */
async function waitForLambda(awsProfile, region, lambdaFunction) {
  try {
    log('⏳ Waiting for Lambda function to be ready...', 'yellow');
    
    await runCommand('aws', [
      'lambda', 'wait', 'function-updated',
      '--function-name', lambdaFunction,
      '--region', region,
      '--profile', awsProfile
    ]);
    
    log('✅ Lambda function is ready', 'green');

  } catch (error) {
    log(`❌ Lambda wait failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Main deployment process
 */
async function deployLambda(options) {
  const startTime = Date.now();
  
  try {
    log('🚀 Starting Lambda Deployment Process', 'cyan');
    log(`Profile: ${options.awsProfile}`, 'yellow');
    log(`Region: ${options.region}`, 'yellow');
    log(`ECR Repository: ${options.ecrRepository}`, 'yellow');
    log(`Lambda Function: ${options.lambdaFunction}`, 'yellow');
    log(`Image Tag: ${options.imageTag}`, 'yellow');

    // Set AWS profile
    process.env.AWS_PROFILE = options.awsProfile;
    log(`✅ AWS Profile set to: ${options.awsProfile}`, 'green');

    // ECR login
    await ecrLogin(options.awsProfile, options.region, options.ecrRepository);

    // Build image
    const fullImageTag = await buildImage(options.imageTag, options.ecrRepository);

    // Push image
    await pushImage(fullImageTag);

    // Update Lambda
    await updateLambda(options.awsProfile, options.region, options.lambdaFunction, fullImageTag);

    // Wait for deployment
    await waitForLambda(options.awsProfile, options.region, options.lambdaFunction);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`\\n🎉 Deployment completed successfully in ${duration}s`, 'green');

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`\\n❌ Deployment failed after ${duration}s: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * CLI setup and main execution
 */
async function main() {
  const program = new Command();
  
  program
    .name('deploy-lambda')
    .description('Deploy Lambda function with container image')
    .version('1.0.0')
    .option('-p, --aws-profile <profile>', 'AWS profile to use', 'terraform-mrb')
    .option('-r, --region <region>', 'AWS region', 'us-west-2')
    .option('-e, --ecr-repository <repository>', 'ECR repository URL', '491696534851.dkr.ecr.us-west-2.amazonaws.com/mrb-app-api')
    .option('-f, --lambda-function <function>', 'Lambda function name', 'mrb-app-api')
    .option('-t, --image-tag <tag>', 'Docker image tag', 'dev')
    .option('--dry-run', 'Show what would be deployed without executing')
    .parse();

  const options = program.opts();

  // Load additional config from .env if available
  const envConfig = await loadEnvConfig();
  
  // Override defaults with .env values if present
  const finalOptions = {
    awsProfile: options.awsProfile,
    region: envConfig.AWS_REGION || options.region,
    ecrRepository: options.ecrRepository,
    lambdaFunction: options.lambdaFunction,
    imageTag: options.imageTag
  };

  if (options.dryRun) {
    log('🔍 Dry run - showing deployment configuration:', 'cyan');
    console.log(JSON.stringify(finalOptions, null, 2));
    return;
  }

  try {
    await deployLambda(finalOptions);
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Only run if this file is executed directly
const currentFile = fileURLToPath(import.meta.url);
const scriptFile = resolve(process.argv[1] || '');

if (currentFile === scriptFile) {
  main();
}

export { deployLambda };