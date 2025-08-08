# Run-ImageTests.ps1
# Simple script to run the image API test suite

Write-Host "Running image API test suite..." -ForegroundColor Cyan
node test_images.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ All image tests passed!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Some image tests failed. Check the test report for details." -ForegroundColor Red
}

Write-Host "`nTest report and output files available in: ./test_output/" -ForegroundColor Yellow
