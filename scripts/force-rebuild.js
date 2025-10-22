#!/usr/bin/env node

/**
 * Force Rebuild Script - Nuclear Option
 * 
 * This script performs a complete rebuild by:
 * 1. Stopping all services
 * 2. Removing Docker images completely
 * 3. Rebuilding from scratch
 * 4. Starting services
 */

import { execSync } from 'child_process';

console.log('🚨 FORCE REBUILD - Nuclear Option');
console.log('This will completely rebuild all Docker containers');

try {
  console.log('1️⃣ Stopping all services...');
  execSync('npm run stop', { stdio: 'inherit' });
  
  console.log('2️⃣ Removing Docker images...');
  try {
    execSync('docker rmi momsrecipebox-app-atlas', { stdio: 'inherit' });
  } catch (e) {
    console.log('   (Image already removed or not found)');
  }
  
  try {
    execSync('docker rmi momsrecipebox-app-local', { stdio: 'inherit' });
  } catch (e) {
    console.log('   (Local image not found - OK)');
  }
  
  console.log('3️⃣ Cleaning up Docker system...');
  try {
    execSync('docker system prune -f', { stdio: 'inherit' });
  } catch (e) {
    console.log('   (Docker prune failed - continuing)');
  }
  
  console.log('4️⃣ Starting fresh build...');
  execSync('npm run start', { stdio: 'inherit' });
  
  console.log('✅ Force rebuild complete!');
  console.log('🎯 All containers rebuilt from scratch');
  
} catch (error) {
  console.error('❌ Force rebuild failed:', error.message);
  process.exit(1);
}