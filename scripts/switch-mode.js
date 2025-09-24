#!/usr/bin/env node

/**
 * MongoDB Connection Mode Switcher
 * Cross-platform replacement for Toggle-MongoDbConnection.ps1
 * 
 * This script toggles between local Docker MongoDB and MongoDB Atlas connections
 * It updates the .env file and manages Docker containers accordingly
 */

import fs from 'fs';
import path from 'path';
import { execSync, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

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

// ASCII art banner matching the PowerShell version
function showBanner() {
  const banner = `
 ╔═════════════════════════════════════════════╗
 ║ MongoDB Connection Manager for MomsRecipeBox ║
 ╚═════════════════════════════════════════════╝`;
  log(banner, 'cyan');
}

// Get current MongoDB mode from .env file
function getCurrentMode() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    log('❌ .env file not found. Creating it from .env.example...', 'yellow');
    
    const envExamplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      log('✅ Created .env file from template', 'green');
    } else {
      log('❌ Neither .env nor .env.example files exist!', 'red');
      process.exit(1);
    }
  }
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const modeMatch = envContent.match(/MONGODB_MODE=(.+)/);
    if (modeMatch) {
      return modeMatch[1].trim();
    }
    return 'local'; // Default if not found
  } catch (error) {
    log(`❌ Error reading .env file: ${error.message}`, 'red');
    return 'local';
  }
}

// Update the .env file with the new MongoDB mode
function updateEnvFile(mode) {
  const envPath = path.join(process.cwd(), '.env');
  
  // If .env doesn't exist but .env.example does, create it from example
  if (!fs.existsSync(envPath)) {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      log('Created .env from template file', 'green');
    } else {
      log('❌ No .env or .env.example file found!', 'red');
      process.exit(1);
    }
  }
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    let modeExists = false;
    
    const newLines = lines.map(line => {
      if (line.startsWith('MONGODB_MODE=')) {
        modeExists = true;
        return `MONGODB_MODE=${mode}`;
      }
      return line;
    });
    
    // If MONGODB_MODE wasn't in the file, add it
    if (!modeExists) {
      newLines.push(`MONGODB_MODE=${mode}`);
    }
    
    fs.writeFileSync(envPath, newLines.join('\n'));
    log(`✅ Updated .env file with MONGODB_MODE=${mode}`, 'green');
  } catch (error) {
    log(`❌ Error updating .env file: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Check if Docker is running
function testDockerRunning() {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch (error) {
    log('❌ Docker is not running. Please start Docker and try again.', 'red');
    process.exit(1);
  }
}

// Get MongoDB Atlas URI from AWS Secrets Manager
async function getMongoAtlasUri() {
  const secretName = 'moms-recipe-secrets-dev';
  const region = 'us-west-2';
  
  try {
    log('Getting MongoDB Atlas URI from AWS Secrets Manager...', 'yellow');
    
    let awsCommand = `aws secretsmanager get-secret-value --secret-id ${secretName} --region ${region}`;
    if (process.env.AWS_PROFILE) {
      awsCommand += ` --profile ${process.env.AWS_PROFILE}`;
    }
    
    const { stdout } = await execAsync(awsCommand);
    const secretData = JSON.parse(stdout);
    
    if (secretData && secretData.SecretString) {
      const secrets = JSON.parse(secretData.SecretString);
      if (secrets.MONGODB_URI) {
        log('✅ Successfully retrieved MongoDB Atlas URI', 'green');
        return secrets.MONGODB_URI;
      }
    }
    
    throw new Error('MongoDB URI not found in AWS Secrets Manager');
  } catch (error) {
    log(`❌ Failed to get MongoDB Atlas URI: ${error.message}`, 'red');
    throw error;
  }
}

// Check container status
async function getContainerStatus(containerName) {
  try {
    const { stdout } = await execAsync(`docker ps --filter "name=${containerName}" --format "{{.Status}}"`);
    return stdout.trim() || null;
  } catch (error) {
    return null;
  }
}

// Restart the app container
async function restartAppContainer(mode) {
  log('Restarting application container...', 'yellow');
  
  try {
    if (mode === 'local') {
      // For local mode, stop and remove atlas containers, then start local containers
      try {
        log('Stopping Atlas containers...', 'blue');
        execSync('docker-compose --profile atlas down', { stdio: 'pipe' });
      } catch (error) {
        // Ignore if atlas containers aren't running
      }
      
      log('Starting local containers...', 'blue');
      execSync('docker-compose --profile local up -d', { stdio: 'inherit' });
      
      // Check if MongoDB container is running
      const mongoStatus = await getContainerStatus('momsrecipebox-mongo');
      if (mongoStatus) {
        log('✅ Local MongoDB container is running', 'green');
      } else {
        log('⚠️  Local MongoDB container is not running. Starting it...', 'yellow');
        execSync('docker-compose --profile local up -d mongo', { stdio: 'inherit' });
      }
    } else {
      // For Atlas mode, get URI from AWS Secrets Manager and set environment variable
      try {
        const mongoUri = await getMongoAtlasUri();
        
        // Stop and remove local containers
        try {
          log('Stopping local containers...', 'blue');
          execSync('docker-compose --profile local down', { stdio: 'pipe' });
        } catch (error) {
          // Ignore if local containers aren't running
        }
        
        // Set the Atlas URI in environment and start atlas containers
        log('Starting Atlas containers...', 'blue');
        process.env.MONGODB_ATLAS_URI = mongoUri;
        execSync('docker-compose --profile atlas up -d', { 
          stdio: 'inherit',
          env: { ...process.env, MONGODB_ATLAS_URI: mongoUri }
        });
      } catch (error) {
        log('❌ Failed to get MongoDB Atlas URI from AWS Secrets Manager', 'red');
        process.exit(1);
      }
    }
    
    log('✅ App container restarted successfully', 'green');
  } catch (error) {
    log(`❌ Failed to restart containers: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Show assistance for MongoDB Atlas setup
function showAtlasHelp() {
  log('\nMongoDB Atlas Configuration Help:', 'cyan');
  log('------------------------------');
  log('MongoDB Atlas credentials are stored in AWS Secrets Manager.', 'yellow');
  log('The script will retrieve the connection URI securely when needed.');
  
  log('\nEnsure your AWS credentials are configured correctly with access to:', 'yellow');
  log('Secret name: moms-recipe-secrets-dev');
  
  log('\nThe secret should contain a key named MONGODB_URI with your MongoDB Atlas connection string.', 'yellow');
  log('You can update it using the AWS console or CLI.');
  
  log('\nAlternatively, you can run these commands:', 'yellow');
  log('cd ./infra; terraform output mongodb_srv_address', 'yellow');
  log('aws secretsmanager update-secret --secret-id moms-recipe-secrets-dev --secret-string \'{"MONGODB_URI":"your-connection-string"}\'', 'yellow');
}

// Show current status with detailed information
async function showCurrentStatus() {
  const currentMode = getCurrentMode();
  
  log('Current MongoDB connection mode: ' + currentMode, 'green');
  
  // Show additional info based on current mode
  if (currentMode === 'local') {
    log('\nUsing local Docker MongoDB container');
    const mongoStatus = await getContainerStatus('momsrecipebox-mongo');
    const appStatus = await getContainerStatus('momsrecipebox-app-local');
    
    if (mongoStatus) {
      log('MongoDB container status: Running', 'green');
    } else {
      log('MongoDB container status: Not running', 'red');
      log('You can start it with: docker-compose --profile local up -d mongo');
    }
    
    if (appStatus) {
      log('App container status: Running', 'green');
    } else {
      log('App container status: Not running', 'red');
      log('You can start it with: docker-compose --profile local up -d');
    }
  } else {
    log('\nUsing MongoDB Atlas cloud database');
    const appStatus = await getContainerStatus('momsrecipebox-app-atlas');
    
    if (appStatus) {
      log('App container status: Running', 'green');
    } else {
      log('App container status: Not running', 'red');
      log('You can start it with: docker-compose --profile atlas up -d');
    }
    
    log('Make sure you have properly configured Atlas credentials in your .env file');
    
    // Check if Atlas configuration exists in .env
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      const atlasConfigured = envContent.includes('MONGODB_ATLAS_URI=') || 
                            (envContent.includes('MONGODB_ATLAS_HOST=') && envContent.includes('MONGODB_ATLAS_USER='));
      
      if (atlasConfigured) {
        log('Atlas configuration: Found', 'green');
      } else {
        log('Atlas configuration: Not found', 'red');
        showAtlasHelp();
      }
    } catch (error) {
      log('Atlas configuration: Could not check', 'yellow');
    }
  }
}

// Show usage information
function showUsage() {
  console.log(`
🔄 MongoDB Connection Mode Switcher

Usage: node scripts/switch-mode.js [mode] [options]

Arguments:
  mode              Switch to specified mode (local|atlas)
                   If no mode specified, toggles between modes

Options:
  --show-current   Display current MongoDB mode and status
  --no-restart     Update .env file but don't restart containers
  --cleanup        Remove all stopped containers and clean up Docker
  --help          Show this help message

Examples:
  node scripts/switch-mode.js                    # Toggle between local/atlas
  node scripts/switch-mode.js local              # Switch to local mode
  node scripts/switch-mode.js atlas              # Switch to atlas mode
  node scripts/switch-mode.js --show-current     # Show current mode
  node scripts/switch-mode.js local --no-restart # Switch mode but don't restart
  node scripts/switch-mode.js --cleanup          # Clean up stopped containers

npm script shortcuts:
  npm run mode:switch         # Toggle mode
  npm run mode:local          # Switch to local
  npm run mode:atlas          # Switch to atlas  
  npm run mode:current        # Show current mode
`);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    mode: null,
    showCurrent: false,
    noRestart: false,
    cleanup: false,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--show-current') {
      result.showCurrent = true;
    } else if (arg === '--no-restart') {
      result.noRestart = true;
    } else if (arg === '--cleanup') {
      result.cleanup = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (['local', 'atlas'].includes(arg)) {
      result.mode = arg;
    }
  }
  
  return result;
}

// Cleanup stopped containers
async function cleanupContainers() {
  log('🧹 Cleaning up Docker containers...', 'cyan');
  
  try {
    // Stop and remove all profile containers
    log('Stopping and removing all MomsRecipeBox containers...', 'blue');
    
    try {
      execSync('docker-compose --profile local down', { stdio: 'pipe' });
      log('✅ Local containers cleaned up', 'green');
    } catch (error) {
      // Ignore if no local containers
    }
    
    try {
      execSync('docker-compose --profile atlas down', { stdio: 'pipe' });
      log('✅ Atlas containers cleaned up', 'green');
    } catch (error) {
      // Ignore if no atlas containers
    }
    
    // Clean up any other stopped containers related to this project
    try {
      const { stdout } = await execAsync('docker ps -a --filter "name=momsrecipebox" --format "{{.Names}}"');
      const containers = stdout.trim().split('\n').filter(name => name);
      
      if (containers.length > 0) {
        log(`Found ${containers.length} additional containers to clean up...`, 'yellow');
        for (const container of containers) {
          try {
            execSync(`docker rm -f ${container}`, { stdio: 'pipe' });
            log(`✅ Removed container: ${container}`, 'green');
          } catch (error) {
            log(`⚠️  Could not remove ${container}: ${error.message}`, 'yellow');
          }
        }
      }
    } catch (error) {
      // Ignore if no additional containers found
    }
    
    log('🎉 Docker cleanup complete!', 'green');
  } catch (error) {
    log(`❌ Cleanup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Main execution
async function main() {
  showBanner();
  
  const args = parseArgs();
  
  if (args.help) {
    showUsage();
    return;
  }
  
  // Check if Docker is running
  testDockerRunning();
  
  if (args.showCurrent) {
    await showCurrentStatus();
    return;
  }
  
  if (args.cleanup) {
    await cleanupContainers();
    return;
  }
  
  // Get current mode for toggling logic
  const currentMode = getCurrentMode();
  let targetMode = args.mode;
  
  // If no mode is provided, toggle between modes
  if (!targetMode) {
    if (currentMode === 'local') {
      targetMode = 'atlas';
      log('Toggling from local to Atlas MongoDB...');
    } else {
      targetMode = 'local';
      log('Toggling from Atlas to local MongoDB...');
    }
  } else {
    // If mode is the same as current, no change needed
    if (targetMode === currentMode) {
      log(`Already using ${targetMode} MongoDB mode. No change needed.`, 'green');
      return;
    }
    log(`Setting MongoDB mode to: ${targetMode}`);
  }
  
  // Update .env file with new mode
  updateEnvFile(targetMode);
  
  // If Atlas mode and no Atlas config visible, show help
  if (targetMode === 'atlas') {
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      const atlasConfigured = envContent.includes('MONGODB_ATLAS_URI=') || 
                            (envContent.includes('MONGODB_ATLAS_HOST=') && envContent.includes('MONGODB_ATLAS_USER='));
      
      if (!atlasConfigured) {
        log('\n⚠️  Warning: MongoDB Atlas configuration not found in .env file', 'yellow');
        showAtlasHelp();
      }
    } catch (error) {
      // Continue anyway
    }
  }
  
  // Restart app container unless --no-restart is specified
  if (!args.noRestart) {
    await restartAppContainer(targetMode);
    
    log(`\n✅ MongoDB connection mode set to: ${targetMode}`, 'green');
    
    if (targetMode === 'atlas') {
      log('\nTo verify connection, check logs with: docker-compose logs -f app');
    } else {
      log('\nTo verify connection, visit: http://localhost:8081 (MongoDB Express)');
    }
  } else {
    log(`\n✅ MongoDB connection mode set to: ${targetMode}`, 'green');
    log('Container not restarted (--no-restart flag used)');
    log('Run docker-compose up -d to apply changes');
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  log(`❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the main function
main().catch(error => {
  log(`❌ Error: ${error.message}`, 'red');
  process.exit(1);
});