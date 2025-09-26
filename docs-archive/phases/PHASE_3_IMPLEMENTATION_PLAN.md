# Phase 3: PowerShell Script Audit & Migration Plan

## Executive Summary

**Current State**: 76 PowerShell scripts identified  
**Phase 2 Status**: ✅ COMPLETE - Node.js tooling implemented  
**Phase 3 Goal**: Safely migrate remaining critical PowerShell scripts to cross-platform alternatives

## PowerShell Script Inventory & Risk Assessment

### Critical Scripts - Daily Use (Migrate First)

These are used regularly and should be prioritized for migration:

| Script | Function | Risk Level | Migration Status | Node.js Alternative |
|--------|----------|------------|------------------|---------------------|
| `Toggle-MongoDbConnection.ps1` | MongoDB mode switching | **HIGH** | ❌ TO DO | `scripts/switch-mode.js` (needs creation) |
| `Deploy-Lambda.ps1` | Lambda deployment | **HIGH** | ✅ DONE | `scripts/deploy-lambda.js` (exists) |
| `Test-Lambda.ps1` | Lambda testing | **MEDIUM** | ✅ DONE | `scripts/test-lambda.js` (exists) |
| `PushAppTierContainer.ps1` | Container builds/pushes | **HIGH** | ❌ TO DO | GitHub Actions + npm scripts |
| `StartDbTunnel.ps1` | SSH tunnel to bastion | **MEDIUM** | ✅ DONE | `scripts/db-tunnel.js` (exists) |

### Medium Priority - Infrastructure Scripts (Migrate Second)

Used for infrastructure management and maintenance:

| Script | Function | Risk Level | Migration Status | Action Plan |
|--------|----------|------------|------------------|-------------|
| `set-aws-profile-mrbapi.ps1` | AWS profile management | **MEDIUM** | ✅ DONE | `scripts/aws-profile.js` (exists) |
| `toggle-aws-profile.ps1` | AWS profile switching | **MEDIUM** | ✅ DONE | `scripts/aws-profile.js` (exists) |
| `Backup-MongoDBToS3.ps1` | Database backups | **MEDIUM** | ❌ TO DO | Convert to Node.js |
| `Restore-MongoDBFromS3.ps1` | Database restore | **MEDIUM** | ❌ TO DO | Convert to Node.js |
| `Get-MongoAtlasUri.ps1` | Atlas URI retrieval | **LOW** | ❌ TO DO | Integrate into environment setup |

### Low Priority - Utility & Analysis Scripts (Keep or Modernize Later)

Used occasionally or for specific analysis tasks:

| Category | Scripts | Count | Risk Level | Action Plan |
|----------|---------|-------|------------|-------------|
| **Orphan Image Analysis** | `Find-OrphanImages*.ps1` | 4 | LOW | Keep for now - specialized tooling |
| **Local Database Management** | `local_db/*.ps1` | 5 | LOW | Convert to npm scripts |
| **Testing & Analysis** | `Test-MongoDB*.ps1` | 3 | LOW | Convert to Node.js |
| **Infrastructure Analysis** | `DumpIt.ps1`, `ScanDependencies.ps1` | 2 | LOW | Keep as utilities |
| **Admin Utilities** | `get-postman-token.ps1` | 1 | LOW | Keep specialized |

### Legacy Scripts - Old/Redundant (Safe to Archive)

Multiple versions of the same functionality:

| Pattern | Examples | Count | Action |
|---------|----------|-------|--------|
| **Duplicate Analysis** | `Find-OrphanImages-{Simple,Final,Clean}.ps1` | 3 | Archive duplicates, keep one |
| **Fixed Versions** | `Restore-MongoDBFromS3-Fixed.ps1` | 1 | Replace original, remove -Fixed |
| **Test Data** | `add_test_shopping_items.ps1` | 1 | Convert to Node.js or archive |

## Phase 3 Migration Strategy

### Week 1-2: Critical Script Migration

1. **MongoDB Mode Switching** - Replace `Toggle-MongoDbConnection.ps1`
   - Create `scripts/switch-mode.js` with same functionality
   - Integrate with existing npm scripts (`npm run env:*`)
   - Add Docker container management
   - Ensure backward compatibility during transition

2. **Container Build Pipeline** - Replace `PushAppTierContainer.ps1`
   - Create GitHub Actions workflow for container builds
   - Integrate with existing `scripts/deploy-lambda.js`
   - Add npm scripts for local container operations

### Week 3: Infrastructure Scripts Migration

1. **Database Management** - Convert backup/restore scripts
   - Create `scripts/backup-mongodb.js`
   - Create `scripts/restore-mongodb.js`
   - Integrate S3 operations with AWS SDK
   - Add npm scripts for database operations

2. **Environment Management** - Enhance existing setup
   - Extend `scripts/setup-environment.js` to handle Atlas URI
   - Integrate MongoDB connection validation
   - Add health checking integration

### Week 4: Validation & Testing

1. **Parallel Testing** - Run old and new systems side-by-side
2. **Performance Comparison** - Ensure new scripts are as fast or faster
3. **Documentation Update** - Update all documentation
4. **Team Training** - Ensure team knows new workflows

### Week 5: Cleanup & Finalization

1. **Archive Old Scripts** - Move PowerShell scripts to `scripts/legacy/`
2. **Update CI/CD** - Ensure all automation uses new scripts
3. **Final Testing** - Comprehensive testing of all modes
4. **Documentation** - Complete Phase 3 documentation

## Implementation Plan - Week 1 Actions

### Action 1: Create MongoDB Mode Switcher

Create `scripts/switch-mode.js` to replace `Toggle-MongoDbConnection.ps1`:

```javascript
// Replace Toggle-MongoDbConnection.ps1 with cross-platform Node.js
// Features needed:
// - Read/write .env file
// - Handle local/atlas mode switching
// - Docker container management
// - Health checking integration
// - Atlas URI retrieval from AWS Secrets
```

### Action 2: Enhance Container Build Pipeline

Update existing GitHub Actions or create new ones:

- Replace `PushAppTierContainer.ps1` functionality
- Integrate with existing `deploy-lambda.js`
- Add proper tagging and versioning

### Action 3: Add Missing npm Scripts

```json
{
  "mode:switch": "node scripts/switch-mode.js",
  "mode:local": "node scripts/switch-mode.js local",
  "mode:atlas": "node scripts/switch-mode.js atlas", 
  "mode:current": "node scripts/switch-mode.js --show-current",
  "container:build": "docker build -f app/Dockerfile -t mrb-app .",
  "container:push": "node scripts/push-container.js",
  "backup:create": "node scripts/backup-mongodb.js",
  "backup:restore": "node scripts/restore-mongodb.js"
}
```

## Safety Measures

### Parallel Operation Period

- Keep all PowerShell scripts functional for 4 weeks
- Create `scripts/legacy/` folder for old scripts
- Document rollback procedures for each migration
- Test new scripts extensively before deprecating old ones

### Validation Process

1. **Unit Testing**: Each new Node.js script individually tested
2. **Integration Testing**: Test with all three deployment modes
3. **Performance Testing**: Ensure no degradation in deployment times
4. **User Acceptance**: Team validation of new workflows

### Risk Mitigation

- **Gradual Migration**: One script category at a time
- **Rollback Plans**: Keep PowerShell scripts as backup
- **Documentation**: Comprehensive migration documentation
- **Team Training**: Ensure everyone understands new processes

## Success Metrics

### Technical Metrics

- [ ] All critical PowerShell scripts have Node.js equivalents
- [ ] All three deployment modes work with new scripts
- [ ] Deployment time improved or maintained
- [ ] Zero production incidents during migration
- [ ] 100% test coverage for new scripts

### Team Metrics

- [ ] Team can use new scripts without referring to documentation
- [ ] New developer onboarding time reduced
- [ ] Developer satisfaction with new tooling
- [ ] Reduced support requests for deployment issues

## Next Immediate Actions

### This Week (September 24-30, 2025)

1. **Create `scripts/switch-mode.js`** - Replace Toggle-MongoDbConnection.ps1
2. **Test parallel operation** - Ensure both old and new work
3. **Update documentation** - Document new npm scripts
4. **Team review** - Get feedback on approach

### Week of October 1, 2025

1. **Container build migration** - Replace PushAppTierContainer.ps1
2. **GitHub Actions enhancement** - Integrate container builds
3. **Database scripts** - Start backup/restore migration
4. **Comprehensive testing** - All three deployment modes

---

## Expected Phase 3 Outcome

**By end of Phase 3 (5 weeks from now):**

- ✅ Zero daily-use PowerShell scripts remaining
- ✅ All deployment workflows use Node.js/npm scripts
- ✅ Cross-platform development support (Windows/macOS/Linux)
- ✅ Integrated with existing GitHub Actions CI/CD
- ✅ Comprehensive testing and validation
- ✅ Team trained on new workflows
- ✅ Documentation fully updated

**Success Criteria Met When:**

- New developer can deploy in all three modes using only npm scripts
- No PowerShell knowledge required for daily development tasks
- All critical functionality maintained or improved
- Zero production deployment issues

---

*This audit provides a clear, safe path forward for Phase 3 while preserving all current functionality and ensuring zero disruption to ongoing development work.*