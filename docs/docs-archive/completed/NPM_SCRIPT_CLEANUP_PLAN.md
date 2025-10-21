# NPM Script Cleanup Plan

## Current Issues
- **92 npm scripts** with lots of redundancy
- **Old mode system** (`mode:*`, `env:*`) conflicts with new profiles
- **Profile-specific UI commands** now unnecessary
- **Duplicate dev/start/stop commands** across profiles

## Proposed Cleanup

### ✅ Keep (Core Functionality)
```json
{
  // Core lifecycle
  "start": "npm run profile:start",
  "stop": "npm run profile:stop", 
  "restart": "npm run stop && npm run start",
  "test": "cd app && npm test",

  // Profile management (NEW - keep all)
  "profile:show": "node scripts/profile-manager.js show",
  "profile:list": "node scripts/profile-manager.js list", 
  "profile:set": "node scripts/profile-manager.js set",
  "profile:local": "node scripts/profile-manager.js set local",
  "profile:atlas": "node scripts/profile-manager.js set atlas",
  "profile:lambda": "node scripts/profile-manager.js set lambda", 
  "profile:cloud": "node scripts/profile-manager.js set cloud",
  "profile:validate": "node scripts/profile-manager.js validate",
  "profile:start": "node scripts/profile-manager.js start",
  "profile:stop": "node scripts/profile-manager.js stop",

  // Development (SIMPLIFIED)
  "dev": "npm run profile:start && npm run ui:dev",
  "dev:backend": "npm run profile:start",
  "dev:full": "concurrently \"npm run profile:start\" \"npm run ui:dev\"",

  // UI (SIMPLIFIED - profile-agnostic)
  "ui:dev": "cd ui && npm run dev",
  "ui:build": "cd ui && npm run build", 
  "ui:preview": "cd ui && npm run preview",

  // Database
  "db:test": "node db-test.js",

  // Testing
  "test:all": "npm run test:local && npm run test:atlas && npm run test:lambda",
  "test:local": "npm run profile:local && npm run profile:start && sleep 10 && npm run test && npm run stop", 
  "test:atlas": "npm run profile:atlas && npm run profile:start && sleep 10 && npm run test && npm run stop",
  "test:lambda": "node scripts/test-lambda.js mrb-app-api",
  "test:lambda:safe": "node scripts/test-lambda.js mrb-app-api",
  "test:lambda:invoke": "node scripts/test-lambda.js mrb-app-api --invoke",
  "test:data": "node scripts/add-test-data.js",
  "test:data:recipe": "node scripts/add-test-data.js --type=recipe",
  "test:data:shopping": "node scripts/add-test-data.js --type=shopping",

  // Deployment
  "deploy:lambda": "node scripts/deploy-lambda.js",
  "deploy:lambda:prod": "node scripts/deploy-lambda.js --image-tag production",
  "deploy:ui": "node scripts/deploy-ui.js",
  "deploy:ui:prod": "node scripts/deploy-ui.js --prod",
  "deploy:full:dev": "npm run deploy:lambda && npm run deploy:ui",
  "deploy:full:prod": "npm run deploy:lambda:prod && npm run deploy:ui:prod",

  // Build
  "build": "cd app && docker build -t mrb-app .",
  "build:lambda": "cd app && docker build -f Dockerfile -t mrb-app-lambda .",
  "build:container": "node scripts/build-container.js",
  "build:push": "node scripts/build-container.js --update-lambda",

  // Backup/Restore
  "backup:local": "node scripts/backup-mongodb.js --type local", 
  "backup:atlas": "node scripts/backup-mongodb.js --type atlas --s3-upload",
  "backup:full": "node scripts/backup-mongodb.js --type full --s3-upload",
  "restore:from-s3": "node scripts/restore-mongodb.js --from-s3",
  "restore:latest": "node scripts/restore-mongodb.js --latest",

  // Maintenance  
  "maintenance:find-orphans": "node scripts/find-orphan-images.js",
  "health": "curl -s http://localhost:3000/health",
  "health:detailed": "curl -s http://localhost:3000/health/detailed",
  "validate": "node scripts/setup-environment.js validate",
  "logs": "docker-compose logs -f",
  "logs:app": "docker-compose logs -f app-local app-atlas",

  // AWS/Infrastructure
  "aws:mrb-api": "node scripts/aws-profile.js mrb-api", 
  "aws:status": "node scripts/aws-profile.js status",
  "setup": "node scripts/setup-environment.js validate && cp .env.example .env && echo '✅ Environment file created.'"
}
```

### ❌ Remove (Redundant with Profiles)
```json
{
  // OLD MODE SYSTEM (replaced by profiles)
  "mode:show": "REDUNDANT - use profile:show",
  "mode:local": "REDUNDANT - use profile:local", 
  "mode:atlas": "REDUNDANT - use profile:atlas",
  "mode:lambda": "REDUNDANT - use profile:lambda",
  "mode:switch": "REDUNDANT - use profile:set",
  "mode:current": "REDUNDANT - use profile:show",
  "mode:toggle": "REDUNDANT - use profile:set",
  "mode:cleanup": "REDUNDANT - use profile:stop",

  // OLD ENV SYSTEM (replaced by profiles)
  "env:local": "REDUNDANT - profiles handle env automatically",
  "env:atlas": "REDUNDANT - profiles handle env automatically", 
  "env:lambda": "REDUNDANT - profiles handle env automatically",

  // OLD DEV SYSTEM (replaced by unified dev)
  "dev:local": "REDUNDANT - use profile:local && dev",
  "dev:atlas": "REDUNDANT - use profile:atlas && dev", 
  "dev:lambda": "REDUNDANT - use profile:lambda && dev",

  // OLD START/STOP SYSTEM (replaced by profile:start/stop)
  "start:local": "REDUNDANT - use profile:local && profile:start",
  "start:atlas": "REDUNDANT - use profile:atlas && profile:start", 
  "start:lambda-local": "REDUNDANT - use profile:lambda",
  "stop:all": "REDUNDANT - use profile:stop",

  // PROFILE-SPECIFIC UI (ui now reads current profile automatically)
  "ui:dev:local": "REDUNDANT - ui:dev reads current profile",
  "ui:dev:atlas": "REDUNDANT - ui:dev reads current profile",
  "ui:dev:lambda": "REDUNDANT - ui:dev reads current profile", 
  "ui:build:local": "REDUNDANT - ui:build reads current profile",
  "ui:build:atlas": "REDUNDANT - ui:build reads current profile",
  "ui:build:lambda": "REDUNDANT - ui:build reads current profile",
  "ui:build:production": "REDUNDANT - use ui:build with cloud profile",
  "ui:preview:local": "REDUNDANT - ui:preview reads current profile",
  "ui:preview:atlas": "REDUNDANT - ui:preview reads current profile", 
  "ui:preview:lambda": "REDUNDANT - ui:preview reads current profile",

  // REDUNDANT FULLSTACK (replaced by dev:full)
  "fullstack:local": "REDUNDANT - use profile:local && dev:full",
  "fullstack:atlas": "REDUNDANT - use profile:atlas && dev:full",

  // LESS USED COMMANDS  
  "deploy:ui:dev": "REDUNDANT - same as deploy:ui",
  "deploy:ui:dry-run": "RARELY USED",
  "deploy:ui:skip-build": "RARELY USED", 
  "deploy:dry-run": "RARELY USED",
  "build:dry-run": "RARELY USED",
  "backup:archive": "RARELY USED",
  "backup:dry-run": "RARELY USED", 
  "restore:from-local": "RARELY USED",
  "restore:dry-run": "RARELY USED",
  "validate:env": "REDUNDANT - same as validate",
  "validate:docker": "RARELY USED",
  "aws:terraform": "RARELY USED",
  "aws:toggle": "RARELY USED", 
  "aws:validate": "RARELY USED",
  "iam:setup": "RARELY USED",
  "iam:status": "RARELY USED",
  "tunnel:start": "RARELY USED", 
  "tunnel:stop": "RARELY USED",
  "tunnel:status": "RARELY USED",
  "setup:local": "REDUNDANT - use profile:local",
  "setup:atlas": "REDUNDANT - use profile:atlas",
  "setup:lambda": "REDUNDANT - use profile:lambda",
  "maintenance:find-orphans:show-commands": "RARELY USED",
  "logs:db": "RARELY USED"
}
```

## Benefits of Cleanup
- **92 scripts → ~40 scripts** (56% reduction)
- **Clear profile-based workflow** 
- **Eliminate mode/env confusion**
- **Simpler onboarding** for new developers
- **Consistent naming** across all commands

## Migration Strategy
1. **Phase 1**: Add deprecation warnings to old commands
2. **Phase 2**: Update documentation to use new commands  
3. **Phase 3**: Remove deprecated commands after transition period

Would you like me to implement this cleanup?