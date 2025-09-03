# run_tests.ps1
# Delegates database testing to the init-mrb-db Lambda

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
. "$scriptDir/.env.ps1"

Write-Host "=== Invoking init-mrb-db Lambda ===" -ForegroundColor Cyan

aws lambda invoke `
  --function-name init-mrb-db `
  --payload '{}' `
  "$scriptDir/test_results.json" `
  --cli-binary-format raw-in-base64-out

Write-Host "Lambda response:"
Get-Content "$scriptDir/test_results.json" | ConvertFrom-Json | ConvertTo-Json -Depth 5

Write-Host "=== Test complete ===" -ForegroundColor Green
