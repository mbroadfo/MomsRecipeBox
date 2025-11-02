// File: app/app.js
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { ApplicationHealthChecker } from './health/application-health.js';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

let cachedDb = null;
let healthChecker = null;
let cachedMongoUri = null;

// Initialize health checker
function initializeHealthChecker() {
  if (!healthChecker) {
    healthChecker = new ApplicationHealthChecker({
      startup: {
        enableHealthChecks: process.env.ENABLE_STARTUP_HEALTH_CHECKS !== 'false',
        failOnCritical: process.env.FAIL_ON_CRITICAL_HEALTH === 'true',
        timeoutMs: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS) || 10000
      },
      runtime: {
        enablePeriodicChecks: process.env.ENABLE_PERIODIC_HEALTH_CHECKS === 'true',
        checkIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS) || 300000
      },
      database: {
        mongodb: {
          uri: process.env.MONGODB_URI,
          dbName: process.env.MONGODB_DB_NAME
        },
        healthChecks: {
          enableQualityCheck: process.env.ENABLE_DATA_QUALITY_CHECKS !== 'false'
        },
        thresholds: {
          minCleanPercentage: parseInt(process.env.MIN_CLEAN_PERCENTAGE) || 50,
          maxCriticalIssues: parseInt(process.env.MAX_CRITICAL_ISSUES) || 0
        }
      },
      reporting: {
        enableConsoleOutput: process.env.NODE_ENV !== 'test',
        enableStartupBanner: process.env.ENABLE_STARTUP_BANNER !== 'false'
      }
    });
  }
  return healthChecker;
}

/**
 * Fetch MongoDB Atlas URI from AWS Secrets Manager
 * @returns {Promise<string>} The MongoDB Atlas connection string
 */
async function fetchMongoUriFromSecretsManager() {
  if (cachedMongoUri) {
    return cachedMongoUri;
  }

  try {
    const secretName = process.env.AWS_SECRET_NAME || 'moms-recipe-secrets-dev';
    const region = process.env.AWS_REGION || 'us-west-2';

    console.log(`🔐 Fetching MongoDB Atlas URI from Secrets Manager (${secretName})...`);

    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    const secrets = JSON.parse(response.SecretString);
    cachedMongoUri = secrets.MONGODB_ATLAS_URI;

    if (!cachedMongoUri) {
      throw new Error('MONGODB_ATLAS_URI not found in secrets');
    }

    console.log('✅ MongoDB Atlas URI retrieved from Secrets Manager');
    return cachedMongoUri;
  } catch (error) {
    console.error('❌ Failed to fetch MongoDB Atlas URI from Secrets Manager:', error.message);
    throw error;
  }
}

/**
 * Gets the appropriate MongoDB connection string based on the environment configuration.
 * Supports toggling between local Docker MongoDB and MongoDB Atlas.
 * @returns {Promise<string>} The MongoDB connection string
 */
export async function getMongoConnectionString() {
  // Check which MongoDB mode to use (default: local)
  const mongoMode = (process.env.MONGODB_MODE || 'local').toLowerCase();
  const dbName = process.env.MONGODB_DB_NAME || 'moms_recipe_box_dev';

  // For MongoDB Atlas
  if (mongoMode === 'atlas') {
    // In Lambda mode, fetch from Secrets Manager
    if (process.env.APP_MODE === 'lambda') {
      console.log('📦 Using MongoDB Atlas (fetching from Secrets Manager)');
      return await fetchMongoUriFromSecretsManager();
    }

    // Check if a full connection string is provided in env var
    if (process.env.MONGODB_ATLAS_URI) {
      console.log('📦 Using MongoDB Atlas (connection string from environment)');
      return process.env.MONGODB_ATLAS_URI;
    }

    // If we don't have a valid Atlas configuration, warn but fall back to local
    console.warn('⚠️  MongoDB Atlas configuration incomplete, falling back to local MongoDB');
    return process.env.MONGODB_URI || `mongodb://admin:supersecret@mongo:27017/${dbName}?authSource=admin`;
  }

  // For local MongoDB (default)
  console.log('📦 Using local MongoDB');

  // Use provided URI if available
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  // Otherwise construct from components for Docker setup
  const user = process.env.MONGODB_ROOT_USER || 'admin';
  const password = process.env.MONGODB_ROOT_PASSWORD || 'supersecret';
  const host = process.env.MONGODB_HOST || 'mongo:27017';

  return `mongodb://${user}:${encodeURIComponent(password)}@${host}/${dbName}?authSource=admin`;
}

export async function getDb() {
  if (cachedDb) return cachedDb;

  const uri = await getMongoConnectionString();
  const dbName = process.env.MONGODB_DB_NAME || 'moms_recipe_box_dev';
  if (!uri) throw new Error('Could not construct MongoDB connection string');
  
  // Initialize health checker before connecting to database
  const checker = initializeHealthChecker();
  
  try {
    // Perform startup health checks
    const healthStatus = await checker.performStartupHealthChecks();
    
    // Log health status if not already done
    if (process.env.NODE_ENV !== 'test' && !healthStatus.skipped) {
      console.log(`🏥 Application health: ${healthStatus.overall}`);
    }
    
    // Connect to database with timeouts appropriate for Lambda
    const connectionOptions = {
      serverSelectionTimeoutMS: 10000, // 10 seconds for Lambda
      connectTimeoutMS: 10000,          // 10 seconds for Lambda
      socketTimeoutMS: 45000,           // 45 seconds for operations
    };
    const client = new MongoClient(uri, connectionOptions);
    await client.connect();
    cachedDb = client.db(dbName);
    
    // Start periodic health checks if enabled
    checker.startPeriodicHealthChecks();
    
    const mongoMode = (process.env.MONGODB_MODE || 'local').toLowerCase();
    console.log(`✅ Connected to MongoDB database (${mongoMode} mode)`);
    return cachedDb;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // If health checks are configured to fail on critical issues, propagate the error
    if (process.env.FAIL_ON_CRITICAL_HEALTH === 'true') {
      throw error;
    }
    
    // Otherwise, attempt basic connection without health checks
    console.log('⚠️  Attempting basic database connection without health checks...');
    const connectionOptions = {
      serverSelectionTimeoutMS: 10000, // 10 seconds for Lambda
      connectTimeoutMS: 10000,          // 10 seconds for Lambda
      socketTimeoutMS: 45000,           // 45 seconds for operations
    };
    const client = new MongoClient(uri, connectionOptions);
    await client.connect();
    cachedDb = client.db(dbName);
    console.log('✅ Connected to MongoDB database (health checks bypassed)');
    return cachedDb;
  }
}

// Export health checker for route integration
export function getHealthChecker() {
  return initializeHealthChecker();
}
