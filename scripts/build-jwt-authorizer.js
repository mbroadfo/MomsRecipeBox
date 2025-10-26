#!/usr/bin/env node

/**
 * JWT Authorizer Build Script
 * 
 * Builds deployment package for JWT authorizer Lambda function
 * Follows established cross-platform Node.js script patterns
 * 
 * Usage:
 *   node scripts/build-jwt-authorizer.js
 *   npm run build:jwt-authorizer
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

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
      child.stdout?.on('data', data => stdout += data);
      child.stderr?.on('data', data => stderr += data);
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });
  });
}

/**
 * Create ZIP archive
 */
async function createZipArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve(archive.pointer());
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

/**
 * Main build process
 */
async function buildJWTAuthorizer() {
  const startTime = Date.now();
  
  try {
    log('🔧 Building JWT Authorizer Lambda Package', 'cyan');
    
    const infraDir = join(projectRoot, 'infra');
    const tempDir = join(infraDir, 'jwt_temp');
    const outputZip = join(infraDir, 'jwt_authorizer.zip');

    // Clean up any existing temp directory and zip file
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      await fs.rm(outputZip, { force: true });
    } catch (e) {
      // Ignore errors - files may not exist
    }

    // Create temporary directory
    log('📁 Creating temporary build directory...', 'yellow');
    await fs.mkdir(tempDir, { recursive: true });

    // Copy source files
    log('📝 Copying source files...', 'yellow');
    await fs.copyFile(join(infraDir, 'jwt_authorizer.js'), join(tempDir, 'index.js'));
    await fs.copyFile(join(infraDir, 'package.json'), join(tempDir, 'package.json'));

    // Install dependencies
    log('📦 Installing production dependencies...', 'yellow');
    await runCommand('npm', ['install', '--production'], { cwd: tempDir });

    // Create deployment package
    log('🗜️ Creating deployment package...', 'yellow');
    const archiveSize = await createZipArchive(tempDir, outputZip);

    // Cleanup temp directory
    log('🧹 Cleaning up...', 'yellow');
    await fs.rm(tempDir, { recursive: true, force: true });

    const duration = Date.now() - startTime;
    log(`✅ JWT Authorizer package built successfully!`, 'green');
    log(`   📦 Package: jwt_authorizer.zip`, 'green');
    log(`   📏 Size: ${Math.round(archiveSize / 1024)} KB`, 'green');
    log(`   ⏱️ Duration: ${duration}ms`, 'green');

  } catch (error) {
    log(`❌ Build failed: ${error.message}`, 'red');
    throw error;
  }
}

// Only run if this file is executed directly
const currentFile = fileURLToPath(import.meta.url);
const scriptFile = process.argv[1];

if (currentFile === scriptFile) {
  buildJWTAuthorizer().catch(console.error);
}

export { buildJWTAuthorizer };