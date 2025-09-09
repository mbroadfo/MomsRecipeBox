/**
 * Application Health Check System
 * 
 * Provides comprehensive health monitoring for the entire Mom's Recipe Box application.
 * Integrates database health, API health, and system health checks.
 */

import { DatabaseHealthChecker } from './database-health.js';

class ApplicationHealthChecker {
  constructor(config = {}) {
    this.config = {
      startup: {
        enableHealthChecks: config.startup?.enableHealthChecks !== false,
        failOnCritical: config.startup?.failOnCritical || false,
        timeoutMs: config.startup?.timeoutMs || 10000
      },
      runtime: {
        enablePeriodicChecks: config.runtime?.enablePeriodicChecks || false,
        checkIntervalMs: config.runtime?.checkIntervalMs || 300000, // 5 minutes
        enableEndpoints: config.runtime?.enableEndpoints !== false
      },
      database: config.database || {},
      reporting: {
        enableConsoleOutput: config.reporting?.enableConsoleOutput !== false,
        enableStartupBanner: config.reporting?.enableStartupBanner !== false
      }
    };

    this.healthHistory = [];
    this.lastHealthCheck = null;
    this.periodicCheckInterval = null;
  }

  /**
   * Perform startup health checks
   */
  async performStartupHealthChecks() {
    if (!this.config.startup.enableHealthChecks) {
      if (this.config.reporting.enableConsoleOutput) {
        console.log('⏭️  Health checks disabled for startup');
      }
      return { overall: 'healthy', skipped: true };
    }

    if (this.config.reporting.enableStartupBanner) {
      this.displayStartupBanner();
    }

    const startTime = Date.now();
    let timeoutHandle;

    try {
      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Health check timeout after ${this.config.startup.timeoutMs}ms`));
        }, this.config.startup.timeoutMs);
      });

      // Perform health checks
      const healthCheckPromise = this.performFullHealthCheck(true);
      
      const healthStatus = await Promise.race([healthCheckPromise, timeoutPromise]);
      
      clearTimeout(timeoutHandle);
      
      const duration = Date.now() - startTime;
      
      if (this.config.reporting.enableConsoleOutput) {
        this.reportStartupHealth(healthStatus, duration);
      }

      // Determine if we should fail startup
      if (this.config.startup.failOnCritical && healthStatus.overall === 'critical') {
        throw new Error('Application startup failed due to critical health issues');
      }

      return healthStatus;

    } catch (error) {
      clearTimeout(timeoutHandle);
      
      if (this.config.reporting.enableConsoleOutput) {
        console.error('❌ Startup health check failed:', error.message);
      }

      if (this.config.startup.failOnCritical) {
        throw error;
      }

      return {
        overall: 'critical',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performFullHealthCheck(isStartup = false) {
    const healthStatus = {
      overall: 'healthy',
      timestamp: new Date().toISOString(),
      isStartup,
      components: {},
      summary: {
        healthy: 0,
        warning: 0,
        critical: 0
      }
    };

    // Database Health Check
    try {
      const dbChecker = new DatabaseHealthChecker({
        ...this.config.database,
        healthChecks: {
          enableQualityCheck: !isStartup, // Skip quality check on startup for speed
          ...this.config.database.healthChecks
        },
        reporting: {
          enableConsoleOutput: false // We'll handle reporting
        }
      });

      const dbHealth = await dbChecker.performHealthCheck();
      healthStatus.components.database = dbHealth;
      
      this.updateHealthSummary(healthStatus.summary, dbHealth.overall);

    } catch (error) {
      healthStatus.components.database = {
        overall: 'critical',
        error: error.message
      };
      this.updateHealthSummary(healthStatus.summary, 'critical');
    }

    // API Health Check
    try {
      const apiHealth = await this.checkAPIHealth();
      healthStatus.components.api = apiHealth;
      this.updateHealthSummary(healthStatus.summary, apiHealth.overall);
    } catch (error) {
      healthStatus.components.api = {
        overall: 'critical',
        error: error.message
      };
      this.updateHealthSummary(healthStatus.summary, 'critical');
    }

    // System Health Check
    try {
      const systemHealth = this.checkSystemHealth();
      healthStatus.components.system = systemHealth;
      this.updateHealthSummary(healthStatus.summary, systemHealth.overall);
    } catch (error) {
      healthStatus.components.system = {
        overall: 'warning',
        error: error.message
      };
      this.updateHealthSummary(healthStatus.summary, 'warning');
    }

    // Determine overall health
    if (healthStatus.summary.critical > 0) {
      healthStatus.overall = 'critical';
    } else if (healthStatus.summary.warning > 0) {
      healthStatus.overall = 'warning';
    } else {
      healthStatus.overall = 'healthy';
    }

    // Store in history
    this.healthHistory.push(healthStatus);
    this.lastHealthCheck = healthStatus;

    // Keep only last 10 health checks
    if (this.healthHistory.length > 10) {
      this.healthHistory = this.healthHistory.slice(-10);
    }

    return healthStatus;
  }

  /**
   * Check API health
   */
  async checkAPIHealth() {
    // Basic API health checks
    const health = {
      overall: 'healthy',
      checks: [],
      timestamp: new Date().toISOString()
    };

    // Check Node.js version
    const nodeVersion = process.version;
    health.checks.push({
      name: 'node_version',
      status: 'healthy',
      value: nodeVersion
    });

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memStatus = memUsageMB > 512 ? 'warning' : 'healthy';
    
    health.checks.push({
      name: 'memory_usage',
      status: memStatus,
      value: `${memUsageMB}MB`
    });

    if (memStatus === 'warning') {
      health.overall = 'warning';
    }

    // Check environment variables
    const requiredEnvVars = ['MONGODB_DB_NAME'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      health.overall = 'warning';
      health.checks.push({
        name: 'environment_variables',
        status: 'warning',
        value: `Missing: ${missingEnvVars.join(', ')}`
      });
    } else {
      health.checks.push({
        name: 'environment_variables',
        status: 'healthy',
        value: 'All required variables present'
      });
    }

    return health;
  }

  /**
   * Check system health
   */
  checkSystemHealth() {
    const health = {
      overall: 'healthy',
      checks: [],
      timestamp: new Date().toISOString()
    };

    // Check uptime
    const uptimeSeconds = process.uptime();
    health.checks.push({
      name: 'uptime',
      status: 'healthy',
      value: `${Math.round(uptimeSeconds)}s`
    });

    // Check platform
    health.checks.push({
      name: 'platform',
      status: 'healthy',
      value: `${process.platform} ${process.arch}`
    });

    return health;
  }

  /**
   * Update health summary counters
   */
  updateHealthSummary(summary, status) {
    if (status === 'critical') {
      summary.critical++;
    } else if (status === 'warning') {
      summary.warning++;
    } else {
      summary.healthy++;
    }
  }

  /**
   * Display startup banner
   */
  displayStartupBanner() {
    console.log('');
    console.log('🏥 Mom\'s Recipe Box - Health Check System');
    console.log('═'.repeat(50));
    console.log('Performing comprehensive health checks...');
    console.log('');
  }

  /**
   * Report startup health status
   */
  reportStartupHealth(healthStatus, duration) {
    const icon = healthStatus.overall === 'healthy' ? '✅' : 
                healthStatus.overall === 'warning' ? '⚠️ ' : '❌';
    
    console.log(`${icon} Startup health check complete (${duration}ms)`);
    console.log(`   Overall Status: ${healthStatus.overall.toUpperCase()}`);
    
    if (healthStatus.components) {
      Object.entries(healthStatus.components).forEach(([component, status]) => {
        const componentIcon = status.overall === 'healthy' ? '✅' : 
                             status.overall === 'warning' ? '⚠️ ' : '❌';
        console.log(`   ${componentIcon} ${component}: ${status.overall}`);
      });
    }

    if (healthStatus.summary) {
      console.log(`   Components: ${healthStatus.summary.healthy} healthy, ${healthStatus.summary.warning} warning, ${healthStatus.summary.critical} critical`);
    }

    if (healthStatus.overall !== 'healthy') {
      console.log('\n💡 Health Issues Detected:');
      console.log('   - Run health check endpoint: GET /health for details');
      console.log('   - Run data quality check: npm run db:analyze');
      console.log('   - Check application logs for specific errors');
    }

    console.log('');
  }

  /**
   * Start periodic health checks
   */
  startPeriodicHealthChecks() {
    if (!this.config.runtime.enablePeriodicChecks) {
      return;
    }

    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
    }

    this.periodicCheckInterval = setInterval(async () => {
      try {
        await this.performFullHealthCheck();
        
        if (this.config.reporting.enableConsoleOutput && this.lastHealthCheck?.overall !== 'healthy') {
          console.log(`⚠️  Periodic health check: ${this.lastHealthCheck.overall} status detected`);
        }
      } catch (error) {
        if (this.config.reporting.enableConsoleOutput) {
          console.error('❌ Periodic health check failed:', error.message);
        }
      }
    }, this.config.runtime.checkIntervalMs);

    if (this.config.reporting.enableConsoleOutput) {
      console.log(`🔄 Periodic health checks enabled (every ${this.config.runtime.checkIntervalMs / 1000}s)`);
    }
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicHealthChecks() {
    if (this.periodicCheckInterval) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }
  }

  /**
   * Get health endpoints for Express integration
   */
  getHealthEndpoints() {
    return {
      // Quick health check endpoint
      '/health': async (req, res) => {
        try {
          const health = this.lastHealthCheck || await this.performFullHealthCheck();
          const status = health.overall === 'healthy' ? 200 : 
                        health.overall === 'warning' ? 200 : 503;
          
          res.status(status).json({
            status: health.overall,
            timestamp: health.timestamp,
            components: health.components,
            summary: health.summary
          });
        } catch (error) {
          res.status(503).json({
            status: 'critical',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      },

      // Detailed health check endpoint
      '/health/detailed': async (req, res) => {
        try {
          const health = await this.performFullHealthCheck();
          res.json(health);
        } catch (error) {
          res.status(503).json({
            status: 'critical',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      },

      // Health history endpoint
      '/health/history': (req, res) => {
        res.json({
          history: this.healthHistory,
          count: this.healthHistory.length
        });
      }
    };
  }

  /**
   * Get current health status
   */
  getCurrentHealth() {
    return this.lastHealthCheck;
  }
}

export { ApplicationHealthChecker };
