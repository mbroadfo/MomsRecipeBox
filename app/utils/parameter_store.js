/**
 * AWS Systems Manager Parameter Store utility
 * 
 * Provides access to application secrets stored in Parameter Store.
 * Used as cost-effective alternative to Secrets Manager ($0 vs $0.40/month per secret).
 */

import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { createLogger } from './logger.js';

const logger = createLogger('parameter_store');

const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || 'us-west-2'
});

// Define the structure of our application secrets
export const REQUIRED_SECRETS = [
  'MONGODB_ATLAS_URI',
  'AUTH0_DOMAIN',
  'AUTH0_M2M_CLIENT_ID',
  'AUTH0_M2M_CLIENT_SECRET',
  'AUTH0_API_AUDIENCE',
  'AUTH0_MRB_CLIENT_ID'
];

export const OPTIONAL_SECRETS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GROQ_API_KEY',
  'GOOGLE_API_KEY',
  'DEEPSEEK_API_KEY',
  'AWS_ACCOUNT_ID',
  'RECIPE_IMAGES_BUCKET'
];

let cachedSecrets = null;
let secretsInitialized = false;

/**
 * Get application secrets from Parameter Store
 * 
 * Reads from SSM parameter at /mrb/dev/secrets
 * Caches in memory for Lambda container lifetime
 * Expects JSON SecureString parameter
 * 
 * @returns {Promise<Object>} Application secrets object
 * @throws {Error} if parameter not found or invalid JSON
 */
export async function getSecretsFromParameterStore() {
  // Return cached secrets if available
  if (cachedSecrets) {
    logger.debug('Using cached secrets from Parameter Store');
    return cachedSecrets;
  }

  const parameterName = process.env.SSM_SECRETS_PARAMETER_NAME || '/mrb/dev/secrets';

  try {
    logger.info('Fetching secrets from Parameter Store', { parameterName });
    
    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true  // Decrypt SecureString parameters
    });
    
    const response = await ssmClient.send(command);
    
    if (!response.Parameter?.Value) {
      throw new Error('Parameter Store response missing value');
    }
    
    // Parse JSON value
    const secrets = JSON.parse(response.Parameter.Value);
    
    // Validate required fields
    const missingRequired = REQUIRED_SECRETS.filter(field => !secrets[field]);
    if (missingRequired.length > 0) {
      throw new Error(`Missing required secret fields: ${missingRequired.join(', ')}`);
    }
    
    // Cache for container lifetime
    cachedSecrets = secrets;
    secretsInitialized = true;
    
    logger.info('Secrets cached from Parameter Store', { 
      secretCount: Object.keys(secrets).length,
      requiredFields: REQUIRED_SECRETS.length,
      optionalFields: OPTIONAL_SECRETS.filter(f => secrets[f]).length
    });
    
    return secrets;

  } catch (error) {
    logger.error('Failed to get secrets from Parameter Store', {
      error: error.message,
      parameterName
    });
    throw new Error(`Parameter Store secrets retrieval failed: ${error.message}`);
  }
}

/**
 * Initialize secrets into process.env for backward compatibility
 * 
 * Loads all secrets from Parameter Store and sets them as environment variables.
 * This allows existing code that checks process.env to work without changes.
 * 
 * @returns {Promise<void>}
 */
export async function initializeSecretsToEnv() {
  if (secretsInitialized) {
    logger.debug('Secrets already initialized to environment');
    return;
  }

  try {
    const secrets = await getSecretsFromParameterStore();
    
    // Set all secrets as environment variables
    Object.entries(secrets).forEach(([key, value]) => {
      if (value && value !== 'not-initialized') {
        process.env[key] = value;
      }
    });
    
    logger.info('Secrets initialized to process.env', {
      count: Object.keys(secrets).length
    });
    
  } catch (error) {
    logger.error('Failed to initialize secrets to environment', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Clear cached secrets (useful for testing)
 */
export function clearSecretsCache() {
  logger.debug('Clearing Parameter Store secrets cache');
  cachedSecrets = null;
  secretsInitialized = false;
}
