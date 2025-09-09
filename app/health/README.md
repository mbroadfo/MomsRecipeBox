# Health Check System

## Overview

The Mom's Recipe Box health check system provides comprehensive monitoring of application and database health. It integrates data quality analysis, database monitoring, and system health checks into both startup and runtime processes.

## Features

- **🚀 Startup Health Checks** - Verify system health before serving requests
- **📊 Data Quality Integration** - Monitors recipe data quality automatically  
- **🔄 Runtime Health Monitoring** - Optional periodic health checks
- **🌐 HTTP Health Endpoints** - REST API for health status
- **⚙️ Configurable Thresholds** - Customizable health criteria
- **🚨 Graceful Degradation** - Continues operation with warnings when possible

## Quick Start

### 1. Basic Configuration
Add to your `.env` file:
```bash
ENABLE_STARTUP_HEALTH_CHECKS=true
ENABLE_DATA_QUALITY_CHECKS=true
MIN_CLEAN_PERCENTAGE=50
```

### 2. Start the Application
The health checks will run automatically on startup:
```bash
npm start
```

You'll see output like:
```
🏥 Mom's Recipe Box - Health Check System
════════════════════════════════════════════════════
Performing comprehensive health checks...

✅ Database connectivity: 45ms
✅ Database health: 27 recipes, 2 indexes  
✅ Data quality: 59.3% clean, 0 critical, 5 high issues
✅ Startup health check complete (1247ms)
   Overall Status: HEALTHY
   ✅ database: healthy
   ✅ api: healthy  
   ✅ system: healthy
   Components: 3 healthy, 0 warning, 0 critical

✅ Connected to MongoDB database
✅ Health check system initialized
📍 Health endpoints available:
   http://localhost:3000/health
   http://localhost:3000/health/detailed
   ...
✅ Server ready at http://localhost:3000
```

### 3. Check Health Status
Access health endpoints:
```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health information  
curl http://localhost:3000/health/detailed
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Application Startup                       │
├─────────────────────────────────────────────────────────────┤
│  1. ApplicationHealthChecker.performStartupHealthChecks()  │
│     ├── DatabaseHealthChecker                              │
│     │   ├── Connectivity Check                             │
│     │   ├── Basic Database Health                          │
│     │   ├── Performance Check                              │
│     │   └── Data Quality Analysis (RecipeDataQualityAnalyzer) │
│     ├── API Health Check                                   │
│     └── System Health Check                                │
│                                                             │
│  2. Health Routes Registration                              │
│  3. Periodic Health Checks (optional)                      │
│  4. Graceful Shutdown Handlers                             │
└─────────────────────────────────────────────────────────────┘
```

## Components

### ApplicationHealthChecker
Main orchestrator that coordinates all health checks and provides HTTP endpoints.

**Key Methods:**
- `performStartupHealthChecks()` - Run on application startup
- `performFullHealthCheck()` - Comprehensive health assessment
- `getHealthEndpoints()` - Returns Express-compatible route handlers

### DatabaseHealthChecker  
Specialized checker for database-related health monitoring.

**Checks Performed:**
- **Connectivity**: Connection time and basic operations
- **Database Health**: Collection existence and basic queries
- **Performance**: Query response time measurement
- **Data Quality**: Integration with existing quality analyzer

### Health Routes
HTTP endpoints for external health monitoring:

| Endpoint | Purpose | Use Case |
|----------|---------|----------|
| `/health` | Basic status | Load balancer health checks |
| `/health/detailed` | Full component breakdown | Troubleshooting and monitoring |
| `/health/history` | Health check history | Trend analysis |
| `/health/live` | Liveness probe | Container orchestration |
| `/health/ready` | Readiness probe | Traffic routing decisions |

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_STARTUP_HEALTH_CHECKS` | `true` | Enable health checks on startup |
| `FAIL_ON_CRITICAL_HEALTH` | `false` | Fail startup if critical issues found |
| `HEALTH_CHECK_TIMEOUT_MS` | `10000` | Timeout for health checks (ms) |
| `ENABLE_PERIODIC_HEALTH_CHECKS` | `false` | Enable runtime monitoring |
| `HEALTH_CHECK_INTERVAL_MS` | `300000` | Periodic check interval (ms) |
| `ENABLE_DATA_QUALITY_CHECKS` | `true` | Include data quality analysis |
| `MIN_CLEAN_PERCENTAGE` | `50` | Minimum clean recipe percentage |
| `MAX_CRITICAL_ISSUES` | `0` | Maximum critical issues allowed |

### Health Status Levels

- **🟢 Healthy**: All systems operating normally
- **🟡 Warning**: Minor issues detected, system functional
- **🔴 Critical**: Major issues detected, system may be impaired

## Integration Examples

### Load Balancer Health Check
```nginx
# Nginx upstream health check
upstream backend {
    server app1:3000;
    server app2:3000;
}

location /health {
    proxy_pass http://backend;
    proxy_connect_timeout 2s;
    proxy_read_timeout 2s;
}
```

### Docker Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Kubernetes Probes
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    livenessProbe:
      httpGet:
        path: /health/live
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
```

### Monitoring Integration
```javascript
// Prometheus metrics collection example
const healthResponse = await fetch('http://localhost:3000/health/detailed');
const health = await healthResponse.json();

// Extract metrics
const dbConnTime = health.components.database.connectivity_time_ms;
const dataQualityPct = health.components.database.data_quality_percentage;
const memoryUsageMB = health.components.api.memory_usage_mb;
```

## Troubleshooting

### Common Issues

**Health Check Timeout**
```bash
# Increase timeout
HEALTH_CHECK_TIMEOUT_MS=30000
```

**High Memory Usage Warnings**
```bash
# Monitor Node.js memory usage
curl http://localhost:3000/health/detailed | jq '.components.api.checks[] | select(.name=="memory_usage")'
```

**Data Quality Issues**
```bash
# Run detailed data quality analysis
npm run db:analyze

# Fix auto-fixable issues
npm run db:clean-apply
```

**Database Connectivity Issues**
```bash
# Check MongoDB status
curl http://localhost:3000/health/detailed | jq '.components.database'
```

### Performance Considerations

- **Startup Impact**: Basic health checks add ~1-3 seconds to startup time
- **Data Quality Impact**: Full data quality analysis adds ~2-5 seconds depending on recipe count
- **Runtime Impact**: Periodic checks are disabled by default to avoid performance overhead
- **Memory Usage**: Health check history is limited to last 10 checks

### Disabling Health Checks

For performance-critical scenarios:
```bash
# Minimal configuration
ENABLE_STARTUP_HEALTH_CHECKS=false
ENABLE_DATA_QUALITY_CHECKS=false
ENABLE_PERIODIC_HEALTH_CHECKS=false
```

## Development and Testing

### Running Health Checks Manually
```bash
# Via API endpoints
curl http://localhost:3000/health
curl http://localhost:3000/health/detailed

# Via database tools
npm run db:analyze
npm run db:fields
```

### Health Check Testing
```javascript
// Test health endpoints
const response = await fetch('/health');
expect(response.status).toBe(200);

const health = await response.json();
expect(health.status).toBe('healthy');
```

## Files

- `app/health/application-health.js` - Main health check orchestrator
- `app/health/database-health.js` - Database-specific health checks
- `app/health/health-routes.js` - HTTP endpoint handlers
- `app/health/CONFIGURATION.md` - Detailed configuration guide
- `app/app.js` - Integration point with application startup
- `app/local_server.js` - Local development server integration

---

The health check system provides a robust foundation for monitoring Mom's Recipe Box in development, testing, and production environments. It integrates seamlessly with existing database tools and provides comprehensive visibility into system health.
