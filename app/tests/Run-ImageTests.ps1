# Run-ImageTests.ps1
# Simple script to run the image API test suite

# Get the directory where this script is located
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Running image API test suite from $scriptPath" -ForegroundColor Cyan
Set-Location -Path $scriptPath
node test_images.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ All image tests passed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Some image tests failed. Test output files available in: $scriptPath\test_output\" -ForegroundColor Red
}
