# Phase 4.1 Environment Integration Test Script
# Tests UI environment configuration across all deployment modes

Write-Host "=== Phase 4.1 UI Environment Integration Tests ===" -ForegroundColor Cyan
Write-Host ""

$testResults = @()

# Test each environment configuration
$environments = @("local", "atlas", "lambda", "production")

foreach ($env in $environments) {
    Write-Host "Testing $env environment..." -ForegroundColor Yellow
    
    try {
        # Set environment and build
        $buildResult = & npm run "ui:build:$env" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Build successful for $env" -ForegroundColor Green
            $testResults += @{ Environment = $env; Build = "Success"; Error = $null }
        } else {
            Write-Host "  ❌ Build failed for $env" -ForegroundColor Red
            $testResults += @{ Environment = $env; Build = "Failed"; Error = $buildResult }
        }
    }
    catch {
        Write-Host "  ❌ Exception during $env build: $($_.Exception.Message)" -ForegroundColor Red
        $testResults += @{ Environment = $env; Build = "Exception"; Error = $_.Exception.Message }
    }
    
    Write-Host ""
}

# Summary
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
$successCount = ($testResults | Where-Object { $_.Build -eq "Success" }).Count
$totalCount = $testResults.Count

Write-Host "Build Tests: $successCount/$totalCount passed" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

foreach ($result in $testResults) {
    $color = if ($result.Build -eq "Success") { "Green" } else { "Red" }
    Write-Host "  $($result.Environment): $($result.Build)" -ForegroundColor $color
    if ($result.Error) {
        Write-Host "    Error: $($result.Error)" -ForegroundColor Red
    }
}

# Additional validation checks
Write-Host ""
Write-Host "=== Environment Files Validation ===" -ForegroundColor Cyan

$envFiles = @(
    "ui\.env.local",
    "ui\.env.atlas", 
    "ui\.env.lambda",
    "ui\.env.production"
)

foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file exists" -ForegroundColor Green
        
        # Check if file has required variables
        $content = Get-Content $file -Raw
        if ($content -match "VITE_ENVIRONMENT=") {
            Write-Host "    ✅ Contains VITE_ENVIRONMENT" -ForegroundColor Green
        } else {
            Write-Host "    ❌ Missing VITE_ENVIRONMENT" -ForegroundColor Red
        }
    } else {
        Write-Host "  ❌ $file missing" -ForegroundColor Red
    }
}

# Check core configuration files
Write-Host ""
Write-Host "=== Core Configuration Files ===" -ForegroundColor Cyan

$configFiles = @(
    "ui\src\config\environment.ts",
    "ui\src\lib\api-client.ts",
    "ui\vite.config.ts",
    "ui\package.json"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file missing" -ForegroundColor Red
    }
}

# Check if dist folder was created
Write-Host ""
Write-Host "=== Build Artifacts ===" -ForegroundColor Cyan

if (Test-Path "ui\dist") {
    Write-Host "  ✅ ui\dist folder exists" -ForegroundColor Green
    
    $distFiles = Get-ChildItem "ui\dist" -File
    Write-Host "    📁 Contains $($distFiles.Count) files" -ForegroundColor Blue
    
    # Check for key files
    $keyFiles = @("index.html", "assets")
    foreach ($key in $keyFiles) {
        $exists = Test-Path "ui\dist\$key"
        $color = if ($exists) { "Green" } else { "Red" }
        $icon = if ($exists) { "✅" } else { "❌" }
        Write-Host "    $icon $key" -ForegroundColor $color
    }
} else {
    Write-Host "  ❌ ui\dist folder missing" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Phase 4.1 Environment Integration Test Complete ===" -ForegroundColor Cyan

# Return summary for potential automated processing
return @{
    BuildTests = $testResults
    TotalTests = $totalCount
    PassedTests = $successCount
    Success = ($successCount -eq $totalCount)
}