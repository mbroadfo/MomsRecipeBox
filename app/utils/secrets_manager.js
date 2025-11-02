/**
 * AWS Secrets Manager Utility
 * Fetches all secrets from AWS Secrets Manager and loads them into process.env
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Cache for secrets to avoid repeated calls
let secretsCache = null;
let secretsInitialized = false;

/**
 * Fetch all secrets from AWS Secrets Manager
 * @returns {Promise<Object>} All secrets as key-value pairs
 */
export async function fetchSecrets() {
  if (secretsCache) {
    return secretsCache;
  }

  try {
    const secretName = process.env.AWS_SECRET_NAME || 'moms-recipe-secrets-dev';
    const region = process.env.AWS_REGION || 'us-west-2';

    console.log(`🔐 Fetching secrets from AWS Secrets Manager (${secretName})...`);

    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    const secrets = JSON.parse(response.SecretString);
    secretsCache = secrets;

    console.log('✅ Secrets retrieved from AWS Secrets Manager');
    console.log(`📋 Retrieved ${Object.keys(secrets).length} secret keys`);

    return secrets;
  } catch (error) {
    console.error('❌ Failed to fetch secrets from AWS Secrets Manager:', error.message);
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
    console.log('✅ Secrets already initialized in process.env');
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
        // Only set if not already in environment (environment variables take precedence)
        if (!process.env[key]) {
          process.env[key] = secrets[key];
          loadedCount++;
        }
      }
    }

    secretsInitialized = true;
    console.log(`✅ Loaded ${loadedCount} secrets into process.env`);

    // Log which AI providers will be available
    const aiProviders = [];
    if (process.env.OPENAI_API_KEY) aiProviders.push('OpenAI');
    if (process.env.ANTHROPIC_API_KEY) aiProviders.push('Anthropic');
    if (process.env.GROQ_API_KEY) aiProviders.push('Groq');
    if (process.env.GOOGLE_API_KEY) aiProviders.push('Google Gemini');
    if (process.env.DEEPSEEK_API_KEY) aiProviders.push('DeepSeek');

    if (aiProviders.length > 0) {
      console.log(`🤖 AI providers available: ${aiProviders.join(', ')}`);
    } else {
      console.warn('⚠️  No AI provider API keys found in secrets');
    }

  } catch (error) {
    console.error('❌ Failed to initialize secrets to process.env:', error.message);
    // Don't throw - Lambda should continue even if secrets fail
    // Individual handlers can handle missing secrets gracefully
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
