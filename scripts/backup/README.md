# MongoDB Backup & Restore Strategy
## Mom's Recipe Box Critical Data Management

This directory contains scripts and documentation for backing up and restoring your MongoDB database. Your recipe data has evolved far beyond the initial JSON documents and now contains critical family recipes, user interactions, favorites, and shopping lists that deserve enterprise-grade protection.

## 📊 Current Database Profile

- **Collections**: recipes, favorites, comments, shopping_lists, users
- **Data Volume**: ~100KB with 109 documents across 5 collections
- **Growth Potential**: High - family recipes, AI-generated content, user interactions
- **Criticality**: HIGH - irreplaceable family recipes and user data

## 🛡️ Backup Strategy Overview

### Multi-Tiered Approach
1. **Hot Backups** - Scheduled automated backups with minimal downtime
2. **Cold Backups** - Complete dumps for disaster recovery
3. **Incremental Backups** - Change-based backups for efficiency
4. **Cloud Backups** - Off-site storage for maximum protection

### Backup Types Implemented

| Type | Frequency | Purpose | Retention |
|------|-----------|---------|-----------|
| **Full Dump** | Daily | Complete database snapshot | 30 days |
| **Incremental** | Every 4 hours | Changed documents only | 7 days |
| **Weekly Archive** | Weekly | Long-term storage | 1 year |
| **Pre-deployment** | On-demand | Before major changes | Until verified |

## 📁 Directory Structure

```
scripts/backup/
├── README.md                    # This documentation
├── backup-mongodb.ps1          # Main backup orchestration script
├── restore-mongodb.ps1          # Main restore orchestration script
├── incremental-backup.ps1       # Change-based backup script
├── verify-backup.ps1            # Backup integrity verification
├── cleanup-backups.ps1          # Automated cleanup of old backups
├── backup-config.json           # Configuration settings
└── templates/
    ├── cron-setup.md           # Scheduled backup setup
    └── cloud-sync.ps1          # Cloud storage synchronization
```

## 🚀 Quick Start

### 1. First-Time Setup
```powershell
# Run from project root
.\scripts\backup\backup-mongodb.ps1 -Type "setup"
```

### 2. Create Full Backup
```powershell
.\scripts\backup\backup-mongodb.ps1 -Type "full"
```

### 3. Restore from Backup
```powershell
.\scripts\backup\restore-mongodb.ps1 -BackupPath "backups\2025-09-08\full"
```

## 📋 Available Scripts

### Primary Scripts

#### `backup-mongodb.ps1`
Main backup orchestration script with multiple backup types.

**Parameters:**
- `-Type` - Backup type: "full", "incremental", "archive", "setup"
- `-Destination` - Custom backup location
- `-Compress` - Enable compression (default: true)
- `-Verify` - Verify backup after creation (default: true)

**Examples:**
```powershell
# Full backup with verification
.\backup-mongodb.ps1 -Type "full" -Verify

# Incremental backup to custom location
.\backup-mongodb.ps1 -Type "incremental" -Destination "E:\Backups"

# Archive backup with compression
.\backup-mongodb.ps1 -Type "archive" -Compress
```

#### `restore-mongodb.ps1`
Comprehensive restore script with safety checks.

**Parameters:**
- `-BackupPath` - Path to backup to restore
- `-DatabaseName` - Target database name (default: from config)
- `-DryRun` - Preview restore without executing
- `-Force` - Skip confirmation prompts

**Examples:**
```powershell
# Interactive restore with safety checks
.\restore-mongodb.ps1 -BackupPath "backups\2025-09-08\full"

# Dry run to preview restore
.\restore-mongodb.ps1 -BackupPath "backups\latest" -DryRun

# Force restore to different database
.\restore-mongodb.ps1 -BackupPath "backups\archive\weekly-2025-09-01" -DatabaseName "moms_recipe_box_test" -Force
```

### Utility Scripts

#### `incremental-backup.ps1`
Efficient change-based backups using MongoDB change streams.

#### `verify-backup.ps1`
Validates backup integrity and completeness.

#### `cleanup-backups.ps1`
Removes old backups based on retention policies.

## ⚙️ Configuration

### Environment Variables
Add to your `.env` file:
```bash
# Backup Configuration
BACKUP_ROOT_PATH=./backups
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=true
BACKUP_VERIFICATION=true
BACKUP_CLOUD_SYNC=false

# Cloud Storage (Optional)
BACKUP_CLOUD_PROVIDER=aws-s3
BACKUP_CLOUD_BUCKET=momsrecipebox-backups
BACKUP_CLOUD_REGION=us-east-1
```

### Backup Configuration (`backup-config.json`)
```json
{
  "database": {
    "name": "moms_recipe_box",
    "host": "localhost",
    "port": 27017,
    "auth": {
      "username": "admin",
      "password": "supersecret",
      "authSource": "admin"
    }
  },
  "backup": {
    "rootPath": "./backups",
    "retention": {
      "full": 30,
      "incremental": 7,
      "archive": 365
    },
    "compression": true,
    "verification": true,
    "cloudSync": false
  }
}
```

## 🔄 Automated Scheduling

### Windows Task Scheduler Setup
```powershell
# Setup automated backups
.\backup-mongodb.ps1 -Type "setup"
```

This creates:
- **Daily Full Backup**: 2:00 AM
- **Incremental Backup**: Every 4 hours
- **Weekly Archive**: Sunday 1:00 AM
- **Cleanup Old Backups**: Daily 3:00 AM

### Manual Scheduling Options
```powershell
# Create Windows scheduled task for daily backups
schtasks /create /tn "MomsRecipeBox-Daily-Backup" /tr "powershell.exe -File 'C:\Path\To\backup-mongodb.ps1' -Type 'full'" /sc daily /st 02:00

# Create task for incremental backups
schtasks /create /tn "MomsRecipeBox-Incremental-Backup" /tr "powershell.exe -File 'C:\Path\To\backup-mongodb.ps1' -Type 'incremental'" /sc hourly /mo 4
```

## 🏥 Disaster Recovery

### Recovery Scenarios

#### Scenario 1: Data Corruption
```powershell
# Restore from latest full backup
.\restore-mongodb.ps1 -BackupPath "backups\latest\full"
```

#### Scenario 2: Accidental Deletion
```powershell
# Restore specific collection from incremental backup
.\restore-mongodb.ps1 -BackupPath "backups\2025-09-08\incremental-14-00" -Collections "recipes"
```

#### Scenario 3: Complete System Loss
```powershell
# Restore from archive backup
.\restore-mongodb.ps1 -BackupPath "backups\archive\weekly-2025-09-01" -DatabaseName "moms_recipe_box_recovery"
```

### Recovery Time Objectives (RTO)
- **Minor Issues**: < 15 minutes (incremental restore)
- **Major Corruption**: < 1 hour (full restore)
- **Complete Loss**: < 4 hours (archive restore + validation)

### Recovery Point Objectives (RPO)
- **Incremental**: 4 hours maximum data loss
- **Full Daily**: 24 hours maximum data loss
- **Archive**: 7 days maximum data loss

## 🔐 Security & Compliance

### Data Protection
- Encrypted backups using AES-256
- Secure storage with access controls
- Authentication required for all operations
- Audit logging of backup/restore operations

### Compliance Features
- Automated retention management
- Backup integrity verification
- Change tracking and versioning
- Disaster recovery documentation

## 📈 Monitoring & Alerting

### Health Checks
```powershell
# Verify recent backups
.\verify-backup.ps1 -CheckLast 3

# Test restore process
.\restore-mongodb.ps1 -BackupPath "backups\latest" -DryRun -DatabaseName "backup_test"
```

### Notifications
- Email alerts for backup failures
- Success confirmation reports
- Weekly backup health summaries
- Storage usage monitoring

## 🔧 Maintenance

### Regular Tasks
1. **Weekly**: Review backup logs and success rates
2. **Monthly**: Test restore procedures
3. **Quarterly**: Review retention policies
4. **Annually**: Full disaster recovery test

### Troubleshooting
Common issues and solutions:
- MongoDB connection failures
- Insufficient disk space
- Permission errors
- Backup corruption

## 🚀 Future Enhancements

### Planned Features
- MongoDB Atlas integration
- Real-time replication setup
- Cross-region backup synchronization
- Advanced monitoring dashboard
- Automated testing of backups

### Scalability Considerations
- Shard-aware backup strategies
- Replica set backup coordination
- Large dataset optimization
- Cloud-native backup solutions

---

*This backup strategy evolves with your application. Regular review and testing ensure your family recipes remain protected as the system grows.*
