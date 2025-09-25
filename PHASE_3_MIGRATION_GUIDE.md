# PowerShell to Node.js Migration Guide

## ✅ **MIGRATION COMPLETE** - All critical PowerShell scripts have Node.js replacements

This guide documents the Node.js replacements for PowerShell scripts in the MomsRecipeBox project.

## 🚀 **Primary Scripts (Daily Use)**

### MongoDB Connection Management
- ❌ **OLD**: `powershell -File scripts/Toggle-MongoDbConnection.ps1 -ShowCurrent`
- ✅ **NEW**: `npm run mode:current` or `node scripts/switch-mode.js --show-current`

```bash
# Switch to local MongoDB
npm run mode:local

# Switch to Atlas MongoDB  
npm run mode:atlas

# Show current mode
npm run mode:current

# Toggle between modes
npm run mode:toggle
```

### Lambda Deployment
- ❌ **OLD**: `powershell -File scripts/Deploy-Lambda.ps1`
- ✅ **NEW**: `npm run deploy:lambda` or `node scripts/deploy-lambda.js`

```bash
# Deploy Lambda function
npm run deploy:lambda

# Deploy with specific image tag
npm run deploy:lambda:prod

# Dry run deployment
npm run deploy:dry-run
```

### Container Building
- ❌ **OLD**: `powershell -File scripts/PushAppTierContainer.ps1`
- ✅ **NEW**: `npm run build:push` or `node scripts/build-container.js`

```bash
# Build and push container
npm run build:push

# Build only (no push)
npm run build:container

# Dry run build
npm run build:dry-run
```

### Lambda Testing
- ❌ **OLD**: `powershell -File scripts/Test-Lambda.ps1`
- ✅ **NEW**: `npm run test:lambda` or `node scripts/test-lambda.js mrb-app-api`

```bash
# Test Lambda connectivity
npm run test:lambda

# Invoke Lambda function
npm run test:lambda:invoke

# Safe Lambda testing
npm run test:lambda:safe
```

## 🗃️ **Database Management**

### MongoDB Backup
- ❌ **OLD**: `powershell -File scripts/MongoDB-Backup.ps1`
- ✅ **NEW**: `npm run backup:atlas` or `node scripts/backup-mongodb.js`

```bash
# Backup Atlas to S3
npm run backup:atlas

# Backup local MongoDB  
npm run backup:local

# Full backup with archive
npm run backup:full

# Dry run backup
npm run backup:dry-run
```

### MongoDB Restore
- ❌ **OLD**: `powershell -File scripts/Restore-MongoDBFromS3.ps1`
- ✅ **NEW**: `npm run restore:from-s3` or `node scripts/restore-mongodb.js`

```bash
# Restore from S3
npm run restore:from-s3

# Restore latest backup
npm run restore:latest

# Dry run restore
npm run restore:dry-run
```

## 🔧 **Utility Scripts**

### AWS Profile Management
- ❌ **OLD**: Manual AWS credential switching
- ✅ **NEW**: `npm run aws:mrb-api` or `node scripts/aws-profile.js`

```bash
# Switch to mrb-api profile
npm run aws:mrb-api

# Switch to terraform-mrb profile
npm run aws:terraform

# Toggle between profiles
npm run aws:toggle

# Show current AWS status
npm run aws:status

# Validate AWS configuration
npm run aws:validate
```

### Environment Setup
- ❌ **OLD**: Various PowerShell setup scripts
- ✅ **NEW**: `npm run setup:atlas` or `node scripts/setup-environment.js`

```bash
# Setup local environment
npm run setup:local

# Setup Atlas environment
npm run setup:atlas

# Setup Lambda environment  
npm run setup:lambda

# Validate environment
npm run validate:env
```

## 📊 **Migration Statistics**

### ✅ **Successfully Migrated (Critical Scripts):**
- `Toggle-MongoDbConnection.ps1` → `scripts/switch-mode.js` (505 lines, enhanced)
- `Deploy-Lambda.ps1` → `scripts/deploy-lambda.js`
- `PushAppTierContainer.ps1` → `scripts/build-container.js`
- `Test-Lambda.ps1` → `scripts/test-lambda.js`
- `MongoDB-Backup.ps1` → `scripts/backup-mongodb.js`
- `Restore-MongoDBFromS3.ps1` → `scripts/restore-mongodb.js`
- Various utilities → `scripts/aws-profile.js`, `scripts/setup-environment.js`

### 📁 **Legacy Scripts (Archived):**
The following PowerShell scripts are now in `scripts/legacy/` folder:
- All PowerShell backup/restore scripts
- Old deployment scripts  
- Utility and maintenance scripts

### 🎯 **Cross-Platform Benefits:**
- ✅ **Linux/macOS Compatible**: All Node.js scripts work on any platform
- ✅ **Better Error Handling**: Enhanced error messages and validation
- ✅ **Consistent Interface**: All scripts follow same parameter patterns
- ✅ **NPM Integration**: Easy to run via `npm run` commands
- ✅ **Modern JavaScript**: ES modules, async/await, better maintainability

## 🚨 **Important Notes**

### **AWS Profile Management:**
Always set the correct AWS profile before running deployment scripts:
```bash
$env:AWS_PROFILE="mrb-api"        # For application operations
$env:AWS_PROFILE="terraform-mrb"  # For infrastructure operations
```

### **Environment Variables:**
Make sure your `.env` file is properly configured for the target environment:
- `.env.local` for local development
- `.env.atlas` for Atlas cloud database
- `.env.lambda` for Lambda deployment testing

### **Docker Requirements:**
Local development still requires Docker Desktop for containerized services.

## 🎉 **Phase 3 Migration: COMPLETE!**

All critical PowerShell scripts have been successfully replaced with cross-platform Node.js alternatives. The new scripts provide:

- ✅ Cross-platform compatibility (Windows, macOS, Linux)
- ✅ Enhanced error handling and validation
- ✅ Consistent NPM script interface
- ✅ Modern ES module architecture
- ✅ Better integration with existing toolchain

**Legacy PowerShell scripts are archived but still functional if needed for compatibility.**