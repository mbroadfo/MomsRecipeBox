# MongoDB Local Database Backup & Restore
## Mom's Recipe Box Local Development Data Management

This directory contains simple backup utilities for local MongoDB development. These scripts are designed for development environment data protection and complement the comprehensive Atlas backup scripts in the parent directory.

## 📊 Current Database Profile

- **Database Name**: moms_recipe_box_dev (standardized across all environments)
- **Collections**: recipes, favorites, comments, shopping_lists, users
- **Data Volume**: ~100KB with 109 documents across 5 collections
- **Growth Potential**: High - family recipes, AI-generated content, user interactions
- **Criticality**: HIGH - irreplaceable family recipes and user data

## 🛡️ Backup Architecture Overview

### Two-Tier System
1. **Local Development Backups** (this directory) - Simple scripts for local MongoDB development
2. **Atlas/Production Backups** (parent `scripts/`) - Comprehensive enterprise scripts for production

### Backup Types by Environment

| Environment | Location | Purpose | Scripts |
|------------|----------|---------|---------|
| **Local Development** | `scripts/local_db/` | Development data protection | Simple backup/restore scripts |
| **Atlas Production** | `scripts/` | Production data to S3 | Comprehensive enterprise scripts |

## 📁 Directory Structure

```
scripts/
├── MongoDB-Backup.ps1           # Main Atlas backup to S3 (664 lines)
├── Backup-MongoDBToS3.ps1       # S3 backup operations
├── Restore-MongoDBFromS3.ps1    # S3 restore operations  
├── Test-MongoDBBackup.ps1       # Atlas backup validation
├── (other production scripts...)
└── local_db/                    # ← This directory
    ├── README.md                # This documentation
    ├── IMPLEMENTATION_SUMMARY.md # Technical implementation details
    ├── QUICKSTART.md            # Quick start guide
    ├── backup-mongodb.ps1       # Simple local backup
    ├── restore-mongodb.ps1      # Simple local restore
    ├── verify-backup.ps1        # Local verification
    ├── cleanup-backups.ps1      # Local cleanup
    ├── manage-backups.ps1       # Local management
    ├── backup-config.json       # Local configuration
    └── templates/               # Local backup templates
```

## 📍 Atlas/Production Backup Scripts

The comprehensive Atlas backup scripts are located in the parent scripts directory:
- **`../MongoDB-Backup.ps1`** (664 lines) - Main Atlas backup to S3
- **`../Backup-MongoDBToS3.ps1`** - S3 backup operations  
- **`../Restore-MongoDBFromS3.ps1`** - S3 restore operations
- **`../Test-MongoDBBackup.ps1`** - Backup validation

## 🚀 Quick Start

### Local Development Backups

#### 1. Local Database Backup
```powershell
# Run from project root
.\scripts\local_db\backup-mongodb.ps1
```

#### 2. Local Database Restore
```powershell
.\scripts\local_db\restore-mongodb.ps1 -BackupPath "backups\2025-09-21"
```

### Atlas/Production Backups

#### 1. Atlas Backup to S3
```powershell
# Run from scripts directory
.\scripts\MongoDB-Backup.ps1
```

#### 2. Restore from S3
```powershell
.\scripts\Restore-MongoDBFromS3.ps1
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
    "name": "moms_recipe_box_dev",
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
