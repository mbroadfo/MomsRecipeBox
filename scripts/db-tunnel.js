#!/usr/bin/env node

/**
 * Database Tunnel Manager
 * 
 * Modern replacement for StartDbTunnel.ps1
 * Creates SSH tunnel to MongoDB through AWS bastion host
 * 
 * Usage:
 *   node scripts/db-tunnel.js [start|stop|status]
 *   npm run tunnel:start
 *   npm run tunnel:stop
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { promises as fs } from 'fs';
import path from 'path';

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
 * Execute AWS CLI command
 */
async function runAwsCommand(args, options = {}) {
  return new Promise((resolve, reject) => {
    const aws = spawn('aws', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      ...options
    });

    let stdout = '';
    let stderr = '';

    aws.stdout.on('data', (data) => {
      stdout += data.toString();
      if (options.verbose) {
        process.stdout.write(data);
      }
    });

    aws.stderr.on('data', (data) => {
      stderr += data.toString();
      if (options.verbose) {
        process.stderr.write(data);
      }
    });

    aws.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(`AWS CLI failed (code ${code}): ${stderr}`));
      }
    });
  });
}

/**
 * Find bastion instance ID
 */
async function findBastionInstance() {
  try {
    log('🔍 Finding bastion instance...', 'yellow');
    
    // Ensure we're using the correct AWS profile
    process.env.AWS_PROFILE = 'mrb-api';
    log('🔧 Using AWS profile: mrb-api', 'blue');
    
    const args = [
      'ec2', 'describe-instances',
      '--filters', 'Name=tag:Name,Values=bastion', 'Name=instance-state-name,Values=running',
      '--query', 'Reservations[*].Instances[*].InstanceId',
      '--output', 'text'
    ];

    const instanceId = await runAwsCommand(args);
    
    if (!instanceId) {
      throw new Error('No running bastion instance found');
    }

    log(`✅ Bastion instance ID: ${instanceId}`, 'green');
    return instanceId.trim();

  } catch (error) {
    log(`❌ Failed to find bastion instance: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Check if SSM port forward config exists
 */
async function checkSsmConfig() {
  const configPath = path.join(projectRoot, 'ssm-port-forward.json');
  
  try {
    await fs.access(configPath);
    return configPath;
  } catch (error) {
    log('⚠️ ssm-port-forward.json not found - creating default config', 'yellow');
    
    const defaultConfig = {
      "portNumber": ["27017"],
      "localPortNumber": ["27017"],
      "host": ["your-mongodb-host.com"]
    };
    
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    
    log(`📝 Created ${configPath}`, 'blue');
    log('   Please update the "host" value with your MongoDB Atlas hostname', 'yellow');
    
    return configPath;
  }
}

/**
 * Start the database tunnel
 */
async function startTunnel() {
  try {
    log('🚀 Starting database tunnel...', 'cyan');
    
    const instanceId = await findBastionInstance();
    const configPath = await checkSsmConfig();
    
    // Ensure Session Manager plugin is available
    const pluginPath = "C:\\Program Files\\Amazon\\SessionManagerPlugin\\bin\\SessionManagerPlugin.exe";
    process.env.AWS_SSM_PLUGIN = pluginPath;
    
    log('🔗 Starting SSM port forwarding session...', 'blue');
    
    const args = [
      'ssm', 'start-session',
      '--target', instanceId,
      '--document-name', 'AWS-StartPortForwardingSessionToRemoteHost',
      '--parameters', `file://${configPath}`
    ];

    // This will run in foreground and block
    await runAwsCommand(args, { verbose: true });

  } catch (error) {
    log(`❌ Failed to start tunnel: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Stop active SSM sessions
 */
async function stopTunnel() {
  try {
    log('🛑 Stopping database tunnel...', 'yellow');
    
    // List active sessions
    const listArgs = ['ssm', 'describe-sessions', '--state', 'Active'];
    const sessions = await runAwsCommand(listArgs);
    
    if (!sessions || sessions === '[]') {
      log('ℹ️ No active SSM sessions found', 'blue');
      return;
    }

    const sessionData = JSON.parse(sessions);
    
    for (const session of sessionData.Sessions || []) {
      if (session.DocumentName === 'AWS-StartPortForwardingSessionToRemoteHost') {
        log(`🔄 Terminating session: ${session.SessionId}`, 'yellow');
        
        const terminateArgs = ['ssm', 'terminate-session', '--session-id', session.SessionId];
        await runAwsCommand(terminateArgs);
        
        log(`✅ Session terminated: ${session.SessionId}`, 'green');
      }
    }

  } catch (error) {
    log(`❌ Failed to stop tunnel: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Check tunnel status
 */
async function checkStatus() {
  try {
    log('📊 Checking tunnel status...', 'cyan');
    
    const listArgs = ['ssm', 'describe-sessions', '--state', 'Active'];
    const sessions = await runAwsCommand(listArgs);
    
    if (!sessions || sessions === '[]') {
      log('🔴 No active database tunnels', 'red');
      return false;
    }

    const sessionData = JSON.parse(sessions);
    const tunnelSessions = sessionData.Sessions?.filter(s => 
      s.DocumentName === 'AWS-StartPortForwardingSessionToRemoteHost'
    ) || [];
    
    if (tunnelSessions.length === 0) {
      log('🔴 No active database tunnels', 'red');
      return false;
    }

    log('🟢 Active database tunnel sessions:', 'green');
    tunnelSessions.forEach(session => {
      log(`   Session ID: ${session.SessionId}`, 'blue');
      log(`   Target: ${session.Target}`, 'blue');
      log(`   Started: ${new Date(session.StartDate).toLocaleString()}`, 'blue');
    });

    return true;

  } catch (error) {
    log(`❌ Failed to check status: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2] || 'start';

  try {
    switch (command.toLowerCase()) {
      case 'start':
        await startTunnel();
        process.exit(0);
        break;
      case 'stop':
        await stopTunnel();
        process.exit(0);
        break;
      case 'status':
        await checkStatus();
        process.exit(0);
        break;
      default:
        log('Usage: node scripts/db-tunnel.js [start|stop|status]', 'yellow');
        log('   or: npm run tunnel:[start|stop|status]', 'yellow');
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

export { startTunnel, stopTunnel, checkStatus };