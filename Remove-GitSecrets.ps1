# PowerShell script to remove MongoDB Atlas URI from Git history
# This targets the specific commit that exposed the secret

Write-Host "🚨 Removing MongoDB Atlas URI from Git history" -ForegroundColor Red
Write-Host "Target commit: edcc82e7613dcdcf7e56146a95e184a20d609ab4" -ForegroundColor Yellow
Write-Host ""

# Confirm this is what the user wants
$confirm = Read-Host "This will REWRITE Git history. Are you sure? Type 'YES' to continue"
if ($confirm -ne 'YES') {
    Write-Host "❌ Aborted. No changes made." -ForegroundColor Red
    exit 1
}

Write-Host "🔄 Creating backup branch..." -ForegroundColor Blue
git branch history-cleanup-backup 2>$null

Write-Host "🔄 Running git filter-branch to remove secrets..." -ForegroundColor Blue

# Use git filter-branch with PowerShell-compatible commands
git filter-branch -f --tree-filter 'powershell -Command "
    # Replace MongoDB Atlas URI in .env file
    if (Test-Path .env) {
        (Get-Content .env -Raw) -replace ''mongodb\+srv://mbroadfo:[^@]*@cluster0\.[^/]*\.mongodb\.net/moms_recipe_box_dev[^\s]*'', ''$${MONGODB_ATLAS_URI}'' | Set-Content .env -NoNewline
    }
    
    # Check other files that might contain the URI
    Get-ChildItem -Recurse -Include *.md, *.txt, *.json, *.js | ForEach-Object {
        if (Test-Path $_.FullName) {
            $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
            if ($content -and $content -match ''mongodb\+srv://mbroadfo:'') {
                $content -replace ''mongodb\+srv://mbroadfo:[^@]*@cluster0\.[^/]*\.mongodb\.net/moms_recipe_box_dev[^\s]*'', ''$${MONGODB_ATLAS_URI}'' | Set-Content $_.FullName -NoNewline
            }
        }
    }
"' HEAD

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Git history cleaned successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify the target commit is cleaned:" -ForegroundColor White
    Write-Host "   git show edcc82e7613dcdcf7e56146a95e184a20d609ab4:.env" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Check recent commits:" -ForegroundColor White  
    Write-Host "   git log --oneline -5" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. If everything looks good, force push:" -ForegroundColor White
    Write-Host "   git push --force-with-lease origin master" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔐 SECURITY STEPS (DO THESE NOW):" -ForegroundColor Red
    Write-Host "1. Change MongoDB Atlas password immediately" -ForegroundColor White
    Write-Host "2. Update password in AWS Secrets Manager" -ForegroundColor White
    Write-Host "3. Rotate any other credentials that might be compromised" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  WARNING: All collaborators must re-clone the repository!" -ForegroundColor Red
    
} else {
    Write-Host ""
    Write-Host "❌ Error during history rewrite!" -ForegroundColor Red
    Write-Host "Restore from backup: git checkout history-cleanup-backup" -ForegroundColor Yellow
}