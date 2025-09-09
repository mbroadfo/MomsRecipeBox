# MongoDB Backup Script for Mom's Recipe Box
# Basic backup operations

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("backup", "restore", "status")]
    [string]$Operation = "status",
    
    [Parameter(Mandatory=$false)]
    [string]$BackupPath = ""
)

function Write-BackupLog {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
}

function Test-MongoDB {
    Write-BackupLog "Testing MongoDB connection..."
    
    try {
        docker exec momsrecipebox-mongo mongosh -u admin -p supersecret --authenticationDatabase admin --eval "db.adminCommand('ping')" --quiet | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-BackupLog "✓ MongoDB is accessible"
            return $true
        } else {
            Write-BackupLog "✗ MongoDB connection failed (exit code: $LASTEXITCODE)"
            return $false
        }
    } catch {
        Write-BackupLog "✗ MongoDB connection error: $($_.Exception.Message)"
        return $false
    }
}

function New-Backup {
    Write-BackupLog "Creating database backup..."
    
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backupDir = ".\backups\backup_$timestamp"
    
    # Create backup directory
    if (!(Test-Path ".\backups")) {
        New-Item -ItemType Directory -Path ".\backups" -Force | Out-Null
    }
    
    # Create mongodump
    Write-BackupLog "Running mongodump..."
    docker exec momsrecipebox-mongo mongodump --host localhost:27017 --username admin --password supersecret --authenticationDatabase admin --db moms_recipe_box --out /tmp/backup_output
    
    if ($LASTEXITCODE -eq 0) {
        # Copy from container
        docker cp momsrecipebox-mongo:/tmp/backup_output/moms_recipe_box $backupDir
        docker exec momsrecipebox-mongo rm -rf /tmp/backup_output
        
        Write-BackupLog "✓ Backup created: $backupDir"
        return $backupDir
    } else {
        Write-BackupLog "✗ Backup failed"
        return $null
    }
}

function Show-BackupStatus {
    Write-BackupLog "=== Mom's Recipe Box Backup Status ==="
    
    # Test MongoDB
    Test-MongoDB | Out-Null
    
    # Check backups
    if (Test-Path ".\backups") {
        $backups = Get-ChildItem -Path ".\backups" -Directory
        Write-BackupLog "Found $($backups.Count) backup(s) in .\backups"
        
        if ($backups.Count -gt 0) {
            $backups | Sort-Object CreationTime -Descending | Select-Object -First 3 | ForEach-Object {
                Write-BackupLog "  - $($_.Name) ($(Get-Date $_.CreationTime -Format 'MM/dd HH:mm'))"
            }
        }
    } else {
        Write-BackupLog "No backup directory found"
    }
    
    Write-BackupLog "=================================="
}

# Main execution
Write-BackupLog "Mom's Recipe Box Database Backup Tool"

switch ($Operation) {
    "backup" {
        if (Test-MongoDB) {
            $result = New-Backup
            if ($result) {
                Write-BackupLog "Backup operation completed successfully"
                exit 0
            } else {
                Write-BackupLog "Backup operation failed"
                exit 1
            }
        } else {
            Write-BackupLog "Cannot create backup - MongoDB not accessible"
            exit 1
        }
    }
    "status" {
        Show-BackupStatus
        exit 0
    }
    default {
        Write-BackupLog "Usage: .\backup-tool.ps1 -Operation [backup|status]"
        exit 1
    }
}
