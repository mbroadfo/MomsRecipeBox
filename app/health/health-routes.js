/**
 * Health Check Routes
 * 
 * Provides HTTP endpoints for monitoring application and database health.
 * Integrates with the application health checker system.
 */

import { getHealthChecker } from '../app.js';

/**
 * Set up health check routes
 */
export function setupHealthRoutes(app) {
  const healthChecker = getHealthChecker();
  const endpoints = healthChecker.getHealthEndpoints();

  // Basic health check - returns 200 if healthy, 503 if not
  app.get('/health', endpoints['/health']);

  // Detailed health check with full component breakdown
  app.get('/health/detailed', endpoints['/health/detailed']);

  // Health check history
  app.get('/health/history', endpoints['/health/history']);

  // Liveness probe (always returns 200 if server is running)
  app.get('/health/live', (req, res) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Readiness probe (returns 200 if ready to serve traffic)
  app.get('/health/ready', async (req, res) => {
    try {
      const health = healthChecker.getCurrentHealth();
      
      // Consider ready if not critical
      const isReady = !health || health.overall !== 'critical';
      const status = isReady ? 200 : 503;
      
      res.status(status).json({
        status: isReady ? 'ready' : 'not_ready',
        overall_health: health?.overall || 'unknown',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  console.log('✅ Health check routes registered:');
  console.log('   GET /health - Basic health status');
  console.log('   GET /health/detailed - Detailed health information');
  console.log('   GET /health/history - Health check history');
  console.log('   GET /health/live - Liveness probe');
  console.log('   GET /health/ready - Readiness probe');
}

/**
 * Health check middleware for critical operations
 */
export function requireHealthyDatabase(req, res, next) {
  const healthChecker = getHealthChecker();
  const currentHealth = healthChecker.getCurrentHealth();
  
  if (currentHealth && currentHealth.components?.database?.overall === 'critical') {
    return res.status(503).json({
      error: 'Database is unhealthy',
      health_status: currentHealth.components.database,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown() {
  const healthChecker = getHealthChecker();
  
  const shutdown = (signal) => {
    console.log(`\n🔄 Received ${signal}, starting graceful shutdown...`);
    
    // Stop periodic health checks
    healthChecker.stopPeriodicHealthChecks();
    
    // Give some time for in-flight requests to complete
    setTimeout(() => {
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
