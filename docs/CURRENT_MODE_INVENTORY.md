# Current Mode Configuration Inventory

## Root Directory .env Files

### .env (Root)
```properties
MONGODB_MODE=local
APP_MODE=express
LOCAL_HOST_PORT=3000
AWS_REGION=us-west-2
RECIPE_IMAGES_BUCKET=mrb-recipe-images-dev
MONGODB_LOCAL_ROOT_USER=admin
MONGODB_LOCAL_ROOT_PASSWORD=supersecret
MONGODB_LOCAL_ADMIN_USER=admin
MONGODB_LOCAL_ADMIN_PASSWORD=superdupersecret
MONGODB_LOCAL_URI=mongodb://admin:supersecret@mongo:27017/moms_recipe_box_dev?authSource=admin
MONGODB_DB_NAME=moms_recipe_box_dev 
MONGODB_URI=mongodb://admin:supersecret@localhost:27017/moms_recipe_box_dev?authSource=admin
MONGODB_ATLAS_URI=
```

## App Directory .env Files

### app/.env
```properties
MONGODB_MODE=atlas
MONGODB_DB_NAME=moms_recipe_box
MONGODB_ATLAS_HOST=momsrecipebox-cluster.vohcix5.mongodb.net
MONGODB_ATLAS_USER=mrbapp
MONGODB_ATLAS_PASSWORD=zjF5MNeHDeCs9@XBzjF5MNeHDeCs9@XB
ENABLE_STARTUP_HEALTH_CHECKS=true
ENABLE_DATA_QUALITY_CHECKS=true
MIN_CLEAN_PERCENTAGE=50
APP_MODE=atlas
```

## UI Directory .env Files

### ui/.env
```properties
VITE_API_MODE=proxy
# VITE_API_BASE_URL=http://localhost:3000
```

### ui/.env.local
```bash
VITE_ENVIRONMENT=local
VITE_API_URL_LOCAL=http://localhost:3000
VITE_API_TIMEOUT=10000
```

### ui/.env.atlas
```bash
VITE_ENVIRONMENT=atlas
VITE_API_URL_ATLAS=http://localhost:3000
VITE_API_TIMEOUT=10000
```

### ui/.env.lambda
```bash
VITE_ENVIRONMENT=lambda  
VITE_API_URL_LAMBDA=https://b31emm78z4.execute-api.us-west-2.amazonaws.com/dev
VITE_API_TIMEOUT=15000
```

## NPM Scripts Analysis

### Mode/Environment Scripts
- `env:local`: "echo MONGODB_MODE=local > .env && echo APP_MODE=express >> .env"
- `env:atlas`: "echo MONGODB_MODE=atlas > .env && echo APP_MODE=express >> .env"
- `env:lambda`: "echo MONGODB_MODE=atlas > .env && echo APP_MODE=lambda >> .env"
- `mode:local`: "node scripts/switch-mode.js local --no-restart"
- `mode:atlas`: "node scripts/switch-mode.js atlas --no-restart"
- `mode:lambda`: "node scripts/switch-mode.js lambda --no-restart"

### Development Scripts
- `dev:local`: "npm run stop:all && npm run mode:local && npm run start:local"
- `dev:atlas`: "npm run stop:all && npm run mode:atlas && npm run start:atlas"
- `dev:lambda`: "npm run stop:all && npm run mode:lambda && npm run start:lambda-local"

## Issues Identified

### 1. Conflicting Mode Values
- Root .env: `MONGODB_MODE=local, APP_MODE=express`
- App .env: `MONGODB_MODE=atlas, APP_MODE=atlas`

### 2. Inconsistent Mode Names
- `APP_MODE` values: `express`, `atlas`, `lambda`, `local`
- No clear mapping between these values

### 3. Scattered Configuration
- Database config in root .env
- App-specific config in app/.env
- UI config spread across multiple files

### 4. Script Confusion
- `env:*` scripts overwrite root .env
- `mode:*` scripts only set MONGODB_MODE
- Different scripts use different approaches

### 5. UI Disconnection
- UI environment files not synchronized with backend modes
- Manual switching required between UI and backend configurations

## Current Deployment Scenarios

### Scenario 1: Local Development (Mixed Config)
- Database: Local MongoDB (from root .env)
- Backend: Express with atlas mode (from app/.env)
- Frontend: Proxy mode (from ui/.env)

### Scenario 2: Atlas Development (Unclear)
- Multiple conflicting configurations
- No clear single command to switch

### Scenario 3: Lambda Testing (Partial)
- Some lambda configuration exists
- No clear end-to-end setup

### Scenario 4: Production (Undefined)
- No clear production profile defined
- CloudFront integration not configured