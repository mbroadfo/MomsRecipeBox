# Health Check Configuration

## Environment Variables

Add these environment variables to your `.env` file to configure the health check system:

```bash
# Health Check Configuration
ENABLE_STARTUP_HEALTH_CHECKS=true          # Enable health checks on app startup (default: true)
FAIL_ON_CRITICAL_HEALTH=false              # Fail startup if critical health issues found (default: false)
HEALTH_CHECK_TIMEOUT_MS=10000               # Timeout for startup health checks in ms (default: 10000)

# Periodic Health Checks (Runtime)
ENABLE_PERIODIC_HEALTH_CHECKS=false        # Enable periodic health checks during runtime (default: false)
HEALTH_CHECK_INTERVAL_MS=300000             # Interval between periodic checks in ms (default: 300000 = 5 minutes)

# Data Quality Thresholds
ENABLE_DATA_QUALITY_CHECKS=true            # Include data quality in health checks (default: true)
MIN_CLEAN_PERCENTAGE=50                     # Minimum percentage of clean recipes required (default: 50)
MAX_CRITICAL_ISSUES=0                       # Maximum critical data issues allowed (default: 0)

# Display Configuration
ENABLE_STARTUP_BANNER=true                  # Show health check banner on startup (default: true)
```

## Health Check Behavior

### Startup Health Checks
- **Default**: Enabled with non-blocking mode
- **Purpose**: Verify database connectivity and basic health before serving requests
- **Impact**: Logs health status but doesn't prevent startup unless `FAIL_ON_CRITICAL_HEALTH=true`

### Runtime Health Checks
- **Default**: Disabled for performance
- **Purpose**: Monitor ongoing system health and detect degradation
- **Impact**: Provides health endpoints and optional periodic monitoring

### Health Endpoints

Once enabled, the following endpoints become available:

#### Basic Health Check
```
GET /health
```
Returns 200 if healthy, 503 if critical issues detected. Suitable for load balancer health checks.

#### Detailed Health Check
```
GET /health/detailed
```
Returns comprehensive health information including all component statuses and issue details.

#### Health History
```
GET /health/history
```
Returns last 10 health check results for trend analysis.

#### Liveness Probe
```
GET /health/live
```
Always returns 200 if the server process is running. Used by orchestration systems.

#### Readiness Probe
```
GET /health/ready
```
Returns 200 if ready to serve traffic, 503 if not ready due to critical issues.

## Configuration Examples

### Development Environment
```bash
# .env for development
ENABLE_STARTUP_HEALTH_CHECKS=true
FAIL_ON_CRITICAL_HEALTH=false
ENABLE_DATA_QUALITY_CHECKS=true
ENABLE_STARTUP_BANNER=true
MIN_CLEAN_PERCENTAGE=30                     # More lenient for dev
```

### Production Environment
```bash
# .env for production
ENABLE_STARTUP_HEALTH_CHECKS=true
FAIL_ON_CRITICAL_HEALTH=true               # Fail fast in production
ENABLE_PERIODIC_HEALTH_CHECKS=true         # Monitor ongoing health
HEALTH_CHECK_INTERVAL_MS=300000             # Check every 5 minutes
ENABLE_DATA_QUALITY_CHECKS=true
MIN_CLEAN_PERCENTAGE=70                     # Stricter for production
MAX_CRITICAL_ISSUES=0                       # No critical issues allowed
ENABLE_STARTUP_BANNER=false                 # Less verbose logging
```

### CI/CD Environment
```bash
# .env for CI/CD
ENABLE_STARTUP_HEALTH_CHECKS=true
FAIL_ON_CRITICAL_HEALTH=true               # Fail builds with health issues
HEALTH_CHECK_TIMEOUT_MS=30000               # Longer timeout for CI
ENABLE_DATA_QUALITY_CHECKS=true
MIN_CLEAN_PERCENTAGE=80                     # High quality bar for releases
```

### Minimal Configuration (Performance Focused)
```bash
# .env for minimal overhead
ENABLE_STARTUP_HEALTH_CHECKS=false         # Skip health checks
ENABLE_PERIODIC_HEALTH_CHECKS=false
ENABLE_DATA_QUALITY_CHECKS=false
ENABLE_STARTUP_BANNER=false
```

## Health Check Components

### Database Health
- **Connectivity**: Tests MongoDB connection and response time
- **Basic Operations**: Verifies database queries and collections
- **Performance**: Measures query response times
- **Data Quality**: Analyzes recipe data using quality analyzer (if enabled)

### API Health
- **Node.js Version**: Reports runtime version
- **Memory Usage**: Monitors heap usage and warns if excessive
- **Environment**: Validates required environment variables

### System Health
- **Uptime**: Reports process uptime
- **Platform**: Reports OS and architecture information

## Integration with Monitoring

### Load Balancer Configuration
Use `/health` endpoint for load balancer health checks:
```nginx
# Nginx example
location /health {
    proxy_pass http://backend;
    proxy_connect_timeout 2s;
    proxy_read_timeout 2s;
}
```

### Container Orchestration
Configure health checks in your container orchestration:
```yaml
# Docker Compose example
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Monitoring Systems
Query health endpoints from monitoring systems:
```bash
# Prometheus/monitoring example
curl -s http://localhost:3000/health/detailed | jq '.components.database.overall'
```

## Troubleshooting

### Health Check Failures
1. Check logs for specific error messages
2. Verify MongoDB connectivity manually
3. Run data quality tools: `npm run db:analyze`
4. Check resource usage (memory, disk space)

### Performance Issues
1. Disable periodic checks if causing overhead: `ENABLE_PERIODIC_HEALTH_CHECKS=false`
2. Reduce data quality check frequency
3. Increase health check timeouts for slow systems

### Startup Issues
1. Set `FAIL_ON_CRITICAL_HEALTH=false` to bypass startup failures
2. Check MongoDB connection parameters
3. Verify database exists and is accessible
