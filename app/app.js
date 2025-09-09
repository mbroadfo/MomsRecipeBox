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

export async function getDb() {
  if (cachedDb) return cachedDb;
  
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  if (!uri || !dbName) throw new Error('Missing MongoDB config');
  
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
    
    console.log('✅ Connected to MongoDB database');
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
