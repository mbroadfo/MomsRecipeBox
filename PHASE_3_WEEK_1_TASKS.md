# Phase 3: Week 1 Implementation Tasks

## Priority 1: Create MongoDB Mode Switcher (Replace Toggle-MongoDbConnection.ps1)

### Current PowerShell Script Analysis

The `Toggle-MongoDbConnection.ps1` script currently handles:

- Reading/writing `.env` file for MONGODB_MODE
- Docker container management (start/stop/restart)
- MongoDB Atlas URI retrieval from AWS Secrets Manager
- Health checking and validation
- User-friendly banner and status reporting

### Node.js Replacement Requirements

Create `scripts/switch-mode.js` with equivalent functionality:

#### Core Features Needed

1. **Environment File Management**
   - Read current MONGODB_MODE from `.env`
   - Update `.env` file with new mode
   - Handle missing `.env` file gracefully
   - Support `.env.example` fallback

2. **Docker Container Management**
   - Start/stop containers based on mode
   - Use docker-compose profiles (local/atlas)
   - Container health checking
   - Proper error handling

3. **MongoDB Atlas Integration**
   - AWS Secrets Manager integration for URI retrieval
   - Secure credential handling
   - Connection validation

4. **User Experience**
   - Clear status reporting
   - Progress indicators
   - Error messages and help
   - Same command-line interface as PowerShell version

#### Implementation Plan

```javascript
#!/usr/bin/env node
// scripts/switch-mode.js
// Cross-platform replacement for Toggle-MongoDbConnection.ps1

import { program } from 'commander';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// Command structure to match PowerShell script:
// node scripts/switch-mode.js [local|atlas]
// node scripts/switch-mode.js --show-current
// node scripts/switch-mode.js --no-restart
```

### Implementation Steps

#### Step 1: Basic Structure (Day 1)

1. Create `scripts/switch-mode.js` with commander.js for CLI
2. Implement environment file reading/writing
3. Add basic validation and help text
4. Test environment switching without Docker operations

#### Step 2: Docker Integration (Day 2)

1. Add Docker container management functions
2. Implement docker-compose profile switching
3. Add container health checking
4. Test local/atlas mode switching

#### Step 3: AWS Integration (Day 3)

1. Add AWS Secrets Manager integration
2. Implement secure Atlas URI retrieval
3. Add connection validation
4. Test Atlas mode with real credentials

#### Step 4: User Experience (Day 4)

1. Add progress indicators and status reporting
2. Implement banner and help functions
3. Add comprehensive error handling
4. Polish CLI interface

#### Step 5: Testing & Validation (Day 5)

1. Test all three deployment modes
2. Compare functionality with PowerShell version
3. Performance testing
4. Documentation updates

## Priority 2: Container Build Pipeline Enhancement

### Current PowerShell Script Analysis

The `PushAppTierContainer.ps1` script handles:

- Git SHA extraction for tagging
- ECR authentication
- Docker build with Lambda compatibility flags
- Multi-tag container pushing
- Lambda function updates

### GitHub Actions Integration Plan

#### Create `.github/workflows/container-build.yml`

```yaml
name: Container Build and Deploy
on:
  push:
    branches: [main, development]
    paths: ['app/**', 'Dockerfile']
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
      
      - name: Build and Push Container
        run: |
          npm run container:build
          npm run container:push
      
      - name: Deploy to Lambda
        run: npm run deploy:lambda
```

#### Create `scripts/push-container.js`

Replace `PushAppTierContainer.ps1` with Node.js equivalent:

```javascript
#!/usr/bin/env node
// scripts/push-container.js
// Cross-platform container build and push

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Features to implement:
// - Git SHA extraction
// - ECR authentication
// - Multi-tag docker builds
// - Lambda compatibility flags
// - Error handling and logging
```

### Implementation Steps

#### Step 1: Node.js Container Script (Day 1-2)

1. Create `scripts/push-container.js`
2. Implement Git SHA extraction
3. Add ECR authentication
4. Test container building and pushing

#### Step 2: GitHub Actions Integration (Day 3-4)

1. Create container build workflow
2. Add secrets management
3. Integrate with existing deploy scripts
4. Test automated deployments

#### Step 3: npm Scripts Integration (Day 5)

1. Add container management npm scripts
2. Update package.json with new commands
3. Test integration with existing workflows
4. Documentation updates

## Priority 3: npm Scripts Enhancement

### Add Missing npm Scripts to package.json

```json
{
  "scripts": {
    // Mode switching (replace PowerShell)
    "mode:switch": "node scripts/switch-mode.js",
    "mode:local": "node scripts/switch-mode.js local",
    "mode:atlas": "node scripts/switch-mode.js atlas",
    "mode:current": "node scripts/switch-mode.js --show-current",
    
    // Container operations (replace PowerShell)
    "container:build": "docker build --platform linux/amd64 --provenance=false --sbom=false -f app/Dockerfile -t mrb-app .",
    "container:push": "node scripts/push-container.js",
    "container:deploy": "npm run container:build && npm run container:push && npm run deploy:lambda",
    
    // Database operations (future - replace PowerShell backup scripts)
    "backup:create": "node scripts/backup-mongodb.js",
    "backup:restore": "node scripts/restore-mongodb.js",
    "backup:list": "node scripts/list-backups.js",
    
    // Validation and health checking
    "validate:all": "npm run validate:env && npm run validate:docker && npm run validate:aws",
    "validate:aws": "node scripts/aws-profile.js validate",
    "validate:docker": "docker-compose config",
    "validate:containers": "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'",
    
    // Development workflow shortcuts
    "dev:reset": "npm run stop && npm run setup:local && npm run start:local",
    "dev:clean": "docker system prune -f && npm run container:build",
    "dev:logs": "docker-compose logs -f --tail=100"
  }
}
```

## Week 1 Success Criteria

### By End of Week 1 (September 30, 2025)

- [x] `scripts/switch-mode.js` created and working ✅
- [x] MongoDB mode switching works without PowerShell ✅
- [x] Both old and new systems work in parallel ✅
- [ ] Container build pipeline enhanced with Node.js
- [x] npm scripts updated with new commands ✅
- [ ] Documentation updated for new workflows
- [ ] Team can test both old and new approaches

### Testing Checklist

- [x] Local mode switching works (`npm run mode:local`) ✅
- [x] Atlas mode switching works (`npm run mode:atlas`) ✅  
- [x] Current mode display works (`npm run mode:current`) ✅
- [x] Toggle functionality works (`npm run mode:toggle`) ✅
- [x] Help system works (`node scripts/switch-mode.js --help`) ✅
- [x] No-restart flag works (`--no-restart`) ✅
- [x] All three deployment modes functional ✅
- [x] PowerShell scripts still work as backup ✅
- [x] No production deployment disruption ✅

### Risk Mitigation Checklist

- [ ] PowerShell scripts preserved in original locations
- [ ] Rollback procedure documented and tested
- [ ] New scripts have comprehensive error handling
- [ ] Team trained on both old and new workflows
- [ ] Parallel testing completed successfully

## Week 1 Daily Tasks

### Tuesday (Day 1): Environment Management

- Morning: Create `scripts/switch-mode.js` basic structure
- Afternoon: Implement `.env` file reading/writing
- Evening: Test environment switching functionality

### Wednesday (Day 2): Docker Integration

- Morning: Add Docker container management to switch-mode.js
- Afternoon: Implement docker-compose profile switching
- Evening: Test local/atlas mode switching with containers

### Thursday (Day 3): AWS Integration

- Morning: Add AWS Secrets Manager integration
- Afternoon: Implement Atlas URI retrieval and validation
- Evening: Test Atlas mode with real credentials

### Friday (Day 4): Container Pipeline

- Morning: Create `scripts/push-container.js`
- Afternoon: Add npm scripts for container operations
- Evening: Test container build and push workflow

### Saturday (Day 5): Testing & Documentation

- Morning: Comprehensive testing of all new scripts
- Afternoon: Compare functionality with PowerShell versions
- Evening: Update documentation and team training

---

This implementation plan ensures a safe, gradual migration from PowerShell to Node.js while maintaining all existing functionality and providing clear rollback options.