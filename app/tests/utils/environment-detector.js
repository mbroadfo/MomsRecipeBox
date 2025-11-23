/**
 * Cloud-Only Environment Detection Utility
 * 
 * Provides consistent cloud API endpoint detection across all test files.
 * Simplified for cloud-only architecture - no local/express mode support.
 */

// Ensure dotenv is loaded for consistent environment variable access
import 'dotenv/config';
import { execSync } from 'child_process';

// Cache for AWS secrets to avoid repeated calls
let secretsCache = null;

/**
 * Retrieve configuration from AWS Parameter Store
 */
async function getAwsConfig() {
  if (secretsCache) {
    return secretsCache;
  }

  try {
    const parameterName = process.env.SSM_SECRETS_PARAMETER_NAME || '/mrb/dev/secrets';
    const region = process.env.AWS_REGION || 'us-west-2';
    const awsProfile = process.env.AWS_PROFILE || 'mrb-api';

    const command = `aws ssm get-parameter --name "${parameterName}" --region "${region}" --with-decryption --query Parameter.Value --output text`;
    const secretJson = execSync(command, {
      encoding: 'utf-8',
      env: { ...process.env, AWS_PROFILE: awsProfile }
    }).trim();
    
    const secrets = JSON.parse(secretJson);
    
    // Cache the secrets
    secretsCache = secrets;
    return secrets;
  } catch (error) {
    console.log('⚠️  Could not retrieve AWS Parameter Store secrets:', error.message);
    throw new Error(`Failed to retrieve Parameter Store secrets: ${error.message}. Ensure AWS profile '${process.env.AWS_PROFILE || 'mrb-api'}' is configured.`);
  }
}

/**
 * Get the cloud API base URL for testing
 * @returns {string} The base URL for the cloud API
 */
export async function getBaseUrl() {
  // Check for explicit environment variable override first
  if (process.env.API_BASE_URL) {
    console.log(`🔧 Using explicit API_BASE_URL: ${process.env.API_BASE_URL}`);
    return process.env.API_BASE_URL;
  }

  // Cloud-only: Get URL from AWS Parameter Store
  const awsConfig = await getAwsConfig();
  
  // Try LAMBDA_APP_URL first (preferred)
  if (awsConfig.LAMBDA_APP_URL) {
    console.log(`🔐 Using LAMBDA_APP_URL from AWS Parameter Store: ${awsConfig.LAMBDA_APP_URL}`);
    return awsConfig.LAMBDA_APP_URL;
  }
  
  // Fallback to LAMBDA_API_URL for backward compatibility
  if (awsConfig.LAMBDA_API_URL) {
    console.log(`🔐 Using LAMBDA_API_URL from AWS Parameter Store: ${awsConfig.LAMBDA_API_URL}`);
    return awsConfig.LAMBDA_API_URL;
  }
  
  // If no URL found in secrets, this is a configuration error
  throw new Error('No Lambda API URL found in AWS Parameter Store. Please add LAMBDA_APP_URL to the parameter or set API_BASE_URL environment variable.');
}

/**
 * Get environment information (always 'cloud' in simplified architecture)
 * @returns {string} Always returns 'cloud'
 */
export async function getEnvironmentMode() {
  return 'cloud';
}

/**
 * Log environment information for debugging
 */
export async function logEnvironmentInfo() {
  const baseUrl = await getBaseUrl();
  
  console.log(`🎯 Target API: ${baseUrl}`);
  console.log(`🔧 Architecture: cloud-only (simplified)`);
  console.log(`🔐 AWS Profile: ${process.env.AWS_PROFILE || 'mrb-api'}`);
  console.log(`🗄️  Database: Atlas (via AWS Parameter Store)`);
}