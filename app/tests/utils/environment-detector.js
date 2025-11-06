/**
 * Environment Detection Utility
 * 
 * Provides consistent environment-aware base URL detection across all test files.
 * Supports automatic detection of Express vs Lambda modes, plus explicit overrides.
 */

// Ensure dotenv is loaded for consistent environment variable access
import 'dotenv/config';
import { execSync } from 'child_process';

// Cache for AWS secrets to avoid repeated calls
let secretsCache = null;

/**
 * Retrieve configuration from AWS Secrets Manager
 */
async function getAwsConfig() {
  if (secretsCache) {
    return secretsCache;
  }

  try {
    const secretName = process.env.AWS_SECRET_NAME || 'moms-recipe-secrets-dev';
    const region = process.env.AWS_REGION || 'us-west-2';
    const awsProfile = process.env.AWS_PROFILE || 'mrb-api';

    const command = `aws secretsmanager get-secret-value --secret-id "${secretName}" --region "${region}" --query SecretString --output text`;
    const secretJson = execSync(command, {
      encoding: 'utf-8',
      env: { ...process.env, AWS_PROFILE: awsProfile }
    }).trim();
    
    const secrets = JSON.parse(secretJson);
    
    // Cache the secrets
    secretsCache = secrets;
    return secrets;
  } catch (error) {
    console.log('⚠️  Could not retrieve AWS secrets:', error.message);
    return null;
  }
}

/**
 * Get the appropriate base URL for API testing based on environment
 * @returns {string} The base URL for the current environment
 */
export async function getBaseUrl() {
  // Check for explicit environment variable override first
  if (process.env.BASE_URL) {
    console.log(`🔧 Using explicit BASE_URL: ${process.env.BASE_URL}`);
    return process.env.BASE_URL;
  }

  // Check for API_BASE_URL (used in cloud profile)
  if (process.env.API_BASE_URL) {
    console.log(`🔧 Using API_BASE_URL: ${process.env.API_BASE_URL}`);
    return process.env.API_BASE_URL;
  }

  // Check for legacy APP_BASE_URL variable for backward compatibility
  if (process.env.APP_BASE_URL) {
    console.log(`🔧 Using APP_BASE_URL: ${process.env.APP_BASE_URL}`);
    return process.env.APP_BASE_URL;
  }
  
  // Check APP_MODE to determine target (lambda vs localhost)
  if (process.env.APP_MODE === 'lambda') {
    // Lambda mode - try to get URL from AWS Secrets Manager
    const awsConfig = await getAwsConfig();
    if (awsConfig && awsConfig.LAMBDA_APP_URL) {
      console.log(`🔐 Using LAMBDA_APP_URL from AWS Secrets: ${awsConfig.LAMBDA_APP_URL}`);
      return awsConfig.LAMBDA_APP_URL;
    }
    
    // Fallback to LAMBDA_API_URL for backward compatibility
    if (awsConfig && awsConfig.LAMBDA_API_URL) {
      console.log(`🔐 Using LAMBDA_API_URL from AWS Secrets: ${awsConfig.LAMBDA_API_URL}`);
      return awsConfig.LAMBDA_API_URL;
    }
    
    // Lambda mode - but no LAMBDA_APP_URL in secrets, need explicit configuration
    console.log(`🚀 APP_MODE=lambda detected, but no LAMBDA_APP_URL in AWS Secrets`);
    console.log(`💡 Set API_BASE_URL environment variable for Lambda testing`);
    throw new Error('Lambda mode detected but LAMBDA_APP_URL not found in AWS Secrets. Please set API_BASE_URL environment variable or add LAMBDA_APP_URL to AWS Secrets Manager.');
  }
  
  // Auto-detect lambda mode based on AWS profile (if not explicitly set to express)
  if (process.env.AWS_PROFILE === 'mrb-api' && process.env.APP_MODE !== 'express') {
    // AWS profile suggests cloud testing - try to get Lambda URL from secrets
    const awsConfig = await getAwsConfig();
    if (awsConfig && awsConfig.LAMBDA_APP_URL) {
      console.log(`🔐 Using LAMBDA_APP_URL from AWS Secrets: ${awsConfig.LAMBDA_APP_URL}`);
      return awsConfig.LAMBDA_APP_URL;
    }
  }
  
  // Auto-detect based on execution context (fallback)
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
    // Running inside Lambda - this should not happen for tests
    console.log(`🚀 Lambda runtime detected - tests should not run inside Lambda`);
    throw new Error('Tests appear to be running inside Lambda runtime. This is not supported.');
  }
  
  // Express mode (local/atlas development)
  const expressUrl = 'http://localhost:3000';
  console.log(`🏠 Express mode detected, using: ${expressUrl}`);
  return expressUrl;
}

/**
 * Get environment mode for logging and conditional logic
 * @returns {string} 'lambda' or 'express'
 */
export async function getEnvironmentMode() {
  const baseUrl = await getBaseUrl();
  return baseUrl.includes('localhost') ? 'express' : 'lambda';
}

/**
 * Log environment information for debugging
 */
export async function logEnvironmentInfo() {
  const baseUrl = await getBaseUrl();
  const mode = await getEnvironmentMode();
  
  console.log(`🎯 Target API: ${baseUrl}`);
  console.log(`🔧 Mode: ${mode}`);
  
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.log(`🔍 Lambda Function: ${process.env.AWS_LAMBDA_FUNCTION_NAME}`);
  }
  
  if (process.env.MONGODB_MODE) {
    console.log(`🗄️  Database Mode: ${process.env.MONGODB_MODE}`);
  }
}