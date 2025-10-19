// File: app/app.js
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { ApplicationHealthChecker } from './health/application-health.js';

let cachedDb = null;
let healthChecker = null;

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
 * Gets the appropriate MongoDB connection string based on the environment configuration.
 * Supports toggling between local Docker MongoDB and MongoDB Atlas.
 * @returns {string} The MongoDB connection string
 */
export function getMongoConnectionString() {
  // Check which MongoDB mode to use (default: local)
  const mongoMode = (process.env.MONGODB_MODE || 'local').toLowerCase();
  const dbName = process.env.MONGODB_DB_NAME || 'moms_recipe_box_dev';
  
  // For MongoDB Atlas
  if (mongoMode === 'atlas') {
    // Check if a full connection string is provided
    if (process.env.MONGODB_ATLAS_URI) {
      console.log('📦 Using MongoDB Atlas (connection string provided)');
      return process.env.MONGODB_ATLAS_URI;
    }
    
    // If we don't have a valid Atlas configuration, warn but fall back to local
    console.warn('⚠️  MongoDB Atlas configuration incomplete, falling back to local MongoDB');
    return process.env.MONGODB_URI || `mongodb://admin:supersecret@localhost:27017/${dbName}?authSource=admin`;
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
  const host = process.env.MONGODB_HOST || 'localhost:27017';
  
  return `mongodb://${user}:${encodeURIComponent(password)}@${host}/${dbName}?authSource=admin`;
}

export async function getDb() {
  if (cachedDb) return cachedDb;
  
  const uri = getMongoConnectionString();
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
    
    // Connect to database
    const client = new MongoClient(uri);
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
    const client = new MongoClient(uri);
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
