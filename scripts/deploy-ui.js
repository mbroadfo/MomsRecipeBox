#!/usr/bin/env node

/**
 * UI Deployment Script for Phase 4.2
 * Handles build → S3 upload → CloudFront invalidation workflow
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { createReadStream } from 'fs';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

// Configuration
const CONFIG = {
  environments: {
    dev: {
      bucket: 'mrb-ui-hosting-dev',
      distributionId: null, // Will be populated from Terraform outputs
      buildCommand: 'ui:build:lambda'
    },
    prod: {
      bucket: 'mrb-ui-hosting-prod',
      distributionId: null,
      buildCommand: 'ui:build:production'
    }
  },
  region: 'us-west-2',
  buildDir: 'ui/dist'
};

class UIDeployer {
  constructor(environment = 'dev') {
    this.environment = environment;
    this.config = CONFIG.environments[environment];
    
    if (!this.config) {
      throw new Error(`Unknown environment: ${environment}. Use 'dev' or 'prod'`);
    }
    
    this.s3Client = new S3Client({ region: CONFIG.region });
    this.cloudFrontClient = new CloudFrontClient({ region: CONFIG.region });
    
    console.log(`🚀 UI Deployer initialized for ${environment} environment`);
    console.log(`📦 Target bucket: ${this.config.bucket}`);
  }

  /**
   * Get CloudFront distribution info from Terraform outputs
   */
  async getCloudFrontInfo() {
    try {
      console.log('📋 Getting CloudFront distribution info from Terraform...');
      const terraformOutput = execSync('cd infra && terraform output -json', { encoding: 'utf-8' });
      const outputs = JSON.parse(terraformOutput);
      
      const distributionId = outputs.ui_cloudfront_distribution_id?.value;
      const domainName = outputs.ui_cloudfront_domain_name?.value;
      
      if (!distributionId) {
        console.warn('⚠️  CloudFront distribution ID not found in Terraform outputs');
        return { distributionId: null, domainName: null };
      }
      
      console.log(`☁️  CloudFront distribution ID: ${distributionId}`);
      return { distributionId, domainName };
    } catch (error) {
      console.warn('⚠️  Could not get CloudFront distribution info:', error.message);
      return { distributionId: null, domainName: null };
    }
  }

  /**
   * Build the UI for the target environment
   */
  async buildUI() {
    console.log(`🔨 Building UI for ${this.environment} environment...`);
    
    try {
      const buildCommand = `npm run ${this.config.buildCommand}`;
      console.log(`   Running: ${buildCommand}`);
      
      execSync(buildCommand, { stdio: 'inherit' });
      console.log('✅ UI build completed successfully');
      
      // Verify build directory exists
      const buildPath = join(process.cwd(), CONFIG.buildDir);
      if (!statSync(buildPath).isDirectory()) {
        throw new Error(`Build directory not found: ${buildPath}`);
      }
      
      return buildPath;
    } catch (error) {
      console.error('❌ UI build failed:', error.message);
      throw error;
    }
  }

  /**
   * Get MIME type for file extension
   */
  getMimeType(filePath) {
    const ext = extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get cache control header based on file type
   */
  getCacheControl(filePath) {
    const filename = relative('', filePath);
    
    // Static assets with hashes - long-term caching
    if (filename.includes('assets/') && /\.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg)$/i.test(filename)) {
      return 'public, max-age=31536000, immutable'; // 1 year
    }
    
    // Index.html - no caching (SPA routing)
    if (filename.endsWith('index.html')) {
      return 'public, max-age=0, must-revalidate';
    }
    
    // Other files - short-term caching
    return 'public, max-age=3600'; // 1 hour
  }

  /**
   * Upload a single file to S3
   */
  async uploadFile(localPath, s3Key, buildDir) {
    const fileContent = readFileSync(localPath);
    const contentType = this.getMimeType(localPath);
    const cacheControl = this.getCacheControl(s3Key);
    
    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
        CacheControl: cacheControl,
        Metadata: {
          'upload-timestamp': new Date().toISOString(),
          'deployer-version': '1.0.0',
          'environment': this.environment
        }
      }));
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to upload ${s3Key}:`, error.message);
      return false;
    }
  }

  /**
   * Upload all files from build directory to S3
   */
  async uploadBuildToS3(buildDir) {
    console.log(`📤 Uploading build files to S3...`);
    
    const uploadedFiles = [];
    const failedFiles = [];
    
    const uploadDirectory = async (dirPath, s3Prefix = '') => {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const s3Key = s3Prefix ? `${s3Prefix}/${item}` : item;
        
        if (statSync(fullPath).isDirectory()) {
          await uploadDirectory(fullPath, s3Key);
        } else {
          console.log(`   📄 Uploading: ${s3Key}`);
          const success = await this.uploadFile(fullPath, s3Key, buildDir);
          
          if (success) {
            uploadedFiles.push(s3Key);
          } else {
            failedFiles.push(s3Key);
          }
        }
      }
    };
    
    await uploadDirectory(buildDir);
    
    console.log(`✅ Upload complete: ${uploadedFiles.length} files uploaded`);
    if (failedFiles.length > 0) {
      console.warn(`⚠️  ${failedFiles.length} files failed to upload:`, failedFiles);
    }
    
    return { uploadedFiles, failedFiles };
  }

  /**
   * Create CloudFront invalidation
   */
  async invalidateCloudFront(distributionId, paths = ['/*']) {
    if (!distributionId) {
      console.warn('⚠️  No CloudFront distribution ID available, skipping invalidation');
      return null;
    }
    
    console.log('☁️  Creating CloudFront invalidation...');
    
    try {
      const response = await this.cloudFrontClient.send(new CreateInvalidationCommand({
        DistributionId: distributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: paths.length,
            Items: paths
          },
          CallerReference: `ui-deploy-${Date.now()}`
        }
      }));
      
      const invalidationId = response.Invalidation.Id;
      console.log(`✅ CloudFront invalidation created: ${invalidationId}`);
      console.log('   ⏳ Invalidation may take 5-10 minutes to complete');
      
      return invalidationId;
    } catch (error) {
      console.error('❌ CloudFront invalidation failed:', error.message);
      throw error;
    }
  }

  /**
   * Deploy UI to S3 + CloudFront
   */
  async deploy(options = {}) {
    const {
      skipBuild = false,
      skipInvalidation = false,
      dryRun = false
    } = options;
    
    console.log(`🚀 Starting UI deployment to ${this.environment}...`);
    console.log(`📋 Options: skipBuild=${skipBuild}, skipInvalidation=${skipInvalidation}, dryRun=${dryRun}`);
    
    try {
      // Step 1: Build UI (unless skipped)
      let buildDir;
      if (!skipBuild) {
        buildDir = await this.buildUI();
      } else {
        buildDir = join(process.cwd(), CONFIG.buildDir);
        console.log(`⏩ Skipping build, using existing: ${buildDir}`);
      }
      
      if (dryRun) {
        console.log('🧪 Dry run mode - would upload files from:', buildDir);
        return { success: true, dryRun: true };
      }
      
      // Step 2: Upload to S3
      const uploadResults = await this.uploadBuildToS3(buildDir);
      
      // Step 3: CloudFront invalidation (unless skipped)
      let invalidationId = null;
      let cloudFrontInfo = { distributionId: null, domainName: null };
      
      if (!skipInvalidation) {
        cloudFrontInfo = await this.getCloudFrontInfo();
        if (cloudFrontInfo.distributionId) {
          invalidationId = await this.invalidateCloudFront(cloudFrontInfo.distributionId);
        }
      }
      
      // Success summary
      const s3Url = `https://${this.config.bucket}.s3.${CONFIG.region}.amazonaws.com`;
      const cloudFrontUrl = cloudFrontInfo.domainName ? `https://${cloudFrontInfo.domainName}` : 'TBD';
      
      console.log('\n🎉 Deployment completed successfully!');
      console.log(`📦 S3 Bucket: ${s3Url}`);
      if (invalidationId) {
        console.log(`☁️  CloudFront: ${cloudFrontUrl} (invalidation: ${invalidationId})`);
      }
      console.log(`📊 Files uploaded: ${uploadResults.uploadedFiles.length}`);
      
      return {
        success: true,
        environment: this.environment,
        bucket: this.config.bucket,
        uploadedFiles: uploadResults.uploadedFiles.length,
        failedFiles: uploadResults.failedFiles.length,
        invalidationId
      };
      
    } catch (error) {
      console.error('\n❌ Deployment failed:', error.message);
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args.includes('--prod') ? 'prod' : 'dev';
  const skipBuild = args.includes('--skip-build');
  const skipInvalidation = args.includes('--skip-invalidation');
  const dryRun = args.includes('--dry-run');
  
  if (args.includes('--help')) {
    console.log(`
UI Deployment Script - Phase 4.2

Usage: node scripts/deploy-ui.js [options]

Options:
  --prod                Deploy to production (default: dev)
  --skip-build         Skip UI build step
  --skip-invalidation  Skip CloudFront invalidation
  --dry-run           Show what would be deployed without uploading
  --help              Show this help message

Examples:
  node scripts/deploy-ui.js                    # Deploy to dev
  node scripts/deploy-ui.js --prod             # Deploy to production  
  node scripts/deploy-ui.js --skip-build       # Deploy without rebuilding
  node scripts/deploy-ui.js --dry-run          # Test deployment
    `);
    return;
  }
  
  try {
    const deployer = new UIDeployer(environment);
    await deployer.deploy({ skipBuild, skipInvalidation, dryRun });
  } catch (error) {
    console.error('❌ Deployment script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const scriptPath = resolve(process.argv[1]);

if (__filename === scriptPath) {
  main().catch(console.error);
}

export { UIDeployer };