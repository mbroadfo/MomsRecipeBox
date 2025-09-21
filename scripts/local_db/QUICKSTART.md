# MongoDB Backup & Restore Quick Start Guide

## 🚀 Initial Setup (One-time)

1. **Navigate to your project directory:**
   ```powershell
   cd "C:\Users\Mike\Documents\Code\MomsRecipeBox"
   ```

2. **Run the setup command:**
   ```powershell
   .\scripts\backup\manage-backups.ps1 -Operation setup
   ```

3. **Verify everything is working:**
   ```powershell
   .\scripts\backup\manage-backups.ps1 -Operation test
   ```

## 📋 Daily Operations

### Create a Backup
```powershell
# Full backup (recommended for daily use)
.\scripts\backup\manage-backups.ps1 -Operation backup -Type full

# Quick incremental backup
.\scripts\backup\manage-backups.ps1 -Operation backup -Type incremental

# Archive backup (for long-term storage)
.\scripts\backup\manage-backups.ps1 -Operation backup -Type archive
```

### Check Backup Status
```powershell
# Quick status overview
.\scripts\backup\manage-backups.ps1 -Operation status

# Detailed status with more information
.\scripts\backup\manage-backups.ps1 -Operation status -Detailed
```

### Verify Recent Backups
```powershell
# Check last 3 backups
.\scripts\backup\manage-backups.ps1 -Operation verify

# Verify a specific backup
.\scripts\backup\manage-backups.ps1 -Operation verify -Path ".\backups\2025-09-08\full_2025-09-08_14-30-00"
```

## 🔄 Restore Operations

### Preview a Restore (Safe)
```powershell
# See what would be restored without making changes
.\scripts\backup\manage-backups.ps1 -Operation restore -Path ".\backups\2025-09-08\full_2025-09-08_14-30-00" -DryRun
```

### Restore from Backup
```powershell
# Interactive restore with safety checks
.\scripts\backup\manage-backups.ps1 -Operation restore -Path ".\backups\2025-09-08\full_2025-09-08_14-30-00"

# Force restore without prompts (use carefully!)
.\scripts\backup\manage-backups.ps1 -Operation restore -Path ".\backups\latest" -Force
```

## 🧹 Maintenance

### Clean Up Old Backups
```powershell
# Preview what would be deleted
.\scripts\backup\manage-backups.ps1 -Operation cleanup -DryRun

# Actually remove old backups
.\scripts\backup\manage-backups.ps1 -Operation cleanup
```

## 🆘 Emergency Procedures

### Complete Data Loss Recovery
1. **Stop the application:**
   ```powershell
   docker compose down
   ```

2. **Find the most recent good backup:**
   ```powershell
   .\scripts\backup\manage-backups.ps1 -Operation status -Detailed
   ```

3. **Restore from backup:**
   ```powershell
   .\scripts\backup\manage-backups.ps1 -Operation restore -Path ".\backups\archive\weekly-2025-09-01" -Force
   ```

4. **Restart the application:**
   ```powershell
   docker compose up -d
   ```

### Accidental Recipe Deletion
1. **Find a recent backup:**
   ```powershell
   dir .\backups\*\incremental* | Sort-Object CreationTime -Descending | Select-Object -First 3
   ```

2. **Preview the restore:**
   ```powershell
   .\scripts\backup\manage-backups.ps1 -Operation restore -Path ".\backups\2025-09-08\incremental_2025-09-08_16-00-00" -DryRun
   ```

3. **Restore if the data looks good:**
   ```powershell
   .\scripts\backup\manage-backups.ps1 -Operation restore -Path ".\backups\2025-09-08\incremental_2025-09-08_16-00-00"
   ```

## 📱 Common File Locations

- **Backups:** `.\backups\`
- **Logs:** `.\backups\backup.log`
- **Configuration:** `.\scripts\backup\backup-config.json`
- **Scripts:** `.\scripts\backup\`

## ⚡ Quick Commands Reference

| Task | Command |
|------|---------|
| Create backup | `.\scripts\backup\manage-backups.ps1 -Operation backup` |
| Check status | `.\scripts\backup\manage-backups.ps1 -Operation status` |
| Verify backups | `.\scripts\backup\manage-backups.ps1 -Operation verify` |
| Clean old backups | `.\scripts\backup\manage-backups.ps1 -Operation cleanup -DryRun` |
| Test restore | `.\scripts\backup\manage-backups.ps1 -Operation restore -Path "PATH" -DryRun` |
| Emergency restore | `.\scripts\backup\manage-backups.ps1 -Operation restore -Path "PATH" -Force` |

## 🔧 Troubleshooting

### "Docker not running" Error
```powershell
# Start Docker Desktop and wait for it to fully load
docker compose up -d
```

### "MongoDB container not found" Error
```powershell
# Check container status
docker ps -a | findstr mongo

# Start MongoDB if stopped
docker compose up -d mongo
```

### "Backup verification failed" Warning
```powershell
# Check specific backup
.\scripts\backup\manage-backups.ps1 -Operation verify -Path "PATH_TO_BACKUP" -Detailed

# Try creating a new backup
.\scripts\backup\manage-backups.ps1 -Operation backup -Type full
```

### "Permission denied" Error
- Run PowerShell as Administrator
- Check that Docker Desktop is running
- Verify the MongoDB container is accessible

## 📞 Need Help?

1. **Check the logs:** Look in `.\backups\backup.log` for detailed error messages
2. **Run diagnostics:** `.\scripts\backup\manage-backups.ps1 -Operation test`
3. **Check status:** `.\scripts\backup\manage-backups.ps1 -Operation status -Detailed`
4. **View documentation:** See `.\scripts\backup\README.md` for complete documentation

---

**Remember:** Always test your restore procedures regularly. A backup is only as good as your ability to restore from it!
