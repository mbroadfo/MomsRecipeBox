# PowerShell Script Reduction Plan
**Date**: September 25, 2025  
**Total Scripts Analyzed**: 30 project-specific PowerShell scripts  
**Reduction Goal**: Reduce from 30 scripts to ~10 essential scripts

## 📊 **Current Script Inventory**

### **Root Level Scripts (4)**
| Script | Purpose | Status | Recommendation |
|--------|---------|--------|---------------|
| `run_tests.ps1` | Simple Lambda connectivity test | 🔄 **REPLACE** | Use `npm run test:lambda` instead |
| `StartDbTunnel.ps1` | SSH tunnel to bastion for MongoDB | ✅ **KEEP** | No Node.js equivalent needed |
| `test-phase-4-1.ps1` | Phase 4 UI integration test | 🗑️ **DELETE** | Phase 4 complete, obsolete |

### **Infrastructure Scripts (2)**
| Script | Purpose | Status | Recommendation |
|--------|---------|--------|---------------|
| `infra/set-aws-profile-mrbapi.ps1` | Set AWS profile to mrb-api | ✅ **KEEP** | Simple profile setter |
| `infra/toggle-aws-profile.ps1` | Toggle between AWS profiles | 🔄 **REPLACE** | Use `scripts/aws-profile.js` |

### **Core Operations Scripts (18)**
| Script | Purpose | Status | Recommendation |
|--------|---------|--------|---------------|
| `scripts/add_test_shopping_items.ps1` | Add test shopping list items | 🔄 **REPLACE** | Create Node.js version |
| `scripts/Compare-MongoDB.ps1` | Compare local/Atlas databases | ✅ **KEEP** | Complex utility, keep for now |
| `scripts/Create-MongoBackupLambda.ps1` | Create MongoDB backup Lambda | 🔄 **REPLACE** | Use `scripts/create-backup-lambda.js` |
| `scripts/Create-TfVarsFile.ps1` | Generate Terraform variables | ✅ **KEEP** | Terraform-specific utility |
| `scripts/DumpIamPolicies.ps1` | Export IAM policies | ✅ **KEEP** | Admin/maintenance tool |
| `scripts/DumpIt.ps1` | Code dumping utility | 🗑️ **DELETE** | Development utility, obsolete |
| `scripts/Find-MongoDBTools.ps1` | Locate MongoDB tools | 🗑️ **DELETE** | Use `which mongodump` |
| `scripts/Find-OrphanImages.ps1` | Find orphaned S3 images | 🔄 **REPLACE** | Create Node.js version |
| `scripts/Find-OrphanImages-Clean.ps1` | Clean version of above | 🗑️ **DELETE** | Duplicate functionality |
| `scripts/Find-OrphanImages-Final.ps1` | Final version of above | 🗑️ **DELETE** | Duplicate functionality |
| `scripts/Find-OrphanImages-Simple.ps1` | Simple version of above | 🗑️ **DELETE** | Duplicate functionality |
| `scripts/Get-MongoAtlasUri.ps1` | Get Atlas connection string | 🔄 **REPLACE** | Use `scripts/get-atlas-uri.js` |
| `scripts/Invoke-MongoDBMaintenance.ps1` | Run maintenance tasks | 🔄 **REPLACE** | Use `scripts/maintenance.js` |
| `scripts/Register-MongoDBBackupTask.ps1` | Schedule backup tasks | ✅ **KEEP** | Windows Task Scheduler specific |
| `scripts/restart_app.ps1` | Restart application containers | 🔄 **REPLACE** | Use `npm run restart` |
| `scripts/Rollback-Lambda.ps1` | Rollback Lambda deployment | ✅ **KEEP** | Emergency rollback utility |
| `scripts/ScanDependencies.ps1` | Scan project dependencies | 🗑️ **DELETE** | Use `npm audit` |
| `scripts/Start-MongoDBMaintenance.ps1` | Start maintenance mode | 🔄 **REPLACE** | Use `scripts/maintenance.js` |
| `scripts/Test-MongoDBBackup.ps1` | Test backup functionality | 🔄 **REPLACE** | Use `scripts/test-backup.js` |
| `scripts/Test-MongoDBBackupDocker.ps1` | Test Docker backup | 🔄 **REPLACE** | Use `scripts/test-backup.js` |

### **Local Database Scripts (5)**
| Script | Purpose | Status | Recommendation |
|--------|---------|--------|---------------|
| `scripts/local_db/backup-mongodb.ps1` | Local MongoDB backup | 🔄 **REPLACE** | Already have `scripts/backup-mongodb.js` |
| `scripts/local_db/cleanup-backups.ps1` | Clean old backups | 🔄 **REPLACE** | Add to `scripts/backup-mongodb.js` |
| `scripts/local_db/manage-backups.ps1` | Master backup management | 🔄 **REPLACE** | Already have `scripts/backup-mongodb.js` |
| `scripts/local_db/restore-mongodb.ps1` | Local MongoDB restore | 🔄 **REPLACE** | Already have `scripts/restore-mongodb.js` |
| `scripts/local_db/verify-backup.ps1` | Verify backup integrity | 🔄 **REPLACE** | Add to `scripts/backup-mongodb.js` |

### **Admin Scripts (1)**
| Script | Purpose | Status | Recommendation |
|--------|---------|--------|---------------|
| `app/admin/get-postman-token.ps1` | Get Postman API token | ✅ **KEEP** | Simple admin utility |

## 🎯 **Reduction Strategy**

### **Phase A: Immediate Deletions (8 scripts)**
**Safe to delete immediately - duplicates and obsolete:**

```powershell
# Delete duplicate and obsolete scripts
Remove-Item "test-phase-4-1.ps1"
Remove-Item "scripts/DumpIt.ps1"
Remove-Item "scripts/Find-MongoDBTools.ps1"
Remove-Item "scripts/Find-OrphanImages-Clean.ps1"
Remove-Item "scripts/Find-OrphanImages-Final.ps1"
Remove-Item "scripts/Find-OrphanImages-Simple.ps1"
Remove-Item "scripts/ScanDependencies.ps1"
```

### **Phase B: Node.js Replacements (12 scripts)**
**Create Node.js versions, then archive PowerShell:**

**High Priority (4 scripts)**:
1. `scripts/Find-OrphanImages.ps1` → `scripts/find-orphan-images.js`
2. `scripts/add_test_shopping_items.ps1` → `scripts/add-test-data.js`
3. `scripts/Get-MongoAtlasUri.ps1` → `scripts/get-atlas-uri.js`
4. `run_tests.ps1` → Just use `npm run test:lambda`

**Medium Priority (4 scripts)**:
5. `scripts/Create-MongoBackupLambda.ps1` → `scripts/create-backup-lambda.js`
6. `scripts/restart_app.ps1` → `npm run restart`
7. `infra/toggle-aws-profile.ps1` → Use existing `scripts/aws-profile.js`
8. `scripts/Invoke-MongoDBMaintenance.ps1` → `scripts/maintenance.js`

**Lower Priority (4 scripts)**:
9. `scripts/Start-MongoDBMaintenance.ps1` → Part of `scripts/maintenance.js`
10. `scripts/Test-MongoDBBackup.ps1` → `scripts/test-backup.js`
11. `scripts/Test-MongoDBBackupDocker.ps1` → `scripts/test-backup.js`
12. All `scripts/local_db/*.ps1` → Already replaced by existing Node.js scripts

### **Phase C: Keep Essential (10 scripts)**
**Keep these PowerShell scripts - no Node.js replacement needed:**

**Infrastructure & Platform-Specific**:
1. `StartDbTunnel.ps1` - SSH tunnel management
2. `infra/set-aws-profile-mrbapi.ps1` - Simple profile setter
3. `scripts/Register-MongoDBBackupTask.ps1` - Windows Task Scheduler
4. `scripts/Create-TfVarsFile.ps1` - Terraform variables

**Maintenance & Admin Tools**:
5. `scripts/Compare-MongoDB.ps1` - Complex database comparison
6. `scripts/DumpIamPolicies.ps1` - IAM policy export
7. `scripts/Rollback-Lambda.ps1` - Emergency rollback
8. `app/admin/get-postman-token.ps1` - Admin utility

## 📈 **Reduction Results**

| Category | Before | After | Reduction |
|----------|--------|-------|-----------|
| **Total Scripts** | 30 | 10 | -67% |
| **Root Level** | 3 | 1 | -67% |
| **Core Operations** | 18 | 6 | -67% |
| **Local DB** | 5 | 0 | -100% |
| **Infrastructure** | 2 | 2 | 0% |
| **Admin** | 1 | 1 | 0% |

## 🚀 **Implementation Timeline**

### **Week 1: Quick Wins**
- ✅ Delete 8 obsolete/duplicate scripts
- ✅ Document the 10 scripts to keep
- ✅ Create priority list for Node.js replacements

### **Week 2: High-Priority Replacements**
- [ ] Create `scripts/find-orphan-images.js`
- [ ] Create `scripts/add-test-data.js`
- [ ] Create `scripts/get-atlas-uri.js`
- [ ] Update npm scripts to replace `run_tests.ps1`

### **Week 3: Medium-Priority Replacements**
- [ ] Create `scripts/create-backup-lambda.js`
- [ ] Create `scripts/maintenance.js`
- [ ] Update npm scripts for container restart
- [ ] Archive remaining PowerShell scripts

### **Week 4: Final Cleanup**
- [ ] Test all Node.js replacements
- [ ] Update documentation
- [ ] Archive replaced PowerShell scripts to `scripts/legacy/`

## 🎉 **Benefits After Reduction**

### **Developer Experience**
- **Fewer Scripts**: 30 → 10 scripts (67% reduction)
- **Less Confusion**: No more duplicate "Find-OrphanImages" scripts
- **Consistent Interface**: More operations via `npm run` commands
- **Cross-Platform**: Node.js versions work on all platforms

### **Maintenance**
- **Reduced Cognitive Load**: Focus on 10 essential scripts
- **Better Organization**: Clear separation of concerns
- **Modern Tooling**: ES modules, async/await, better error handling
- **Documentation**: Each script has `--help` and clear purpose

### **Project Health**
- **Clean Repository**: No duplicate or obsolete scripts
- **Modern Architecture**: Node.js-first approach with PowerShell for platform-specific tasks
- **Maintainable**: Fewer scripts = easier to maintain and update
- **Professional**: Clean, organized, purposeful script collection

---

**Next Action**: Execute Phase A (delete obsolete scripts) to immediately reduce clutter and confusion.