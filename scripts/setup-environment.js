#!/usr/bin/env node

/**
 * Cross-platform environment setup and validation script
 * Replaces PowerShell scripts with Node.js for cross-platform compatibility
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description} exists`, 'green');
    return true;
  } else {
    log(`❌ ${description} missing: ${filePath}`, 'red');
    return false;
  }
}

function runCommand(command, description, options = {}) {
  try {
    log(`🔄 ${description}...`, 'blue');
    const result = execSync(command, { 
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    log(`✅ ${description} completed`, 'green');
    return result;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    if (!options.continueOnError) {
      process.exit(1);
    }
    return null;
  }
}

function validateEnvironmentFile() {
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const envPath = path.join(process.cwd(), '.env');
  
  log('\n📋 Validating environment configuration...', 'cyan');
  
  // Check .env.example exists
  if (!checkFileExists(envExamplePath, '.env.example')) {
    return false;
  }
  
  // Check if .env exists, but don't create it automatically to preserve secrets
  if (!fs.existsSync(envPath)) {
    log('ℹ️ .env file not found - this is OK if you haven\'t set it up yet', 'yellow');
    log('💡 To create: cp .env.example .env (then configure your secrets)', 'yellow');
    return true; // Don't fail validation for missing .env
  }
  
  // Validate required variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'MONGODB_MODE',
    'APP_MODE', 
    'MONGODB_DB_NAME',
    'LOCAL_HOST_PORT'
  ];
  
  let allValid = true;
  for (const varName of requiredVars) {
    const regex = new RegExp(`^${varName}=`, 'm');
    if (!regex.test(envContent)) {
      log(`❌ Required variable ${varName} not found in .env`, 'red');
      allValid = false;
    }
  }
  
  if (allValid) {
    log('✅ Environment configuration is valid', 'green');
  }
  
  return allValid;
}

function validateDockerConfiguration() {
  log('\n🐳 Validating Docker configuration...', 'cyan');
  
  // Check if Docker is installed and running
  try {
    runCommand('docker version', 'Checking Docker installation', { silent: true });
  } catch (error) {
    log('❌ Docker is not installed or not running', 'red');
    return false;
  }
  
  // Validate docker-compose configurations
  const composeConfigs = [
    { files: ['docker-compose.yml'], name: 'docker-compose.yml' },
    { files: ['docker-compose.yml', 'docker-compose.local.yml'], name: 'local mode' },
    { files: ['docker-compose.yml', 'docker-compose.atlas.yml'], name: 'atlas mode' }
  ];
  
  let allValid = true;
  for (const config of composeConfigs) {
    const allFilesExist = config.files.every(file => fs.existsSync(file));
    if (allFilesExist) {
      try {
        const fileArgs = config.files.map(f => `-f ${f}`).join(' ');
        runCommand(`docker-compose ${fileArgs} config`, `Validating ${config.name}`, { silent: true });
        log(`✅ ${config.name} is valid`, 'green');
      } catch (error) {
        log(`❌ ${file} has syntax errors`, 'red');
        allValid = false;
      }
    }
  }
  
  return allValid;
}

function setupDevelopmentMode(mode) {
  log(`\n🚀 Setting up ${mode} development mode...`, 'cyan');
  
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update environment variables based on mode
  switch (mode) {
    case 'local':
      envContent = envContent.replace(/MONGODB_MODE=.*/g, 'MONGODB_MODE=local');
      envContent = envContent.replace(/APP_MODE=.*/g, 'APP_MODE=express');
      break;
    case 'atlas':
      envContent = envContent.replace(/MONGODB_MODE=.*/g, 'MONGODB_MODE=atlas');
      envContent = envContent.replace(/APP_MODE=.*/g, 'APP_MODE=express');
      break;
    case 'lambda':
      envContent = envContent.replace(/MONGODB_MODE=.*/g, 'MONGODB_MODE=atlas');
      envContent = envContent.replace(/APP_MODE=.*/g, 'APP_MODE=lambda');
      break;
    default:
      log(`❌ Unknown mode: ${mode}`, 'red');
      return false;
  }
  
  fs.writeFileSync(envPath, envContent);
  log(`✅ Environment configured for ${mode} mode`, 'green');
  return true;
}

function startServices(mode) {
  log(`\n▶️ Starting services in ${mode} mode...`, 'cyan');
  
  const profile = mode === 'lambda' ? 'atlas' : mode;
  const composeFile = mode === 'local' ? '-f docker-compose.yml -f docker-compose.local.yml' : 
                     mode === 'atlas' ? '-f docker-compose.yml -f docker-compose.atlas.yml' :
                     '--profile atlas';
  
  try {
    runCommand(`docker-compose ${composeFile} up -d --build`, `Starting ${mode} services`);
    
    // Wait for services to be ready
    log('⏳ Waiting for services to be ready...', 'yellow');
    setTimeout(() => {
      try {
        runCommand('curl -f http://localhost:3000/health', 'Health check', { silent: true });
        log('✅ Services are ready!', 'green');
        log('🌐 Application available at: http://localhost:3000', 'cyan');
        if (mode === 'local') {
          log('🗄️ MongoDB Express available at: http://localhost:8081', 'cyan');
        }
      } catch (error) {
        log('⚠️ Services may still be starting up. Check with: npm run health', 'yellow');
      }
    }, 10000);
    
    return true;
  } catch (error) {
    return false;
  }
}

function showUsage() {
  console.log(`
🏗️ MomsRecipeBox Development Environment Setup

Usage: node scripts/setup-environment.js [command] [options]

Commands:
  validate        Validate environment and Docker configuration
  setup [mode]    Setup development environment (local|atlas|lambda)
  start [mode]    Start services in specified mode
  stop           Stop all running services
  restart [mode] Restart services in specified mode
  health         Check application health
  help           Show this help message

Examples:
  node scripts/setup-environment.js validate
  node scripts/setup-environment.js setup local
  node scripts/setup-environment.js start atlas
  node scripts/setup-environment.js health

Modes:
  local    - Fully local (Express + Local MongoDB)
  atlas    - Remote DB (Express + MongoDB Atlas)  
  lambda   - Remote Backend (Lambda + MongoDB Atlas)
`);
}

function healthCheck() {
  log('\n🏥 Performing health check...', 'cyan');
  
  try {
    const response = runCommand('curl -s http://localhost:3000/health', 'Checking app health', { silent: true });
    const healthData = JSON.parse(response);
    
    log(`✅ Application Status: ${healthData.status}`, 'green');
    
    if (healthData.database) {
      log(`✅ Database Status: ${healthData.database.status}`, 'green');
    }
    
    return true;
  } catch (error) {
    log('❌ Application is not responding', 'red');
    log('💡 Try: npm run start:local or npm run start:atlas', 'yellow');
    return false;
  }
}

// Main execution
const command = process.argv[2];
const mode = process.argv[3];

log('🏗️ MomsRecipeBox Environment Setup Tool', 'magenta');

switch (command) {
  case 'validate':
    const envValid = validateEnvironmentFile();
    const dockerValid = validateDockerConfiguration();
    if (envValid && dockerValid) {
      log('\n🎉 All validations passed!', 'green');
      process.exit(0);
    } else {
      log('\n💥 Some validations failed. Please fix the issues above.', 'red');
      process.exit(1);
    }
    break;
    
  case 'setup':
    if (!mode || !['local', 'atlas', 'lambda'].includes(mode)) {
      log('❌ Please specify a valid mode: local, atlas, or lambda', 'red');
      showUsage();
      process.exit(1);
    }
    validateEnvironmentFile();
    setupDevelopmentMode(mode);
    log(`\n✅ Environment setup complete for ${mode} mode!`, 'green');
    log('💡 Next step: npm run start:' + (mode === 'lambda' ? 'atlas' : mode), 'yellow');
    break;
    
  case 'start':
    if (!mode || !['local', 'atlas', 'lambda'].includes(mode)) {
      log('❌ Please specify a valid mode: local, atlas, or lambda', 'red');
      showUsage();
      process.exit(1);
    }
    setupDevelopmentMode(mode);
    startServices(mode);
    break;
    
  case 'stop':
    runCommand('docker-compose down', 'Stopping all services');
    break;
    
  case 'restart':
    if (!mode || !['local', 'atlas', 'lambda'].includes(mode)) {
      log('❌ Please specify a valid mode: local, atlas, or lambda', 'red');
      showUsage();
      process.exit(1);
    }
    runCommand('docker-compose down', 'Stopping services');
    setTimeout(() => startServices(mode), 2000);
    break;
    
  case 'health':
    healthCheck();
    break;
    
  case 'help':
  default:
    showUsage();
    break;
}