#!/usr/bin/env node

/**
 * MongoDB Backup Manager
 * 
 * Cross-platform replacement for PowerShell backup scripts
 * Supports local and Atlas MongoDB backups with S3 integration
 * 
 * Usage:
 *   node scripts/backup-mongodb.js [options]
 *   npm run backup:local
 *   npm run backup:atlas
 *   npm run backup:full
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { Command } from 'commander';
import archiver from 'archiver';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

// ASCII Banner
const BANNER = `
╔═══════════════════════════════════════════════════════════════╗
║                    MOM'S RECIPE BOX                          ║
║              MongoDB Backup & Archive Tool                   ║
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
 * Get backup configuration
 */
async function getBackupConfig(options) {
  const envConfig = await loadEnvConfig();
  
  return {
    database: {
      name: envConfig.MONGODB_DB_NAME || 'moms_recipe_box_dev',
      mode: envConfig.MONGODB_MODE || 'local',
      containerName: 'momsrecipebox-mongo',
      // Atlas configuration
      atlasUri: envConfig.MONGODB_ATLAS_URI || '',
      secretName: envConfig.AWS_SECRET_NAME || 'moms-recipe-secrets-dev'
    },
    backup: {
      rootPath: options.destination || envConfig.BACKUP_ROOT_PATH || './backups',
      compress: options.compress !== undefined ? options.compress : true,
      verify: options.verify !== undefined ? options.verify : true,
      s3Upload: options.s3Upload !== undefined ? options.s3Upload : false,
      s3Bucket: envConfig.BACKUP_S3_BUCKET || 'mrb-mongodb-backups-dev'
    },
    aws: {
      profile: options.awsProfile || 'terraform-mrb',
      region: envConfig.AWS_REGION || 'us-west-2'
    }
  };
}

/**
 * Create backup directory with timestamp
 */
async function createBackupDirectory(config, type) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const date = timestamp.slice(0, 10);
  
  let backupDir;
  switch (type) {
    case 'full':
      backupDir = path.join(config.backup.rootPath, date, `full_${timestamp}`);
      break;
    case 'atlas':
      backupDir = path.join(config.backup.rootPath, date, `atlas_${timestamp}`);
      break;
    case 'archive':
      backupDir = path.join(config.backup.rootPath, 'archive', `weekly_${date}`);
      break;
    default:
      backupDir = path.join(config.backup.rootPath, date, `${type}_${timestamp}`);
  }
  
  await fs.mkdir(backupDir, { recursive: true });
  return backupDir;
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
 * Get database statistics
 */
async function getDatabaseStats(config, isLocal = true) {
  try {
    log('📊 Gathering database statistics...', 'blue');
    
    const statsCommand = `
      db = db.getSiblingDB('${config.database.name}');
      const stats = db.stats();
      const collections = db.getCollectionNames();
      let collectionStats = {};
      collections.forEach(col => {
        collectionStats[col] = db[col].countDocuments();
      });
      printjson({
        dbStats: {
          collections: stats.collections,
          objects: stats.objects,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize
        },
        collectionCounts: collectionStats
      });
    `;
    
    let result;
    if (isLocal) {
      result = await runCommand('docker', [
        'exec', config.database.containerName,
        'mongosh', '--eval', statsCommand, '--quiet'
      ], { silent: true });
    } else {
      // For Atlas, we need to use mongosh with connection string
      const atlasUri = await getAtlasUri(config);
      result = await runCommand('mongosh', [
        atlasUri, '--eval', statsCommand, '--quiet'
      ], { silent: true });
    }
    
    return JSON.parse(result);
  } catch (error) {
    log(`⚠️ Could not get database stats: ${error.message}`, 'yellow');
    return {};
  }
}

/**
 * Perform local MongoDB backup using mongodump
 */
async function performLocalBackup(config, backupDir) {
  try {
    log('🏗️ Creating local MongoDB dump...', 'blue');
    
    // Create mongodump inside container
    await runCommand('docker', [
      'exec', config.database.containerName,
      'mongodump',
      '--db', config.database.name,
      '--out', '/tmp/backup'
    ]);
    
    log('📦 Copying backup from container...', 'blue');
    
    // Copy backup from container to host
    await runCommand('docker', [
      'cp',
      `${config.database.containerName}:/tmp/backup/${config.database.name}`,
      backupDir
    ]);
    
    // Clean up container backup
    await runCommand('docker', [
      'exec', config.database.containerName,
      'rm', '-rf', '/tmp/backup'
    ], { silent: true });
    
    log('✅ Local backup created successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Local backup failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Perform MongoDB Atlas backup using mongodump
 */
async function performAtlasBackup(config, backupDir) {
  try {
    log('🌐 Creating MongoDB Atlas dump...', 'blue');
    
    const atlasUri = await getAtlasUri(config);
    
    // Use mongodump with Atlas URI
    await runCommand('mongodump', [
      '--uri', atlasUri,
      '--db', config.database.name,
      '--out', backupDir
    ]);
    
    log('✅ Atlas backup created successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Atlas backup failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Compress backup directory
 */
async function compressBackup(backupDir) {
  try {
    log('🗜️ Compressing backup...', 'blue');
    
    const zipPath = `${backupDir}.zip`;
    
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        log(`✅ Backup compressed: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`, 'green');
        resolve(zipPath);
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      
      archive.directory(backupDir, false);
      archive.finalize();
    });
  } catch (error) {
    log(`❌ Compression failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Upload backup to S3
 */
async function uploadToS3(config, filePath, backupName) {
  try {
    log('☁️ Uploading backup to S3...', 'blue');
    
    // Set AWS profile
    process.env.AWS_PROFILE = config.aws.profile;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const s3Key = `backups/${timestamp}/${backupName}.zip`;
    
    await runCommand('aws', [
      's3', 'cp', filePath,
      `s3://${config.backup.s3Bucket}/${s3Key}`,
      '--region', config.aws.region
    ]);
    
    const s3Url = `s3://${config.backup.s3Bucket}/${s3Key}`;
    log(`✅ Backup uploaded to S3: ${s3Url}`, 'green');
    
    return s3Url;
  } catch (error) {
    log(`❌ S3 upload failed: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Verify backup integrity
 */
async function verifyBackup(backupDir, metadata) {
  try {
    log('🔍 Verifying backup integrity...', 'blue');
    
    // Check metadata file
    const metadataPath = path.join(backupDir, 'metadata.json');
    if (!(await fs.access(metadataPath).then(() => true).catch(() => false))) {
      throw new Error('Metadata file not found');
    }
    
    // Check for BSON files (mongodump format)
    const files = await fs.readdir(backupDir, { recursive: true });
    const bsonFiles = files.filter(f => f.endsWith('.bson'));
    
    if (bsonFiles.length === 0) {
      throw new Error('No BSON files found in backup');
    }
    
    log(`✅ Backup verification passed (${bsonFiles.length} collections)`, 'green');
    return true;
  } catch (error) {
    log(`❌ Backup verification failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Create backup metadata
 */
function createMetadata(config, type, backupDir, stats) {
  return {
    type,
    timestamp: new Date().toISOString(),
    database: config.database.name,
    mode: config.database.mode,
    backupPath: backupDir,
    preBackupStats: stats,
    version: '1.0.0',
    tool: 'backup-mongodb.js'
  };
}

/**
 * Save backup metadata
 */
async function saveMetadata(backupDir, metadata) {
  const metadataPath = path.join(backupDir, 'metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

/**
 * Show backup summary
 */
function showBackupSummary(config, metadata, duration, s3Url = null) {
  log('\\n' + '='.repeat(60), 'cyan');
  log('📊 BACKUP SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Type: ${metadata.type}`, 'white');
  log(`Database: ${metadata.database} (${metadata.mode} mode)`, 'white');
  log(`Backup Path: ${metadata.backupPath}`, 'white');
  log(`Duration: ${duration}s`, 'white');
  
  if (metadata.preBackupStats.collectionCounts) {
    log('\\nCollections backed up:', 'white');
    Object.entries(metadata.preBackupStats.collectionCounts).forEach(([name, count]) => {
      log(`  • ${name}: ${count} documents`, 'green');
    });
  }
  
  if (s3Url) {
    log(`\\nS3 URL: ${s3Url}`, 'cyan');
  }
  
  log('='.repeat(60), 'cyan');
}

/**
 * Main backup function
 */
async function performBackup(options) {
  const startTime = Date.now();
  
  try {
    banner();
    
    const config = await getBackupConfig(options);
    const isLocal = config.database.mode === 'local' || options.type === 'local';
    
    log('🚀 Starting MongoDB Backup Process', 'cyan');
    log(`Type: ${options.type}`, 'yellow');
    log(`Mode: ${isLocal ? 'Local Container' : 'Atlas Cloud'}`, 'yellow');
    log(`Database: ${config.database.name}`, 'yellow');
    log(`S3 Upload: ${config.backup.s3Upload ? 'Yes' : 'No'}`, 'yellow');
    
    // Test connection
    if (isLocal && !(await testLocalMongoConnection(config))) {
      throw new Error('Local MongoDB connection failed');
    }
    
    // Get database statistics
    const stats = await getDatabaseStats(config, isLocal);
    
    // Create backup directory
    const backupDir = await createBackupDirectory(config, options.type);
    
    // Create metadata
    const metadata = createMetadata(config, options.type, backupDir, stats);
    
    // Perform backup
    if (isLocal) {
      await performLocalBackup(config, backupDir);
    } else {
      await performAtlasBackup(config, backupDir);
    }
    
    // Save metadata
    await saveMetadata(backupDir, metadata);
    
    // Verify backup if requested
    if (config.backup.verify && !(await verifyBackup(backupDir, metadata))) {
      throw new Error('Backup verification failed');
    }
    
    let finalPath = backupDir;
    let s3Url = null;
    
    // Compress if requested
    if (config.backup.compress) {
      const zipPath = await compressBackup(backupDir);
      
      // Remove uncompressed directory
      await fs.rm(backupDir, { recursive: true, force: true });
      finalPath = zipPath;
    }
    
    // Upload to S3 if requested
    if (config.backup.s3Upload) {
      const backupName = path.basename(finalPath, path.extname(finalPath));
      s3Url = await uploadToS3(config, finalPath, backupName);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    showBackupSummary(config, metadata, duration, s3Url);
    
    log(`\\n🎉 Backup completed successfully in ${duration}s!`, 'green');
    
    return {
      success: true,
      backupPath: finalPath,
      metadata,
      s3Url
    };
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`\\n❌ Backup failed after ${duration}s: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Show help with examples
 */
function showHelp() {
  banner();
  log('MongoDB Backup Manager - Cross-Platform PowerShell Replacement\\n', 'cyan');
  
  log('USAGE:', 'bright');
  log('  node scripts/backup-mongodb.js [options]', 'white');
  log('  npm run backup:local', 'white');
  log('  npm run backup:atlas', 'white');
  log('  npm run backup:full', 'white');
  log('');
  
  log('EXAMPLES:', 'bright');
  log('  # Local MongoDB backup (default)', 'white');
  log('  npm run backup:local', 'green');
  log('');
  log('  # Atlas MongoDB backup', 'white');
  log('  npm run backup:atlas', 'green');
  log('');
  log('  # Full backup with S3 upload', 'white');
  log('  npm run backup:full', 'green');
  log('');
  log('  # Backup without compression', 'white');
  log('  node scripts/backup-mongodb.js --no-compress', 'green');
  log('');
  log('  # Custom destination', 'white');
  log('  node scripts/backup-mongodb.js --destination ./my-backups', 'green');
  log('');
  
  log('MIGRATION FROM POWERSHELL:', 'bright');
  log('  Old: .\\\\scripts\\\\Backup-MongoDBToS3.ps1', 'yellow');
  log('  New: npm run backup:full', 'green');
  log('');
  log('  Old: .\\\\scripts\\\\local_db\\\\backup-mongodb.ps1 -Type full', 'yellow');
  log('  New: npm run backup:local', 'green');
  log('');
}

/**
 * CLI setup and main execution
 */
async function main() {
  const program = new Command();
  
  program
    .name('backup-mongodb')
    .description('Backup MongoDB databases with S3 integration (replaces PowerShell backup scripts)')
    .version('1.0.0')
    .option('-t, --type <type>', 'Backup type (local, atlas, full, archive)', 'local')
    .option('-d, --destination <path>', 'Backup destination directory')
    .option('--compress', 'Compress backup (default: true)')
    .option('--no-compress', 'Skip backup compression')
    .option('--verify', 'Verify backup integrity (default: true)')
    .option('--no-verify', 'Skip backup verification')
    .option('--s3-upload', 'Upload backup to S3')
    .option('--no-s3-upload', 'Skip S3 upload (default)')
    .option('-p, --aws-profile <profile>', 'AWS profile to use', 'terraform-mrb')
    .option('--dry-run', 'Show what would be backed up without executing')
    .option('-h, --help', 'Show detailed help with examples')
    .parse();

  const options = program.opts();

  if (options.help) {
    showHelp();
    return;
  }

  // Set S3 upload default based on backup type
  if (options.type === 'full' || options.type === 'archive') {
    options.s3Upload = options.s3Upload !== false;
  }

  if (options.dryRun) {
    banner();
    log('🔍 Dry run - showing backup configuration:', 'cyan');
    const config = await getBackupConfig(options);
    console.log(JSON.stringify({
      type: options.type,
      database: config.database,
      backup: config.backup,
      aws: config.aws
    }, null, 2));
    return;
  }

  try {
    await performBackup(options);
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

export { performBackup };