# New Four-Profile Architecture Design

## Profile Definitions

### 1. Local Profile
- **Database**: Local MongoDB Docker container
- **Backend**: Local Express app Docker container  
- **Frontend**: Vite dev server with proxy to localhost:3000
- **Use Case**: Full local development with isolated data
- **Key Characteristics**:
  - No external dependencies
  - Fast iteration cycles
  - Local data isolation
  - Docker-based infrastructure

### 2. Atlas Profile  
- **Database**: MongoDB Atlas cloud database
- **Backend**: Local Express app Docker container
- **Frontend**: Vite dev server with proxy to localhost:3000
- **Use Case**: Local development with shared cloud data
- **Key Characteristics**:
  - Shared database with team
  - Local backend debugging
  - Cloud data persistence
  - Network dependency

### 3. Lambda Profile
- **Database**: MongoDB Atlas cloud database
- **Backend**: AWS Lambda deployed functions
- **Frontend**: Vite dev server with direct Lambda calls
- **Use Case**: Testing against deployed serverless backend
- **Key Characteristics**:
  - Production-like backend
  - Serverless scaling behavior
  - No local backend overhead
  - API Gateway integration

### 4. Cloud Profile
- **Database**: MongoDB Atlas cloud database
- **Backend**: AWS Lambda deployed functions
- **Frontend**: CloudFront distributed static site
- **Use Case**: Full production deployment
- **Key Characteristics**:
  - Complete production environment
  - CDN distribution
  - Production performance
  - Minimal local dependencies

## Configuration Architecture

### Core Configuration Files

#### 1. `config/deployment-profiles.json`
```json
{
  "profiles": {
    "local": {
      "name": "Local Development",
      "description": "Full local stack with Docker containers",
      "database": {
        "type": "local",
        "connectionString": "mongodb://admin:supersecret@localhost:27017/moms_recipe_box_dev?authSource=admin",
        "dockerService": "mongo"
      },
      "backend": {
        "type": "express",
        "mode": "local",
        "dockerService": "app-local",
        "port": 3000
      },
      "frontend": {
        "type": "vite-dev",
        "mode": "proxy",
        "apiUrl": "http://localhost:3000",
        "timeout": 10000
      },
      "docker": {
        "profile": "local",
        "services": ["mongo", "app-local", "mongo-express"]
      }
    },
    "atlas": {
      "name": "Atlas Development", 
      "description": "Local backend with cloud database",
      "database": {
        "type": "atlas",
        "connectionString": "${MONGODB_ATLAS_URI}",
        "dockerService": null
      },
      "backend": {
        "type": "express",
        "mode": "atlas", 
        "dockerService": "app-atlas",
        "port": 3000
      },
      "frontend": {
        "type": "vite-dev",
        "mode": "proxy",
        "apiUrl": "http://localhost:3000",
        "timeout": 10000
      },
      "docker": {
        "profile": "atlas",
        "services": ["app-atlas"]
      }
    },
    "lambda": {
      "name": "Lambda Testing",
      "description": "Test against deployed Lambda API",
      "database": {
        "type": "atlas",
        "connectionString": "${MONGODB_ATLAS_URI}",
        "dockerService": null
      },
      "backend": {
        "type": "lambda",
        "mode": "lambda",
        "dockerService": null,
        "apiUrl": "${LAMBDA_API_URL}"
      },
      "frontend": {
        "type": "vite-dev", 
        "mode": "direct",
        "apiUrl": "${LAMBDA_API_URL}",
        "timeout": 15000
      },
      "docker": {
        "profile": null,
        "services": []
      }
    },
    "cloud": {
      "name": "Cloud Production",
      "description": "Full production deployment",
      "database": {
        "type": "atlas",
        "connectionString": "${MONGODB_ATLAS_URI}",
        "dockerService": null
      },
      "backend": {
        "type": "lambda",
        "mode": "lambda",
        "dockerService": null,
        "apiUrl": "${LAMBDA_API_URL}"
      },
      "frontend": {
        "type": "cloudfront",
        "mode": "production",
        "apiUrl": "${LAMBDA_API_URL}",
        "distributionUrl": "${CLOUDFRONT_URL}"
      },
      "docker": {
        "profile": null,
        "services": []
      }
    }
  },
  "currentProfile": "local"
}
```

#### 2. `config/environment-variables.json`
```json
{
  "static": {
    "AWS_REGION": "us-west-2",
    "RECIPE_IMAGES_BUCKET": "mrb-recipe-images-dev",
    "MONGODB_DB_NAME": "moms_recipe_box_dev",
    "LOCAL_HOST_PORT": "3000"
  },
  "secrets": {
    "MONGODB_LOCAL_ROOT_USER": "admin",
    "MONGODB_LOCAL_ROOT_PASSWORD": "supersecret",
    "MONGODB_ATLAS_URI": "${MONGODB_ATLAS_URI}",
    "LAMBDA_API_URL": "https://b31emm78z4.execute-api.us-west-2.amazonaws.com/dev",
    "CLOUDFRONT_URL": "${CLOUDFRONT_URL}"
  },
  "profileSpecific": {
    "local": {
      "MONGODB_MODE": "local",
      "APP_MODE": "express",
      "VITE_API_MODE": "proxy",
      "VITE_ENVIRONMENT": "local"
    },
    "atlas": {
      "MONGODB_MODE": "atlas", 
      "APP_MODE": "express",
      "VITE_API_MODE": "proxy",
      "VITE_ENVIRONMENT": "atlas"
    },
    "lambda": {
      "MONGODB_MODE": "atlas",
      "APP_MODE": "lambda", 
      "VITE_API_MODE": "direct",
      "VITE_ENVIRONMENT": "lambda"
    },
    "cloud": {
      "MONGODB_MODE": "atlas",
      "APP_MODE": "lambda",
      "VITE_API_MODE": "production", 
      "VITE_ENVIRONMENT": "production"
    }
  }
}
```

### Environment File Structure

#### Static Configuration: `.env` (root)
```properties
# Static configuration - rarely changes
AWS_REGION=us-west-2
RECIPE_IMAGES_BUCKET=mrb-recipe-images-dev
MONGODB_DB_NAME=moms_recipe_box_dev
LOCAL_HOST_PORT=3000

# Secrets - loaded from external sources
MONGODB_LOCAL_ROOT_USER=admin
MONGODB_LOCAL_ROOT_PASSWORD=supersecret
MONGODB_ATLAS_URI=mongodb+srv://...
LAMBDA_API_URL=https://b31emm78z4.execute-api.us-west-2.amazonaws.com/dev
```

#### Dynamic Configuration: `config/current-profile.env` (git-ignored)
```properties
# Generated by profile-manager.js - DO NOT EDIT MANUALLY
CURRENT_PROFILE=local
MONGODB_MODE=local
APP_MODE=express
VITE_API_MODE=proxy
VITE_ENVIRONMENT=local
MONGODB_URI=mongodb://admin:supersecret@localhost:27017/moms_recipe_box_dev?authSource=admin
API_BASE_URL=http://localhost:3000
```

## New NPM Script Structure

### Profile Management
```json
{
  "profile:show": "node scripts/profile-manager.js show",
  "profile:set": "node scripts/profile-manager.js set",
  "profile:local": "node scripts/profile-manager.js set local",
  "profile:atlas": "node scripts/profile-manager.js set atlas", 
  "profile:lambda": "node scripts/profile-manager.js set lambda",
  "profile:cloud": "node scripts/profile-manager.js set cloud",
  "profile:validate": "node scripts/profile-manager.js validate"
}
```

### Development Commands
```json
{
  "dev": "node scripts/profile-manager.js dev",
  "dev:local": "npm run profile:local && npm run dev",
  "dev:atlas": "npm run profile:atlas && npm run dev",
  "dev:lambda": "npm run profile:lambda && npm run dev", 
  "dev:cloud": "echo 'Cloud profile uses deployed resources - no local dev needed'"
}
```

### Infrastructure Commands  
```json
{
  "start": "node scripts/profile-manager.js start",
  "stop": "node scripts/profile-manager.js stop",
  "restart": "npm run stop && npm run start",
  "status": "node scripts/profile-manager.js status"
}
```

## Benefits of New Architecture

### 1. Single Source of Truth
- One command switches entire stack
- No conflicting configuration files
- Clear profile definitions

### 2. Consistent Naming
- Standardized mode values across all components
- Clear mapping between profiles and configurations
- Predictable behavior

### 3. Simplified Switching
- `npm run profile:local` - switches everything to local
- `npm run dev` - starts current profile
- `npm run profile:show` - shows current state

### 4. Clean Separation
- Static config in `.env`
- Dynamic config in git-ignored file  
- Profile definitions in version-controlled JSON

### 5. Easy Onboarding
- Clear profile purposes
- Simple commands
- Self-documenting configuration

## Migration Strategy

### Phase 1: Create Infrastructure
- Create config/ directory
- Create profile-manager.js script
- Create profile definition files

### Phase 2: Update Docker
- Modify docker-compose.yml for new profiles
- Remove conflicting app/.env
- Update environment variable mapping

### Phase 3: Update Scripts
- Replace existing mode scripts
- Add new profile commands
- Maintain backwards compatibility

### Phase 4: Update UI
- Consolidate UI .env files
- Update vite.config.ts
- Ensure API switching works

### Phase 5: Clean Up
- Remove old scripts and files
- Update documentation
- Test all profiles thoroughly