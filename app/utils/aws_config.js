/**
 * AWS Configuration Utility
 * Centralizes AWS-related configuration to avoid hardcoding values
 */

import dotenv from 'dotenv';
dotenv.config();

export const AWS_CONFIG = {
  REGION: process.env.AWS_REGION || 'us-west-2',
  RECIPE_IMAGES_BUCKET: process.env.RECIPE_IMAGES_BUCKET || 'mrb-recipe-images-dev',
  SECRETS_NAME: process.env.AWS_SECRET_NAME || 'moms-recipe-secrets-dev',
  
  // Computed values
  get RECIPE_IMAGES_BASE_URL() {
    return `https://${this.RECIPE_IMAGES_BUCKET}.s3.${this.REGION}.amazonaws.com`;
  },
  
  get SECRETS_ARN() {
    const accountId = process.env.AWS_ACCOUNT_ID;
    if (accountId) {
      return `arn:aws:secretsmanager:${this.REGION}:${accountId}:secret:${this.SECRETS_NAME}`;
    }
    return null;
  }
};

/**
 * Validates that required AWS configuration is present
 */
export function validateAwsConfig() {
  const missing = [];
  
  if (!process.env.AWS_REGION && !AWS_CONFIG.REGION) {
    missing.push('AWS_REGION');
  }
  
  if (!process.env.RECIPE_IMAGES_BUCKET && !AWS_CONFIG.RECIPE_IMAGES_BUCKET) {
    missing.push('RECIPE_IMAGES_BUCKET');
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required AWS configuration: ${missing.join(', ')}`);
  }
  
  return true;
}

/**
 * Get AWS credentials from environment
 * Returns null if credentials are not available
 */
export function getAwsCredentials() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN, // Optional
      region: AWS_CONFIG.REGION
    };
  }
  
  // AWS SDK will use IAM roles, profiles, or other credential chain
  return null;
}

/**
 * Helper to check if running in AWS environment (Lambda, EC2, etc.)
 */
export function isRunningInAws() {
  return !!(
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV ||
    process.env.AWS_REGION ||
    process.env.EC2_INSTANCE_ID
  );
}

/**
 * Development logging for AWS configuration
 */
export function logAwsConfig() {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log('🔧 AWS Configuration:');
    console.log(`   Region: ${AWS_CONFIG.REGION}`);
    console.log(`   Recipe Images Bucket: ${AWS_CONFIG.RECIPE_IMAGES_BUCKET}`);
    console.log(`   Secrets Name: ${AWS_CONFIG.SECRETS_NAME}`);
    console.log(`   Recipe Images Base URL: ${AWS_CONFIG.RECIPE_IMAGES_BASE_URL}`);
    console.log(`   Has AWS Credentials: ${!!getAwsCredentials()}`);
    console.log(`   Running in AWS: ${isRunningInAws()}`);
  }
}

export default AWS_CONFIG;