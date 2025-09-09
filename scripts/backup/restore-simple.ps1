# Simple MongoDB Restore for Mom's Recipe Box
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force
)

Write-Host "=== Mom's Recipe Box Database Restore ==="
Write-Host "Time: $(Get-Date)"
Write-Host "Backup Path: $BackupPath"

# Check if backup path exists
if (!(Test-Path $BackupPath)) {
    Write-Host "ERROR: Backup path not found: $BackupPath"
    exit 1
}

# List backup contents
Write-Host "Backup contains:"
Get-ChildItem -Path $BackupPath | ForEach-Object { 
    $sizeKB = [math]::Round($_.Length / 1KB, 1)
    Write-Host "  - $($_.Name) ($sizeKB KB)"
}

# Confirm unless forced
if (!$Force) {
    Write-Host ""
    Write-Host "WARNING: This will replace ALL data in the database!"
    $confirmation = Read-Host "Type 'YES' to continue"
    if ($confirmation -ne "YES") {
        Write-Host "Restore cancelled by user"
        exit 0
    }
}

Write-Host "Copying backup to container..."
docker cp $BackupPath momsrecipebox-mongo:/tmp/restore_data

if ($LASTEXITCODE -eq 0) {
    Write-Host "Running mongorestore..."
    docker exec momsrecipebox-mongo mongorestore --host localhost:27017 --username admin --password supersecret --authenticationDatabase admin --db moms_recipe_box --drop /tmp/restore_data
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Cleaning up container..."
        docker exec momsrecipebox-mongo rm -rf /tmp/restore_data
        
        Write-Host "SUCCESS: Database restored from $BackupPath"
        
        # Show current database stats
        Write-Host "Database now contains:"
        docker exec momsrecipebox-mongo mongosh -u admin -p supersecret --authenticationDatabase admin --eval "db = db.getSiblingDB('moms_recipe_box'); db.getCollectionNames().forEach(col => print('  - ' + col + ': ' + db[col].countDocuments() + ' documents'));"
        
    } else {
        Write-Host "ERROR: mongorestore failed"
        exit 1
    }
} else {
    Write-Host "ERROR: Failed to copy backup to container"
    exit 1
}

Write-Host "=== Restore Complete ==="
