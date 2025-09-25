# Phase 4.1: UI Environment Integration - Documentation

## Overview

Phase 4.1 successfully integrates the React UI with environment-aware configuration, enabling seamless connectivity across all deployment environments (local, atlas, lambda, production).

## Environment Configuration System

### File Structure
```
ui/src/config/
├── environment.ts          # Core environment configuration
ui/src/lib/
├── api-client.ts           # Environment-aware HTTP client
ui/
├── .env.local             # Local development environment
├── .env.atlas             # Atlas development environment  
├── .env.lambda            # Lambda cloud development environment
├── .env.production        # Production environment
```

### Environment Modes

#### 1. Local Development (`local`)
- **UI**: Vite dev server at `http://localhost:5173`
- **API**: Local Express server at `http://localhost:3000`
- **Database**: Docker MongoDB container
- **Usage**: `npm run ui:dev:local` or `npm run fullstack:local`

#### 2. Atlas Development (`atlas`)
- **UI**: Vite dev server at `http://localhost:5173`
- **API**: Local Express server at `http://localhost:3000`
- **Database**: MongoDB Atlas M0 cluster
- **Usage**: `npm run ui:dev:atlas` or `npm run fullstack:atlas`

#### 3. Lambda Cloud Development (`lambda`)
- **UI**: Built for production, served locally for testing
- **API**: AWS Lambda via API Gateway
- **Database**: MongoDB Atlas M0 cluster
- **Usage**: `npm run ui:dev:lambda`

#### 4. Production (`production`)
- **UI**: S3 + CloudFront (Phase 4.2)
- **API**: AWS Lambda via API Gateway
- **Database**: MongoDB Atlas M0 cluster
- **Usage**: `npm run ui:build:production`

## NPM Scripts Reference

### Root Package.json Scripts

#### UI Development
```bash
npm run ui:dev                # Local development (default)
npm run ui:dev:local          # Local API + Local DB
npm run ui:dev:atlas          # Local API + Atlas DB
npm run ui:dev:lambda         # Lambda API + Atlas DB
```

#### UI Building
```bash
npm run ui:build              # Production build (default)
npm run ui:build:local        # Development build for local
npm run ui:build:atlas        # Development build for atlas
npm run ui:build:lambda       # Production build for lambda
npm run ui:build:production   # Production build for S3 deployment
```

#### Full-Stack Development
```bash
npm run fullstack:local       # API + UI in local mode
npm run fullstack:atlas       # API + UI in atlas mode
```

### UI Package.json Scripts

#### Development Servers
```bash
# From ui/ directory
npm run dev                   # Default (local mode)
npm run dev:local            # VITE_ENVIRONMENT=local
npm run dev:atlas            # VITE_ENVIRONMENT=atlas  
npm run dev:lambda           # VITE_ENVIRONMENT=lambda
```

#### Build Commands
```bash
# From ui/ directory
npm run build                # Production build
npm run build:local         # Development build (local)
npm run build:atlas         # Development build (atlas)
npm run build:lambda        # Production build (lambda)
npm run build:production    # Production build (full)
```

## Environment Variables

### UI Environment Variables
All UI environment variables are prefixed with `VITE_` to be available in the browser:

```bash
VITE_ENVIRONMENT=local|atlas|lambda|production
VITE_API_URL_LOCAL=http://localhost:3000
VITE_API_URL_ATLAS=http://localhost:3000
VITE_API_URL_LAMBDA=https://your-lambda-api.execute-api.us-west-2.amazonaws.com
VITE_API_URL_PRODUCTION=https://your-production-api.execute-api.us-west-2.amazonaws.com
VITE_API_TIMEOUT=10000|15000
```

### API Environment Variables
Standard environment variables for the Express/Lambda API:

```bash
MONGODB_MODE=local|atlas
APP_MODE=express|lambda
MONGODB_ATLAS_URI=mongodb+srv://...
```

## Environment Detection

The UI automatically detects the current environment and configures:

1. **API Base URL**: Correct endpoint for each environment
2. **Request Timeout**: 10s for local, 15s for Lambda (cold starts)
3. **Development Tools**: Enabled for non-production environments
4. **Retry Logic**: More aggressive retries in production
5. **Logging**: Console logging for development environments

## Testing Environment Configuration

### 1. Test Local Environment
```bash
# Terminal 1: Start API + Database
npm run dev:local

# Terminal 2: Start UI  
npm run ui:dev:local

# Browser: http://localhost:5173
# Should show [LOCAL] logs in console
```

### 2. Test Atlas Environment
```bash  
# Terminal 1: Start API with Atlas DB
npm run dev:atlas

# Terminal 2: Start UI in Atlas mode
npm run ui:dev:atlas

# Browser: http://localhost:5173
# Should show [ATLAS] logs in console
```

### 3. Test Lambda Environment
```bash
# Build UI for Lambda testing
npm run ui:build:lambda

# Preview built UI
npm run ui:preview:lambda

# Should configure for Lambda API endpoints
```

## Build Output Analysis

### Development Builds (local/atlas)
- **Source Maps**: Enabled for debugging
- **Minification**: Disabled for readability
- **Bundle Size**: ~1.6MB (with source maps)
- **Chunks**: vendor, query, main

### Production Builds (lambda/production)
- **Source Maps**: Disabled for performance
- **Minification**: Enabled for optimization  
- **Bundle Size**: ~350KB (minified + gzipped ~104KB)
- **Chunks**: Optimized vendor splitting

## Troubleshooting

### Common Issues

#### 1. Port 5173 Already in Use
```bash
# Kill existing Vite processes
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue

# Or use different port
vite --port 5174
```

#### 2. Environment Variables Not Loading
```bash
# Check environment detection
console.log(import.meta.env.VITE_ENVIRONMENT)

# Verify .env files exist
ls ui/.env.*
```

#### 3. API Connection Issues
```bash
# Test API health
Invoke-WebRequest -Uri "http://localhost:3000/health"

# Check API logs
docker-compose logs app-local
```

#### 4. Build Failures
```bash
# Clear node_modules and reinstall
cd ui
rm -rf node_modules
npm install

# Clear Vite cache
npx vite build --force
```

## Next Steps: Phase 4.2

With environment integration complete, Phase 4.2 will focus on:

1. **S3 Bucket Setup**: Terraform configuration for static hosting
2. **CloudFront Distribution**: CDN setup with edge locations
3. **SSL Certificates**: Automated certificate management
4. **Custom Domain**: Optional domain integration
5. **Deployment Scripts**: Automated build → deploy → invalidate pipeline

## Validation Checklist

- ✅ **Local Environment**: UI connects to localhost:3000 API
- ✅ **Atlas Environment**: UI connects to Atlas-backed API
- ✅ **Lambda Environment**: UI builds for Lambda endpoints
- ✅ **Production Environment**: UI builds for production deployment
- ✅ **Cross-Platform**: Works on Windows with PowerShell
- ✅ **Environment Detection**: Automatic configuration based on VITE_ENVIRONMENT
- ✅ **Error Handling**: Graceful fallbacks for missing environment variables
- ✅ **Build Optimization**: Development vs production build differences
- ✅ **NPM Script Integration**: Consistent command patterns across environments