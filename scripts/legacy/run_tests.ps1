# run_tests.ps1
# Simple Lambda connectivity test (replaced database seeding functionality)
# Use the modern npm scripts instead: npm run test:lambda

Write-Host "=== Lambda Connectivity Test ===" -ForegroundColor Cyan
Write-Host "This script has been simplified to avoid database seeding." -ForegroundColor Yellow
Write-Host "Use modern alternatives:" -ForegroundColor Green
Write-Host "  npm run test:lambda       - Safe connectivity test" -ForegroundColor Cyan
Write-Host "  npm run test:lambda:invoke - Invoke with empty payload" -ForegroundColor Cyan

# Simple function existence check
Write-Host "`nChecking if mrb-app-api function exists..." -ForegroundColor Blue
try {
    $functionInfo = aws lambda get-function --function-name mrb-app-api --query 'Configuration.{Name:FunctionName,State:State,Modified:LastModified}' --output json | ConvertFrom-Json
    Write-Host "✅ Function found: $($functionInfo.Name)" -ForegroundColor Green
    Write-Host "   State: $($functionInfo.State)" -ForegroundColor Blue
    Write-Host "   Last Modified: $($functionInfo.Modified)" -ForegroundColor Blue
} catch {
    Write-Host "❌ Function not accessible or doesn't exist" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Test complete ===" -ForegroundColor Green
