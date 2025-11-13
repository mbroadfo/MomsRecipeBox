#!/usr/bin/env node

/**
 * Lambda ZIP Deployment Manager
 * 
 * Replaces Docker/ECR deployment with simpler ZIP file deployment
 * Much cheaper and faster than ECR
 * 
 * Usage:
 *   node scripts/deploy-lambda-zip.js
 *   npm run deploy:lambda
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

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
        reject(new Error(`Command failed (code ${code}): ${command} ${args.join(' ')}\n${stderr}`));
      }
    });
  });
}

/**
 * Create ZIP file from directory
 */
async function createZipFile(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      log(`✅ ZIP file created: ${sizeInMB} MB`, 'green');
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    
    // Add all files from source directory
    archive.directory(sourceDir, false);
    
    archive.finalize();
  });
}

/**
 * Install production dependencies in temp directory
 */
async function installDependencies(tempDir) {
  try {
    log('📦 Installing production dependencies...', 'blue');
    
    // Copy package files
    await fs.copyFile(
      path.join(projectRoot, 'app', 'package.json'),
      path.join(tempDir, 'package.json')
    );
    
    await fs.copyFile(
      path.join(projectRoot, 'app', 'package-lock.json'),
      path.join(tempDir, 'package-lock.json')
    );
    
    // Install dependencies
    await runCommand('npm', ['install', '--omit=dev', '--platform=linux', '--arch=x64'], {
      cwd: tempDir
    });
    
    log('✅ Dependencies installed', 'green');
  } catch (error) {
    log(`❌ Failed to install dependencies: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Copy application files to temp directory
 */
async function copyAppFiles(tempDir) {
  try {
    log('📁 Copying application files...', 'blue');
    
    const appDir = path.join(projectRoot, 'app');
    const configDir = path.join(projectRoot, 'config');
    
    // Directories to copy
    const dirsToCopy = [
      'handlers',
      'models',
      'utils',
      'ai_providers',
      'admin',
      'health',
      'scripts'
    ];
    
    // Files to copy
    const filesToCopy = [
      'lambda.js',
      'app.js'
    ];
    
    // Copy directories
    for (const dir of dirsToCopy) {
      const srcPath = path.join(appDir, dir);
      const destPath = path.join(tempDir, dir);
      
      try {
        await fs.access(srcPath);
        await fs.cp(srcPath, destPath, { recursive: true });
      } catch (error) {
        log(`⚠️ Skipping ${dir} (not found)`, 'yellow');
      }
    }
    
    // Copy files
    for (const file of filesToCopy) {
      const srcPath = path.join(appDir, file);
      const destPath = path.join(tempDir, file);
      
      try {
        await fs.copyFile(srcPath, destPath);
      } catch (error) {
        log(`⚠️ Skipping ${file} (not found)`, 'yellow');
      }
    }
    
    // Copy config directory
    try {
      await fs.access(configDir);
      await fs.cp(configDir, path.join(tempDir, 'config'), { recursive: true });
    } catch (error) {
      log(`⚠️ Skipping config directory (not found)`, 'yellow');
    }
    
    log('✅ Application files copied', 'green');
  } catch (error) {
    log(`❌ Failed to copy files: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Build Lambda deployment package
 */
async function buildDeploymentPackage() {
  const tempDir = path.join(projectRoot, '.lambda-build');
  const zipPath = path.join(projectRoot, 'lambda-deployment.zip');
  
  try {
    log('🏗️ Building Lambda deployment package...', 'blue');
    
    // Clean up any existing temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      await fs.unlink(zipPath);
    } catch (error) {
      // Ignore errors if files don't exist
    }
    
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });
    
    // Install dependencies
    await installDependencies(tempDir);
    
    // Copy application files
    await copyAppFiles(tempDir);
    
    // Create ZIP file
    log('📦 Creating ZIP file...', 'blue');
    await createZipFile(tempDir, zipPath);
    
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    
    return zipPath;
  } catch (error) {
    // Clean up on error
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Upload ZIP to Lambda
 */
async function updateLambdaFunction(zipPath) {
  try {
    log('🚀 Updating Lambda function...', 'blue');
    
    const awsProfile = 'mrb-api';
    const region = 'us-west-2';
    const functionName = 'mrb-app-api';
    
    // Set AWS profile
    process.env.AWS_PROFILE = awsProfile;
    
    await runCommand('aws', [
      'lambda', 'update-function-code',
      '--function-name', functionName,
      '--zip-file', `fileb://${zipPath}`,
      '--region', region
    ]);
    
    log(`✅ Lambda function updated: ${functionName}`, 'green');
    
    // Wait for function to be ready
    log('⏳ Waiting for Lambda function to be ready...', 'yellow');
    
    await runCommand('aws', [
      'lambda', 'wait', 'function-updated',
      '--function-name', functionName,
      '--region', region
    ]);
    
    log('✅ Lambda function is ready', 'green');
  } catch (error) {
    log(`❌ Lambda update failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Main deployment process
 */
async function main() {
  const startTime = Date.now();
  
  try {
    log('🚀 Starting Lambda ZIP Deployment', 'cyan');
    log('🔧 AWS Profile: mrb-api', 'yellow');
    log('📍 Region: us-west-2', 'yellow');
    log('⚡ Function: mrb-app-api', 'yellow');
    
    // Set AWS profile
    process.env.AWS_PROFILE = 'mrb-api';
    
    // Build deployment package
    const zipPath = await buildDeploymentPackage();
    
    // Upload to Lambda
    await updateLambdaFunction(zipPath);
    
    // Clean up ZIP file
    log('🧹 Cleaning up...', 'blue');
    await fs.unlink(zipPath);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`\n🎉 Deployment completed successfully in ${duration}s`, 'green');
    
    process.exit(0);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`\n❌ Deployment failed after ${duration}s: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
