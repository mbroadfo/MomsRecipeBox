#!/usr/bin/env node

/**
 * Smart UI Development Server Starter
 * Automatically detects current deployment profile and starts Vite with correct environment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const PROFILES_FILE = path.join(CONFIG_DIR, 'deployment-profiles.json');

/**
 * Get current deployment profile
 */
function getCurrentProfile() {
  try {
    const config = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
    const profileName = config.currentProfile || 'local';
    const profileData = config.profiles[profileName];
    return { name: profileName, data: profileData };
  } catch (error) {
    console.log('⚠️ Could not read profile config, defaulting to local');
    return { name: 'local', data: null };
  }
}

/**
 * Start development server with profile-appropriate environment
 */
function startDevServer() {
  const profile = getCurrentProfile();
  console.log(`🚀 Starting UI development server for profile: ${profile.name}`);
  
  // Map profile to environment variable
  const envCommand = `dev:${profile.name}`;
  
  try {
    console.log(`📦 Running: npm run ${envCommand}`);
    execSync(`npm run ${envCommand}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Failed to start ${envCommand}:`, error.message);
    console.log('🔄 Falling back to basic dev command...');
    execSync('npm run dev', { stdio: 'inherit' });
  }
}

// Run if called directly
const currentFilePath = fileURLToPath(import.meta.url);
const isCalledDirectly = currentFilePath === process.argv[1];

if (isCalledDirectly) {
  startDevServer();
}

export { startDevServer, getCurrentProfile };