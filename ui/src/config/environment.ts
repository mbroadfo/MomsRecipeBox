/**
 * Environment Configuration for MomsRecipeBox UI
 * Handles API endpoint configuration across different deployment environments
 */

export interface EnvironmentConfig {
  API_BASE_URL: string;
  API_TIMEOUT: number;
  environment: 'local' | 'atlas' | 'lambda' | 'production';
  isProduction: boolean;
  enableDevTools: boolean;
  S3_RECIPE_IMAGES_BASE_URL: string;
  AWS_REGION: string;
}

/**
 * Get current environment from Vite environment variables
 * Falls back to 'local' if not specified
 */
function getEnvironment(): EnvironmentConfig['environment'] {
  const env = import.meta.env.VITE_ENVIRONMENT?.toLowerCase();
  
  if (env === 'local' || env === 'atlas' || env === 'lambda' || env === 'production') {
    return env;
  }
  
  // Default to local development
  return 'local';
}

/**
 * Get API base URL for environment with fallbacks
 */
function getApiBaseUrl(environment: string): string {
  switch (environment) {
    case 'local':
      return import.meta.env.VITE_API_URL_LOCAL || 'http://localhost:3000';
    case 'atlas':
      return import.meta.env.VITE_API_URL_ATLAS || 'http://localhost:3000';
    case 'lambda':
      return import.meta.env.VITE_API_URL_LAMBDA || 'https://your-lambda-api.execute-api.us-west-2.amazonaws.com';
    case 'production':
      return import.meta.env.VITE_API_URL_PRODUCTION || 'https://your-production-api.execute-api.us-west-2.amazonaws.com';
    default:
      return 'http://localhost:3000';
  }
}

/**
 * Get API timeout for environment
 */
function getApiTimeout(environment: string): number {
  const customTimeout = import.meta.env.VITE_API_TIMEOUT;
  if (customTimeout) return parseInt(customTimeout, 10);
  
  // Lambda environments need longer timeout for cold starts
  return (environment === 'lambda' || environment === 'production') ? 15000 : 10000;
}

/**
 * Get AWS region from environment variables or default
 */
function getAwsRegion(): string {
  return import.meta.env.VITE_AWS_REGION || 'us-west-2';
}

/**
 * Get S3 recipe images base URL
 */
function getS3RecipeImagesBaseUrl(): string {
  const bucket = import.meta.env.VITE_RECIPE_IMAGES_BUCKET || 'mrb-recipe-images-dev';
  const region = getAwsRegion();
  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

/**
 * Current environment configuration
 * Automatically determined from VITE_ENVIRONMENT variable
 */
const currentEnv = getEnvironment();

export const config: EnvironmentConfig = {
  API_BASE_URL: getApiBaseUrl(currentEnv),
  API_TIMEOUT: getApiTimeout(currentEnv),
  environment: currentEnv,
  isProduction: currentEnv === 'production',
  enableDevTools: currentEnv !== 'production',
  S3_RECIPE_IMAGES_BASE_URL: getS3RecipeImagesBaseUrl(),
  AWS_REGION: getAwsRegion(),
};

/**
 * Helper to check if running in development mode
 */
export const isDevelopment = () => !config.isProduction;

/**
 * Helper to check if running against local backend
 */
export const isLocalBackend = () => config.environment === 'local' || config.environment === 'atlas';

/**
 * Helper to check if running against AWS Lambda
 */
export const isCloudBackend = () => config.environment === 'lambda' || config.environment === 'production';

/**
 * Get API URL with optional path
 */
export const getApiUrl = (path: string = ''): string => {
  const baseUrl = config.API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

/**
 * Development logging helper
 */
export const devLog = (...args: any[]) => {
  if (config.enableDevTools && import.meta.env.DEV) {
    console.log(`[${config.environment.toUpperCase()}]`, ...args);
  }
};

// Log current configuration in development
if (config.enableDevTools && import.meta.env.DEV) {
  console.log(`🚀 MomsRecipeBox UI - Environment: ${config.environment.toUpperCase()}`);
  console.log(`📡 API Base URL: ${config.API_BASE_URL}`);
  console.log(`⏱️  API Timeout: ${config.API_TIMEOUT}ms`);
}