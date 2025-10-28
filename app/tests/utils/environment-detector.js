/**
 * Environment Detection Utility
 * 
 * Provides consistent environment-aware base URL detection across all test files.
 * Supports automatic detection of Express vs Lambda modes, plus explicit overrides.
 */

/**
 * Get the appropriate base URL for API testing based on environment
 * @returns {string} The base URL for the current environment
 */
export function getBaseUrl() {
  // Check for explicit environment variable override first
  if (process.env.BASE_URL) {
    console.log(`🔧 Using explicit BASE_URL: ${process.env.BASE_URL}`);
    return process.env.BASE_URL;
  }

  // Check for legacy APP_BASE_URL variable for backward compatibility
  if (process.env.APP_BASE_URL) {
    console.log(`🔧 Using APP_BASE_URL: ${process.env.APP_BASE_URL}`);
    return process.env.APP_BASE_URL;
  }
  
  // Auto-detect based on execution context
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT) {
    // Lambda mode - use API Gateway URL
    const lambdaUrl = 'https://b31emm78z4.execute-api.us-west-2.amazonaws.com/dev';
    console.log(`🚀 Lambda mode detected, using: ${lambdaUrl}`);
    return lambdaUrl;
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
export function getEnvironmentMode() {
  const baseUrl = getBaseUrl();
  return baseUrl.includes('localhost') ? 'express' : 'lambda';
}

/**
 * Log environment information for debugging
 */
export function logEnvironmentInfo() {
  const baseUrl = getBaseUrl();
  const mode = getEnvironmentMode();
  
  console.log(`🎯 Target API: ${baseUrl}`);
  console.log(`🔧 Mode: ${mode}`);
  
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.log(`🔍 Lambda Function: ${process.env.AWS_LAMBDA_FUNCTION_NAME}`);
  }
  
  if (process.env.MONGODB_MODE) {
    console.log(`🗄️  Database Mode: ${process.env.MONGODB_MODE}`);
  }
}