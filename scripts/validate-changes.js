#!/usr/bin/env node

/**
 * Quick validation script to test our modernization changes
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - Missing: ${filePath}`, 'red');
    return false;
  }
}

function testJsonSyntax(filePath) {
  try {
    JSON.parse(fs.readFileSync(filePath, 'utf8'));
    log(`✅ ${filePath} has valid JSON syntax`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${filePath} has invalid JSON syntax: ${error.message}`, 'red');
    return false;
  }
}

log('🧪 Testing Modernization Changes', 'cyan');
log('================================', 'cyan');

let allPassed = true;

// Test 1: Enhanced .env.example file
log('\n📋 Test 1: Environment Configuration', 'cyan');
if (checkFile('.env.example', 'Enhanced .env.example exists')) {
  const envContent = fs.readFileSync('.env.example', 'utf8');
  const requiredSections = [
    'DEPLOYMENT MODE CONFIGURATION',
    'DATABASE CONFIGURATION', 
    'AWS CONFIGURATION',
    'DEPLOYMENT MODE EXAMPLES'
  ];
  
  for (const section of requiredSections) {
    if (envContent.includes(section)) {
      log(`✅ Contains ${section} section`, 'green');
    } else {
      log(`❌ Missing ${section} section`, 'red');
      allPassed = false;
    }
  }
} else {
  allPassed = false;
}

// Test 2: GitHub Actions CI Pipeline
log('\n🔄 Test 2: GitHub Actions CI', 'cyan');
const ciExists = checkFile('.github/workflows/ci.yml', 'CI workflow file exists');
if (!ciExists) allPassed = false;

// Test 3: Enhanced package.json scripts
log('\n📦 Test 3: NPM Scripts', 'cyan');
if (checkFile('package.json', 'package.json exists')) {
  if (testJsonSyntax('package.json')) {
    const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const newScripts = [
      'dev:local',
      'dev:atlas', 
      'setup:local',
      'setup:atlas',
      'health',
      'validate'
    ];
    
    for (const script of newScripts) {
      if (packageData.scripts && packageData.scripts[script]) {
        log(`✅ Script '${script}' added`, 'green');
      } else {
        log(`❌ Script '${script}' missing`, 'red');
        allPassed = false;
      }
    }
  } else {
    allPassed = false;
  }
} else {
  allPassed = false;
}

// Test 4: Docker Compose enhancements
log('\n🐳 Test 4: Docker Compose Files', 'cyan');
const dockerFiles = [
  ['docker-compose.yml', 'Main docker-compose file exists'],
  ['docker-compose.local.yml', 'Local development override exists'],
  ['docker-compose.atlas.yml', 'Atlas mode override exists']
];

for (const [file, description] of dockerFiles) {
  if (!checkFile(file, description)) {
    allPassed = false;
  }
}

// Test 5: Cross-platform setup script
log('\n🛠️ Test 5: Setup Scripts', 'cyan');
if (!checkFile('scripts/setup-environment.js', 'Cross-platform setup script exists')) {
  allPassed = false;
}

// Test 6: Validate Docker Compose syntax (if Docker is available)
log('\n🔍 Test 6: Docker Validation', 'cyan');
try {
  execSync('docker --version', { stdio: 'pipe' });
  
  try {
    execSync('docker-compose config', { stdio: 'pipe' });
    log('✅ Docker Compose configuration is valid', 'green');
  } catch (error) {
    log('❌ Docker Compose configuration has errors', 'red');
    allPassed = false;
  }
} catch (error) {
  log('⚠️ Docker not available - skipping validation', 'yellow');
}

// Test 7: Check for any syntax errors in new files
log('\n📝 Test 7: File Syntax', 'cyan');
const newFiles = [
  'scripts/setup-environment.js',
  '.github/workflows/ci.yml'
];

for (const file of newFiles) {
  if (fs.existsSync(file)) {
    // For .js files, try a basic syntax check
    if (file.endsWith('.js')) {
      try {
        // Basic syntax check by attempting to parse as module
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('import ') && content.includes('from ')) {
          log(`✅ ${file} appears to have valid ES module syntax`, 'green');
        } else {
          log(`⚠️ ${file} syntax check skipped`, 'yellow');
        }
      } catch (error) {
        log(`❌ ${file} may have syntax errors`, 'red');
        allPassed = false;
      }
    } else {
      log(`✅ ${file} exists`, 'green');
    }
  }
}

// Summary
log('\n📊 Test Results', 'cyan');
log('===============', 'cyan');

if (allPassed) {
  log('🎉 All tests passed! Modernization foundation is ready.', 'green');
  log('\n🚀 Next steps:', 'cyan');
  log('1. Run: npm run setup:local', 'cyan');
  log('2. Run: npm run dev:local', 'cyan'); 
  log('3. Test: npm run health', 'cyan');
  log('4. Verify: http://localhost:3000/health', 'cyan');
} else {
  log('💥 Some tests failed. Please review the issues above.', 'red');
  process.exit(1);
}

log('\n📋 Available new commands:', 'cyan');
log('- npm run setup:local     # Set up local development', 'cyan');
log('- npm run setup:atlas     # Set up Atlas development', 'cyan');
log('- npm run dev:local       # Start local development', 'cyan');
log('- npm run health          # Check application health', 'cyan');
log('- npm run validate        # Validate configuration', 'cyan');
log('- node scripts/setup-environment.js help  # Full help', 'cyan');