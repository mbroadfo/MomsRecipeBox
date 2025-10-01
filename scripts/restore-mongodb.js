#!/usr/bin/env node

/**
 * MongoDB Restore Manager
 * 
 * Cross-platform replacement for PowerShell restore scripts
 * Supports local and Atlas MongoDB restoration from backups and S3
 * 
 * Usage:
 *   node scripts/restore-mongodb.js [options]
 *   npm run restore:from-local
 *   npm run restore:from-s3
 *   npm run restore:latest
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { Command } from 'commander';
import extract from 'extract-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

// ASCII Banner
const BANNER = `
╔═══════════════════════════════════════════════════════════════╗
║                    MOM'S RECIPE BOX                          ║
║              MongoDB Restore & Recovery Tool                 ║
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
 * Get restore configuration
 */
async function getRestoreConfig(options) {
  const envConfig = await loadEnvConfig();
  
  return {
    database: {
      name: options.database || envConfig.MONGODB_DB_NAME || 'moms_recipe_box_dev',
      mode: envConfig.MONGODB_MODE || 'local',
  containerName: 'momsrecipebox-mongo-local',
      user: envConfig.MONGODB_LOCAL_ROOT_USER || 'admin',
      password: envConfig.MONGODB_LOCAL_ROOT_PASSWORD || 'supersecret',
      // Atlas configuration
      secretName: envConfig.AWS_SECRET_NAME || 'moms-recipe-secrets-dev'
    },
    restore: {
      backupPath: options.backupPath || '',
      s3Bucket: envConfig.BACKUP_S3_BUCKET || 'mrb-mongodb-backups-dev',
      tempPath: options.tempPath || path.join(process.cwd(), 'temp_restore'),
      dryRun: options.dryRun || false,
      force: options.force || false,
      createBackup: options.createBackup || false,
      collections: options.collections || []
    },
    aws: {
      profile: options.awsProfile || 'terraform-mrb',
      region: envConfig.AWS_REGION || 'us-west-2'
    }
  };
}

/**
 * Test MongoDB connection (local container)
 */
async function testLocalMongoConnection(config) {
  try {
    log('🔍 Testing local MongoDB connection...', 'blue');
    
    const testCommand = "db.adminCommand('ping')";
    await runCommand('docker', [
      'exec', config.database.containerName,
      'mongosh', '--eval', testCommand, '--quiet'
    ], { silent: true });
    
    log('✅ Local MongoDB connection successful', 'green');
    return true;
  } catch (error) {
    log(`❌ Local MongoDB connection failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Get MongoDB Atlas URI from AWS Secrets Manager
 */
async function getAtlasUri(config) {
  try {
    log('🔑 Retrieving MongoDB Atlas URI from AWS Secrets Manager...', 'blue');
    
    // Set AWS profile
    process.env.AWS_PROFILE = config.aws.profile;
    
    const result = await runCommand('aws', [
      'secretsmanager', 'get-secret-value',
      '--secret-id', config.database.secretName,
      '--region', config.aws.region,
      '--query', 'SecretString',
      '--output', 'text'
    ], { silent: true });
    
    const secrets = JSON.parse(result);
    const atlasUri = secrets.MONGODB_URI;
    
    if (!atlasUri) {
      throw new Error('MONGODB_URI not found in secrets');
    }
    
    log('✅ Atlas URI retrieved successfully', 'green');
    return atlasUri;
  } catch (error) {
    log(`❌ Failed to get Atlas URI: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * List available backups in S3
 */
async function listS3Backups(config) {
  try {
    log('📋 Listing available backups in S3...', 'blue');
    
    // Set AWS profile
    process.env.AWS_PROFILE = config.aws.profile;
    
    const result = await runCommand('aws', [
      's3api', 'list-objects-v2',
      '--bucket', config.restore.s3Bucket,
      '--prefix', 'backup_',
      '--delimiter', '/',
      '--query', "CommonPrefixes[].Prefix",
      '--output', 'json'
    ], { silent: true });
    
    const prefixes = JSON.parse(result);
    
    if (!prefixes || prefixes.length === 0) {
      log('⚠️ No backups found in S3 bucket', 'yellow');
      return [];
    }
    
    // Convert prefixes to backup objects and sort by date (newest first)
    const backups = prefixes.map(prefix => ({
      Key: prefix,
      Name: prefix.replace(/\/$/, ''),
      Date: prefix.match(/backup_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/)?.[1] || ''
    })).sort((a, b) => b.Date.localeCompare(a.Date));
    
    log(`Found ${backups.length} backups:`, 'green');
    backups.forEach((backup, index) => {
      log(`  ${index + 1}. ${backup.Name} (${backup.Date})`, 'white');
    });
    
    return backups;
  } catch (error) {
    log(`❌ Failed to list S3 backups: ${error.message}`, 'red');
    return [];
  }
}

/**
 * Download backup from S3
 */
async function downloadFromS3(config, s3Key, localPath) {
  try {
    log(`☁️ Downloading backup from S3: ${s3Key}`, 'blue');
    
    // Set AWS profile
    process.env.AWS_PROFILE = config.aws.profile;
    
    // Create local directory
    await fs.mkdir(localPath, { recursive: true });
    
    // Use s3 sync for folder-based backups
    await runCommand('aws', [
      's3', 'sync',
      `s3://${config.restore.s3Bucket}/${s3Key}`,
      localPath,
      '--region', config.aws.region
    ]);
    
    log('✅ Backup downloaded successfully', 'green');
    return localPath;
  } catch (error) {
    log(`❌ S3 download failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Validate backup path and extract if needed
 */
async function prepareBackupPath(config, backupPath) {
  try {
    log('🔍 Validating backup path...', 'blue');
    
    // Check if path exists
    const stats = await fs.stat(backupPath);
    
    if (stats.isFile() && path.extname(backupPath) === '.zip') {
      log('📦 Extracting compressed backup...', 'blue');
      
      const extractDir = path.join(path.dirname(backupPath), 'extracted_' + Date.now());
      await fs.mkdir(extractDir, { recursive: true });
      
      await extract(backupPath, { dir: extractDir });
      
      // Find the actual database directory
      const contents = await fs.readdir(extractDir);
      const dbDir = contents.find(name => name === config.database.name);
      
      if (dbDir) {
        return path.join(extractDir, dbDir);
      } else {
        // Look for any directory with BSON files
        for (const item of contents) {
          const itemPath = path.join(extractDir, item);
          const itemStats = await fs.stat(itemPath);
          if (itemStats.isDirectory()) {
            const files = await fs.readdir(itemPath);
            if (files.some(f => f.endsWith('.bson'))) {
              return itemPath;
            }
          }
        }
        throw new Error('No valid database backup found in archive');
      }
    } else if (stats.isDirectory()) {
      return backupPath;
    } else {
      throw new Error('Invalid backup path - must be directory or zip file');
    }
  } catch (error) {
    log(`❌ Backup path validation failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Read backup metadata
 */
async function readBackupMetadata(backupPath) {
  try {
    const metadataPath = path.join(path.dirname(backupPath), 'metadata.json');
    
    if (await fs.access(metadataPath).then(() => true).catch(() => false)) {
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      log('📋 Backup metadata loaded:', 'blue');
      log(`  Type: ${metadata.type}`, 'white');
      log(`  Database: ${metadata.database}`, 'white');
      log(`  Created: ${new Date(metadata.timestamp).toLocaleString()}`, 'white');
      return metadata;
    }
  } catch (error) {
    log('⚠️ Could not read backup metadata', 'yellow');
  }
  
  return null;
}

/**
 * Create safety backup before restore
 */
async function createSafetyBackup(config) {
  try {
    log('🛡️ Creating safety backup before restore...', 'blue');
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const safetyDir = path.join(config.restore.tempPath, `safety_backup_${timestamp}`);
    await fs.mkdir(safetyDir, { recursive: true });
    
    // Use the backup script to create a quick backup
    const { performBackup } = await import('./backup-mongodb.js');
    
    const backupResult = await performBackup({
      type: 'safety',
      destination: safetyDir,
      compress: false,
      verify: false,
      s3Upload: false
    });
    
    log(`✅ Safety backup created: ${backupResult.backupPath}`, 'green');
    return backupResult.backupPath;
  } catch (error) {
    log(`⚠️ Safety backup failed: ${error.message}`, 'yellow');
    return null;
  }
}

/**
 * Perform local MongoDB restore using mongorestore
 */
async function performLocalRestore(config, backupPath, collections) {
  try {
    log('🔄 Restoring to local MongoDB...', 'blue');
    
    // Copy backup to container
    const containerBackupPath = '/tmp/restore_backup';
    
    await runCommand('docker', [
      'exec', config.database.containerName,
      'rm', '-rf', containerBackupPath
    ], { silent: true });

    await runCommand('docker', [
      'cp', backupPath, `${config.database.containerName}:${containerBackupPath}`
    ]);

    // Build mongorestore command - point to the database folder within the backup
    const restoreArgs = [
      'exec', config.database.containerName,
      'mongorestore',
      '--host', 'localhost:27017',
      '--username', config.database.user,
      '--password', config.database.password,
      '--authenticationDatabase', 'admin',
      '--db', config.database.name,
      '--drop',  // Drop existing collections before restore
      `${containerBackupPath}/moms_recipe_box`  // Point to the actual database backup folder
    ];    await runCommand('docker', restoreArgs);
    
    // Clean up container backup
    await runCommand('docker', [
      'exec', config.database.containerName,
      'rm', '-rf', containerBackupPath
    ], { silent: true });
    
    log('✅ Local restore completed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Local restore failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Perform Atlas MongoDB restore using mongorestore
 */
async function performAtlasRestore(config, backupPath, collections) {
  try {
    log('🌐 Restoring to MongoDB Atlas...', 'blue');
    
    const atlasUri = await getAtlasUri(config);
    
    // Build mongorestore command
    const restoreArgs = [
      'mongorestore',
      '--uri', atlasUri,
      '--db', config.database.name,
      '--drop'  // Drop existing collections before restore
    ];
    
    // Add specific collections if specified
    if (collections && collections.length > 0) {
      for (const collection of collections) {
        restoreArgs.push('--collection', collection);
        restoreArgs.push(path.join(backupPath, `${collection}.bson`));
      }
    } else {
      restoreArgs.push(backupPath);
    }
    
    await runCommand('mongorestore', restoreArgs);
    
    log('✅ Atlas restore completed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Atlas restore failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Verify restore integrity
 */
async function verifyRestore(config, metadata) {
  try {
    log('🔍 Verifying restore integrity...', 'blue');
    
    const isLocal = config.database.mode === 'local';
    
    // Get current database statistics
    // Compose stats command as a single line for shell compatibility
    const statsCommand = `db = db.getSiblingDB('${config.database.name}'); const stats = db.stats(); const collections = db.getCollectionNames(); let collectionStats = {}; collections.forEach(col => { collectionStats[col] = db[col].countDocuments(); }); printjson({ collections: stats.collections, collectionCounts: collectionStats });`;
    
    let result;
    if (isLocal) {
      // Use --eval and --quiet, and connect directly to the correct database with authentication
        result = await runCommand('docker', [
          'exec', config.database.containerName,
          'mongosh', 
          config.database.name, 
          '--quiet', 
          '--username', config.database.user,
          '--password', config.database.password,
          '--authenticationDatabase', 'admin',
          '--eval', `"${statsCommand}"`
        ], { silent: true });
    } else {
      const atlasUri = await getAtlasUri(config);
      result = await runCommand('mongosh', [
        atlasUri, '--eval', `"${statsCommand}"`, '--quiet'
      ], { silent: true });
    }
    
  // Debug: print raw mongosh output
  log('--- mongosh raw output ---', 'magenta');
  log(result, 'magenta');
  log('--- end mongosh output ---', 'magenta');
  
  // Extract the first JSON object from the result and manually parse it
  try {
    // Extract collections count
    const collectionsMatch = result.match(/collections:\s*Long\(['"]?(\d+)['"]?\)/);
    const collectionsCount = collectionsMatch ? parseInt(collectionsMatch[1]) : 0;
    
    // Extract collection stats using regex instead of JSON parsing
    const collectionCounts = {};
    
    // Use regex to find collection names and their counts
    const countMatches = result.matchAll(/(\w+):\s*(\d+)/g);
    for (const match of countMatches) {
      const collName = match[1];
      const count = parseInt(match[2]);
      if (collName !== 'collections') { // Skip the main collections count
        collectionCounts[collName] = count;
      }
    }
    
    // Build our own stats object
    const currentStats = {
      collections: collectionsCount,
      collectionCounts: collectionCounts
    };
    
    if (metadata && metadata.preBackupStats) {
      const originalCounts = metadata.preBackupStats.collectionCounts || {};
      const currentCounts = currentStats.collectionCounts || {};
      
      log('Restoration verification:', 'blue');
      Object.entries(originalCounts).forEach(([name, originalCount]) => {
        const currentCount = currentCounts[name] || 0;
        const status = currentCount === originalCount ? '✅' : '⚠️';
        log(`  ${status} ${name}: ${currentCount}/${originalCount} documents`, 'white');
      });
    }
    
    log('✅ Restore verification completed', 'green');
    return true;
  } catch (error) {
    log(`⚠️ Restore verification JSON parsing failed: ${error.message}`, 'yellow');
    return false;
  }
  } catch (error) {
    log(`⚠️ Restore verification failed: ${error.message}`, 'yellow');
    return false;
  }
}

/**
 * Show restore summary
 */
function showRestoreSummary(config, metadata, duration, safetyBackupPath) {
  log('\\n' + '='.repeat(60), 'cyan');
  log('📊 RESTORE SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Database: ${config.database.name} (${config.database.mode} mode)`, 'white');
  log(`Source: ${config.restore.backupPath}`, 'white');
  log(`Duration: ${duration}s`, 'white');
  
  if (metadata) {
    log(`Backup Type: ${metadata.type}`, 'white');
    log(`Backup Date: ${new Date(metadata.timestamp).toLocaleString()}`, 'white');
  }
  
  if (safetyBackupPath) {
    log(`Safety Backup: ${safetyBackupPath}`, 'yellow');
  }
  
  log('='.repeat(60), 'cyan');
}

/**
 * Main restore function
 */
async function performRestore(options) {
  const startTime = Date.now();
  
  try {
    banner();
    
    const config = await getRestoreConfig(options);
    const isLocal = config.database.mode === 'local';
    
    log('🚀 Starting MongoDB Restore Process', 'cyan');
    log(`Mode: ${isLocal ? 'Local Container' : 'Atlas Cloud'}`, 'yellow');
    log(`Database: ${config.database.name}`, 'yellow');
    log(`Dry Run: ${config.restore.dryRun ? 'Yes' : 'No'}`, 'yellow');
    
    if (config.restore.dryRun) {
      log('🔍 DRY RUN - No actual changes will be made', 'yellow');
    }
    
    // Handle different restore sources
    let backupPath = config.restore.backupPath;
    
    if (options.fromS3 || options.latest) {
      const backups = await listS3Backups(config);
      if (backups.length === 0) {
        throw new Error('No backups found in S3');
      }
      
      let selectedBackup;
      if (options.latest) {
        selectedBackup = backups[0]; // Most recent
        log(`Selected latest backup: ${selectedBackup.Key}`, 'green');
      } else {
        // Interactive selection could be added here
        selectedBackup = backups[0]; // Default to latest for now
      }
      
      // Download from S3
      const downloadPath = path.join(config.restore.tempPath, selectedBackup.Name);
      await fs.mkdir(config.restore.tempPath, { recursive: true });
      
      backupPath = await downloadFromS3(config, selectedBackup.Key, downloadPath);
    }
    
    if (!backupPath) {
      throw new Error('No backup path specified. Use --backup-path, --from-s3, or --latest');
    }
    
    // Test connection
    if (isLocal && !(await testLocalMongoConnection(config))) {
      throw new Error('Local MongoDB connection failed');
    }
    
    // Prepare backup (extract if needed)
    const preparedBackupPath = await prepareBackupPath(config, backupPath);
    
    // Read metadata
    const metadata = await readBackupMetadata(preparedBackupPath);
    
    if (config.restore.dryRun) {
      log('🔍 DRY RUN COMPLETE - Would restore from:', 'green');
      log(`  Backup Path: ${preparedBackupPath}`, 'white');
      if (metadata) {
        log(`  Backup Type: ${metadata.type}`, 'white');
        log(`  Backup Date: ${new Date(metadata.timestamp).toLocaleString()}`, 'white');
      }
      return { success: true, dryRun: true };
    }
    
    // Create safety backup if requested
    let safetyBackupPath = null;
    if (config.restore.createBackup) {
      safetyBackupPath = await createSafetyBackup(config);
    }
    
    // Perform restore
    if (isLocal) {
      await performLocalRestore(config, preparedBackupPath, config.restore.collections);
    } else {
      await performAtlasRestore(config, preparedBackupPath, config.restore.collections);
    }
    
    // Verify restore
    await verifyRestore(config, metadata);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    showRestoreSummary(config, metadata, duration, safetyBackupPath);
    
    log(`\\n🎉 Restore completed successfully in ${duration}s!`, 'green');
    
    return {
      success: true,
      backupPath: preparedBackupPath,
      metadata,
      safetyBackupPath
    };
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`\\n❌ Restore failed after ${duration}s: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Show help with examples
 */
function showHelp() {
  banner();
  log('MongoDB Restore Manager - Cross-Platform PowerShell Replacement\\n', 'cyan');
  
  log('USAGE:', 'bright');
  log('  node scripts/restore-mongodb.js [options]', 'white');
  log('  npm run restore:from-local', 'white');
  log('  npm run restore:from-s3', 'white');
  log('  npm run restore:latest', 'white');
  log('');
  
  log('EXAMPLES:', 'bright');
  log('  # Restore from local backup directory', 'white');
  log('  node scripts/restore-mongodb.js --backup-path ./backups/2024-12-19/full_backup', 'green');
  log('');
  log('  # Restore latest backup from S3', 'white');
  log('  npm run restore:latest', 'green');
  log('');
  log('  # Restore from S3 with interactive selection', 'white');
  log('  npm run restore:from-s3', 'green');
  log('');
  log('  # Dry run to see what would be restored', 'white');
  log('  node scripts/restore-mongodb.js --backup-path ./backup.zip --dry-run', 'green');
  log('');
  log('  # Create safety backup before restore', 'white');
  log('  node scripts/restore-mongodb.js --backup-path ./backup --create-backup', 'green');
  log('');
  
  log('MIGRATION FROM POWERSHELL:', 'bright');
  log('  Old: .\\\\scripts\\\\Restore-MongoDBFromS3.ps1 -BackupKey latest', 'yellow');
  log('  New: npm run restore:latest', 'green');
  log('');
  log('  Old: .\\\\scripts\\\\local_db\\\\restore-mongodb.ps1 -BackupPath ./backup', 'yellow');
  log('  New: node scripts/restore-mongodb.js --backup-path ./backup', 'green');
  log('');
}

/**
 * CLI setup and main execution
 */
async function main() {
  const program = new Command();
  
  program
    .name('restore-mongodb')
    .description('Restore MongoDB databases from backups and S3 (replaces PowerShell restore scripts)')
    .version('1.0.0')
    .option('-b, --backup-path <path>', 'Local backup path (directory or zip file)')
    .option('--from-s3', 'Restore from S3 bucket')
    .option('--latest', 'Restore latest backup from S3')
    .option('-d, --database <name>', 'Target database name')
    .option('-c, --collections <collections...>', 'Specific collections to restore')
    .option('--temp-path <path>', 'Temporary directory for extractions')
    .option('--dry-run', 'Show what would be restored without executing')
    .option('--force', 'Force restore without confirmation')
    .option('--create-backup', 'Create safety backup before restore')
    .option('-p, --aws-profile <profile>', 'AWS profile to use', 'terraform-mrb')
    .option('-h, --help', 'Show detailed help with examples')
    .parse();

  const options = program.opts();

  if (options.help) {
    showHelp();
    return;
  }

  try {
    await performRestore(options);
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

export { performRestore };