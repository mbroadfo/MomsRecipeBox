/**
 * Database Health Check System
 * 
 * Provides comprehensive health monitoring for the Mom's Recipe Box database.
 * Integrates data quality analysis into application startup and runtime monitoring.
 */

import { MongoClient } from 'mongodb';

class RecipeDataQualityChecker {
  /**
   * Simplified data quality analysis for health checks
   * Focuses on key metrics without the full complexity of the quality analyzer
   */
  async analyzeBasicQuality(collection) {
    const startTime = Date.now();
    const recipes = await collection.find({}).toArray();
    
    if (recipes.length === 0) {
      return {
        totalRecipes: 0,
        cleanPercentage: 0,
        issues: { critical: 0, high: 0, medium: 0, low: 0 },
        summary: 'No recipes in database',
        analysisTimeMs: Date.now() - startTime
      };
    }

    let cleanCount = 0;
    let issues = { critical: 0, high: 0, medium: 0, low: 0 };

    for (const recipe of recipes) {
      let isClean = true;
      
      // Critical checks
      if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
        issues.critical++;
        isClean = false;
      }
      
      // High priority checks
      if (Array.isArray(recipe.ingredients) && recipe.ingredients.length === 0) {
        issues.high++;
        isClean = false;
      }
      if (Array.isArray(recipe.instructions) && recipe.instructions.length === 0) {
        issues.high++;
        isClean = false;
      }
      
      // Medium priority checks
      if (!recipe.time || (typeof recipe.time === 'object' && Object.keys(recipe.time).length === 0)) {
        issues.medium++;
        isClean = false;
      }
      if (!recipe.yield) {
        issues.medium++;
        isClean = false;
      }
      
      // Low priority checks
      if (!recipe.description) {
        issues.low++;
        isClean = false;
      }
      
      if (isClean) cleanCount++;
    }
    
    const cleanPercentage = recipes.length > 0 ? (cleanCount / recipes.length) * 100 : 0;
    
    return {
      totalRecipes: recipes.length,
      cleanRecipes: cleanCount,
      cleanPercentage: Math.round(cleanPercentage * 10) / 10,
      issues,
      summary: `${cleanCount}/${recipes.length} recipes clean (${Math.round(cleanPercentage)}%)`,
      analysisTimeMs: Date.now() - startTime
    };
  }
}

class DatabaseHealthChecker {
  constructor(config = {}) {
    this.config = {
      mongodb: {
        uri: config.mongodb?.uri || "mongodb://admin:supersecret@localhost:27017/moms_recipe_box?authSource=admin",
        dbName: config.mongodb?.dbName || process.env.MONGODB_DB_NAME || 'moms_recipe_box',
        connectTimeoutMS: config.mongodb?.connectTimeoutMS || 5000,
        serverSelectionTimeoutMS: config.mongodb?.serverSelectionTimeoutMS || 5000
      },
      healthChecks: {
        enableOnStartup: config.healthChecks?.enableOnStartup !== false,
        enableQualityCheck: config.healthChecks?.enableQualityCheck !== false,
        enablePerformanceCheck: config.healthChecks?.enablePerformanceCheck !== false,
        warnOnIssues: config.healthChecks?.warnOnIssues !== false,
        failOnCritical: config.healthChecks?.failOnCritical !== false
      },
      thresholds: {
        maxConnectionTime: config.thresholds?.maxConnectionTime || 2000,
        minCleanPercentage: config.thresholds?.minCleanPercentage || 50,
        maxCriticalIssues: config.thresholds?.maxCriticalIssues || 0,
        maxHighIssues: config.thresholds?.maxHighIssues || 5
      },
      reporting: {
        enableConsoleOutput: config.reporting?.enableConsoleOutput !== false,
        enableDetailedOutput: config.reporting?.enableDetailedOutput || false
      }
    };

    this.healthStatus = {
      overall: 'unknown',
      database: 'unknown',
      connectivity: 'unknown',
      dataQuality: 'unknown',
      performance: 'unknown',
      lastCheck: null,
      issues: []
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    const startTime = Date.now();
    this.healthStatus.issues = [];
    this.healthStatus.lastCheck = new Date().toISOString();

    if (this.config.reporting.enableConsoleOutput) {
      console.log('🏥 Starting database health check...');
    }

    try {
      // 1. Connectivity Check
      await this.checkConnectivity();
      
      // 2. Basic Database Health
      await this.checkDatabaseHealth();
      
      // 3. Performance Check
      if (this.config.healthChecks.enablePerformanceCheck) {
        await this.checkPerformance();
      }
      
      // 4. Data Quality Check
      if (this.config.healthChecks.enableQualityCheck) {
        await this.checkDataQuality();
      }

      // Determine overall health status
      this.determineOverallHealth();

      const duration = Date.now() - startTime;
      
      if (this.config.reporting.enableConsoleOutput) {
        this.reportHealthStatus(duration);
      }

      return this.healthStatus;

    } catch (error) {
      this.healthStatus.overall = 'critical';
      this.healthStatus.issues.push({
        type: 'HEALTH_CHECK_FAILURE',
        severity: 'critical',
        message: `Health check failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });

      if (this.config.reporting.enableConsoleOutput) {
        console.error('❌ Health check failed:', error.message);
      }

      if (this.config.healthChecks.failOnCritical) {
        throw error;
      }

      return this.healthStatus;
    }
  }

  /**
   * Check database connectivity
   */
  async checkConnectivity() {
    const startTime = Date.now();
    let client;

    try {
      client = new MongoClient(this.config.mongodb.uri, {
        connectTimeoutMS: this.config.mongodb.connectTimeoutMS,
        serverSelectionTimeoutMS: this.config.mongodb.serverSelectionTimeoutMS
      });

      await client.connect();
      
      // Test basic operation
      const db = client.db(this.config.mongodb.dbName);
      await db.admin().ping();

      const connectionTime = Date.now() - startTime;
      
      if (connectionTime > this.config.thresholds.maxConnectionTime) {
        this.healthStatus.connectivity = 'warning';
        this.healthStatus.issues.push({
          type: 'SLOW_CONNECTION',
          severity: 'medium',
          message: `Database connection took ${connectionTime}ms (threshold: ${this.config.thresholds.maxConnectionTime}ms)`,
          timestamp: new Date().toISOString()
        });
      } else {
        this.healthStatus.connectivity = 'healthy';
      }

      if (this.config.reporting.enableDetailedOutput) {
        console.log(`✅ Database connectivity: ${connectionTime}ms`);
      }

    } catch (error) {
      this.healthStatus.connectivity = 'critical';
      this.healthStatus.issues.push({
        type: 'CONNECTION_FAILURE',
        severity: 'critical',
        message: `Cannot connect to database: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  /**
   * Check basic database health
   */
  async checkDatabaseHealth() {
    let client;

    try {
      client = new MongoClient(this.config.mongodb.uri);
      await client.connect();
      
      const db = client.db(this.config.mongodb.dbName);
      
      // Check if recipes collection exists and has data
      const recipesCollection = db.collection('recipes');
      const recipeCount = await recipesCollection.countDocuments();
      
      if (recipeCount === 0) {
        this.healthStatus.database = 'warning';
        this.healthStatus.issues.push({
          type: 'EMPTY_DATABASE',
          severity: 'high',
          message: 'No recipes found in database',
          timestamp: new Date().toISOString()
        });
      } else {
        this.healthStatus.database = 'healthy';
      }

      // Check for required indexes (if any)
      const indexes = await recipesCollection.indexes();
      
      if (this.config.reporting.enableDetailedOutput) {
        console.log(`✅ Database health: ${recipeCount} recipes, ${indexes.length} indexes`);
      }

    } catch (error) {
      this.healthStatus.database = 'critical';
      this.healthStatus.issues.push({
        type: 'DATABASE_ERROR',
        severity: 'critical',
        message: `Database health check failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  /**
   * Check database performance
   */
  async checkPerformance() {
    let client;

    try {
      client = new MongoClient(this.config.mongodb.uri);
      await client.connect();
      
      const db = client.db(this.config.mongodb.dbName);
      const recipesCollection = db.collection('recipes');

      // Test query performance
      const startTime = Date.now();
      await recipesCollection.find({}).limit(10).toArray();
      const queryTime = Date.now() - startTime;

      if (queryTime > 1000) {
        this.healthStatus.performance = 'warning';
        this.healthStatus.issues.push({
          type: 'SLOW_QUERY',
          severity: 'medium',
          message: `Query performance slow: ${queryTime}ms for 10 recipes`,
          timestamp: new Date().toISOString()
        });
      } else {
        this.healthStatus.performance = 'healthy';
      }

      if (this.config.reporting.enableDetailedOutput) {
        console.log(`✅ Performance check: ${queryTime}ms for sample query`);
      }

    } catch (error) {
      this.healthStatus.performance = 'warning';
      this.healthStatus.issues.push({
        type: 'PERFORMANCE_ERROR',
        severity: 'medium',
        message: `Performance check failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  /**
   * Check data quality using the existing analyzer
   */
  async checkDataQuality() {
    try {
      // Use our simplified quality checker
      const qualityChecker = new RecipeDataQualityChecker();
      const client = new MongoClient(this.config.mongodb.uri);

      await client.connect();
      const db = client.db(this.config.mongodb.dbName);
      const recipesCollection = db.collection('recipes');

      const qualityResults = await qualityChecker.analyzeBasicQuality(recipesCollection);

      // Evaluate quality metrics
      const cleanPercentage = qualityResults.cleanPercentage;
      const criticalIssues = qualityResults.issues.critical;
      const highIssues = qualityResults.issues.high;

      if (criticalIssues > this.config.thresholds.maxCriticalIssues) {
        this.healthStatus.dataQuality = 'critical';
        this.healthStatus.issues.push({
          type: 'CRITICAL_DATA_ISSUES',
          severity: 'critical',
          message: `${criticalIssues} critical data quality issues found`,
          timestamp: new Date().toISOString(),
          details: { criticalIssues, qualityResults }
        });
      } else if (highIssues > this.config.thresholds.maxHighIssues || 
                cleanPercentage < this.config.thresholds.minCleanPercentage) {
        this.healthStatus.dataQuality = 'warning';
        this.healthStatus.issues.push({
          type: 'DATA_QUALITY_DEGRADED',
          severity: 'medium',
          message: `Data quality below threshold: ${cleanPercentage}% clean (min: ${this.config.thresholds.minCleanPercentage}%)`,
          timestamp: new Date().toISOString(),
          details: { cleanPercentage, highIssues, qualityResults }
        });
      } else {
        this.healthStatus.dataQuality = 'healthy';
      }

      if (this.config.reporting.enableDetailedOutput) {
        console.log(`✅ Data quality: ${qualityResults.summary}`);
      }

      await client.close();

    } catch (error) {
      this.healthStatus.dataQuality = 'warning';
      this.healthStatus.issues.push({
        type: 'QUALITY_CHECK_ERROR',
        severity: 'medium',
        message: `Data quality check failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Determine overall health status
   */
  determineOverallHealth() {
    const statuses = [
      this.healthStatus.connectivity,
      this.healthStatus.database,
      this.healthStatus.performance,
      this.healthStatus.dataQuality
    ].filter(status => status !== 'unknown');

    if (statuses.includes('critical')) {
      this.healthStatus.overall = 'critical';
    } else if (statuses.includes('warning')) {
      this.healthStatus.overall = 'warning';
    } else {
      this.healthStatus.overall = 'healthy';
    }
  }

  /**
   * Report health status to console
   */
  reportHealthStatus(duration) {
    const icon = this.healthStatus.overall === 'healthy' ? '✅' : 
                this.healthStatus.overall === 'warning' ? '⚠️ ' : '❌';
    
    console.log(`${icon} Database health check complete (${duration}ms)`);
    console.log(`   Overall Status: ${this.healthStatus.overall.toUpperCase()}`);
    console.log(`   Connectivity: ${this.healthStatus.connectivity}`);
    console.log(`   Database: ${this.healthStatus.database}`);
    console.log(`   Performance: ${this.healthStatus.performance}`);
    console.log(`   Data Quality: ${this.healthStatus.dataQuality}`);

    if (this.healthStatus.issues.length > 0) {
      console.log(`   Issues Found: ${this.healthStatus.issues.length}`);
      
      if (this.config.reporting.enableDetailedOutput) {
        this.healthStatus.issues.forEach(issue => {
          const issueIcon = issue.severity === 'critical' ? '🚨' : 
                           issue.severity === 'high' ? '⚠️ ' : 
                           issue.severity === 'medium' ? '🟡' : '🔵';
          console.log(`   ${issueIcon} ${issue.type}: ${issue.message}`);
        });
      }
    }

    // Provide recommendations
    if (this.healthStatus.overall !== 'healthy') {
      console.log('\n💡 Recommendations:');
      if (this.healthStatus.dataQuality !== 'healthy') {
        console.log('   - Run: npm run db:analyze for detailed data quality analysis');
        console.log('   - Run: npm run db:clean-apply to fix auto-fixable issues');
      }
      if (this.healthStatus.performance !== 'healthy') {
        console.log('   - Consider adding database indexes for frequently queried fields');
      }
      if (this.healthStatus.connectivity !== 'healthy') {
        console.log('   - Check MongoDB server status and network connectivity');
      }
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return this.healthStatus;
  }

  /**
   * Check if system is healthy enough to start
   */
  isHealthyForStartup() {
    return this.healthStatus.overall !== 'critical' || !this.config.healthChecks.failOnCritical;
  }
}

/**
 * Quick health check for startup
 */
async function quickHealthCheck(config = {}) {
  const checker = new DatabaseHealthChecker({
    ...config,
    healthChecks: {
      enableQualityCheck: false, // Skip quality check for quick startup
      enablePerformanceCheck: false,
      ...config.healthChecks
    },
    reporting: {
      enableConsoleOutput: true,
      enableDetailedOutput: false,
      ...config.reporting
    }
  });

  return await checker.performHealthCheck();
}

/**
 * Full health check including data quality
 */
async function fullHealthCheck(config = {}) {
  const checker = new DatabaseHealthChecker({
    ...config,
    reporting: {
      enableConsoleOutput: true,
      enableDetailedOutput: true,
      ...config.reporting
    }
  });

  return await checker.performHealthCheck();
}

export { DatabaseHealthChecker, quickHealthCheck, fullHealthCheck };
