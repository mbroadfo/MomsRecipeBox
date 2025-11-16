/**
 * AWS Secrets Manager Utility
 * Fetches all secrets and loads them into process.env
 * 
 * Migration Complete: Now uses Parameter Store instead of Secrets Manager
 * Cost: $0/year (Parameter Store Standard tier is free)
 * Previous: $4.80/year (Secrets Manager)
 */

import { getSecretsFromParameterStore } from './parameter_store.js';
import { createLogger } from './logger.js';

const logger = createLogger('secrets_manager');

// Cache for secrets to avoid repeated calls
let secretsCache = null;
let secretsInitialized = false;

/**
 * Fetch all secrets from Parameter Store
 * @returns {Promise<Object>} All secrets as key-value pairs
 */
export async function fetchSecrets() {
  if (secretsCache) {
    return secretsCache;
  }

  try {
    logger.info('Fetching secrets from Parameter Store');
    const secrets = await getSecretsFromParameterStore();
    secretsCache = secrets;
    logger.info('Secrets retrieved from Parameter Store', { 
      secretCount: Object.keys(secrets).length 
    });
    return secrets;
  } catch (error) {
    logger.error('Failed to fetch secrets from Parameter Store', error);
    throw error;
  }
}

/**
 * Initialize secrets into process.env
 * This should be called at Lambda cold start
 * @returns {Promise<void>}
 */
export async function initializeSecretsToEnv() {
  // Only initialize once
  if (secretsInitialized) {
    logger.debug('Secrets already initialized in process.env');
    return;
  }

  try {
    const secrets = await fetchSecrets();

    // List of secret keys we want to load into process.env
    const secretKeys = [
      // MongoDB
      'MONGODB_ATLAS_URI',

      // Auth0
      'AUTH0_DOMAIN',
      'AUTH0_M2M_CLIENT_ID',
      'AUTH0_M2M_CLIENT_SECRET',
      'AUTH0_API_AUDIENCE',
      'AUTH0_MRB_CLIENT_ID',

      // AI Provider API Keys
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GROQ_API_KEY',
      'GOOGLE_API_KEY',
      'DEEPSEEK_API_KEY',

      // AWS
      'AWS_ACCOUNT_ID',
      'RECIPE_IMAGES_BUCKET'
    ];

    let loadedCount = 0;

    for (const key of secretKeys) {
      if (secrets[key]) {
        // Only set if not already in environment OR if it's a template variable (contains ${})
        const existingValue = process.env[key];
        const isTemplate = existingValue && existingValue.includes('${');
        
        if (!existingValue || isTemplate) {
          process.env[key] = secrets[key];
          loadedCount++;
        }
      }
    }

    secretsInitialized = true;
    logger.info('Secrets loaded into process.env', { loadedCount });

    // Log which AI providers will be available
    const aiProviders = [];
    if (process.env.OPENAI_API_KEY) aiProviders.push('OpenAI');
    if (process.env.ANTHROPIC_API_KEY) aiProviders.push('Anthropic');
    if (process.env.GROQ_API_KEY) aiProviders.push('Groq');
    if (process.env.GOOGLE_API_KEY) aiProviders.push('Google Gemini');
    if (process.env.DEEPSEEK_API_KEY) aiProviders.push('DeepSeek');

    if (aiProviders.length > 0) {
      logger.info('AI providers available', { providers: aiProviders });
    } else {
      logger.warn('No AI provider API keys found in secrets');
    }

  } catch (error) {
    console.error('❌ CRITICAL ERROR: Failed to initialize secrets to process.env');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    logger.error('Failed to initialize secrets to process.env', error);
    // Re-throw to prevent Lambda from running without secrets
    throw new Error(`Secrets initialization failed: ${error.message}`);
  }
}

/**
 * Get a specific secret value
 * @param {string} key - The secret key to retrieve
 * @returns {Promise<string|null>} The secret value or null if not found
 */
export async function getSecret(key) {
  const secrets = await fetchSecrets();
  return secrets[key] || null;
}

/**
 * Check if secrets have been initialized
 * @returns {boolean} True if secrets are initialized
 */
export function areSecretsInitialized() {
  return secretsInitialized;
}

/**
 * Clear the secrets cache (mainly for testing)
 */
export function clearSecretsCache() {
  secretsCache = null;
  secretsInitialized = false;
}
