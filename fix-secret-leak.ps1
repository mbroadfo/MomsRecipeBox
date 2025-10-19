# PowerShell script to remove MongoDB Atlas URI from Git history
# This will rewrite Git history to replace the exposed secret

Write-Host "🚨 Fixing MongoDB Atlas URI leak in Git history..." -ForegroundColor Red
Write-Host "This will rewrite Git history - make sure you have a backup!" -ForegroundColor Yellow
Write-Host ""

# The pattern to find (you'll need to replace this with your actual exposed URI pattern)
$exposedPattern = "mongodb\+srv://mbroadfo:[^@]+@cluster0\.[^/]+\.mongodb\.net"
$replacement = "mongodb+srv://mbroadfo:REDACTED@cluster0.REDACTED.mongodb.net"

Write-Host "Searching for pattern: $exposedPattern" -ForegroundColor Cyan
Write-Host "Will replace with: $replacement" -ForegroundColor Green
Write-Host ""

# Confirm before proceeding
$confirmation = Read-Host "Are you sure you want to rewrite Git history? Type 'YES' to confirm"
if ($confirmation -ne 'YES') {
    Write-Host "Aborted. No changes made." -ForegroundColor Yellow
    exit 1
}

Write-Host "🔄 Rewriting Git history..." -ForegroundColor Blue

# Use git filter-branch to rewrite history
git filter-branch --force --env-filter '
    if [ "$GIT_COMMIT" = "edcc82e7613dcdcf7e56146a95e184a20d609ab4" ]; then
        echo "Found target commit, will clean it up"
    fi
' --tree-filter '
    # Replace the MongoDB URI pattern in all files
    find . -type f -name "*.env*" -o -name "*.md" -o -name "*.json" -o -name "*.js" -o -name "*.ts" | xargs -I {} sh -c "
        if [ -f \"{}\" ]; then
            sed -i.bak \"s|mongodb+srv://mbroadfo:[^@]*@cluster0\.[^/]*\.mongodb\.net|mongodb+srv://mbroadfo:REDACTED@cluster0.REDACTED.mongodb.net|g\" \"{}\" 2>/dev/null || true
            rm -f \"{}.bak\" 2>/dev/null || true
        fi
    "
' --msg-filter '
    # Clean up commit messages too
    sed "s|mongodb+srv://mbroadfo:[^@]*@cluster0\.[^/]*\.mongodb\.net|mongodb+srv://mbroadfo:REDACTED@cluster0.REDACTED.mongodb.net|g"
' --tag-name-filter cat -- --all

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Git history rewritten successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify the changes look correct: git log --oneline" -ForegroundColor White
    Write-Host "2. Force push to GitHub: git push --force-with-lease origin master" -ForegroundColor White
    Write-Host "3. Update MongoDB Atlas password in AWS Secrets Manager" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  WARNING: This is a destructive operation!" -ForegroundColor Red
    Write-Host "All collaborators will need to re-clone the repository!" -ForegroundColor Red
} else {
    Write-Host "❌ Error rewriting Git history!" -ForegroundColor Red
    Write-Host "You may need to restore from backup: git checkout backup-before-history-rewrite" -ForegroundColor Yellow
}