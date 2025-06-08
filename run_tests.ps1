# run_tests.ps1

# Get script directory (portable)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Load environment variables
$envFile = "$scriptDir/.env.ps1"
if (Test-Path $envFile) {
    Write-Host "=== Loading environment variables ===" -ForegroundColor Cyan
    . $envFile
} else {
    Write-Host "WARNING: No .env.ps1 file found. You must export PGPASSWORD manually." -ForegroundColor Yellow
}

# Prepare psql arguments
$psqlArgs = @(
    "-h", "127.0.0.1",
    "-U", "mrb_admin",
    "-d", "mrb_dev"
)

# Loading test procedure
Write-Host "=== Loading test procedure ===" -ForegroundColor Cyan
& psql @psqlArgs -f "$scriptDir/db/tests/test_recipe_lifecycle.sql"

# Executing test procedure
Write-Host "=== Executing test procedure ===" -ForegroundColor Cyan
& psql @psqlArgs -c "CALL test_recipe_lifecycle();"

# Done
Write-Host "=== Test run complete ===" -ForegroundColor Green
