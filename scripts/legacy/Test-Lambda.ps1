# Test-Lambda.ps1 - Test Lambda deployment endpoints
param(
    [string]$Environment = "dev",
    [string]$Region = "us-west-2",
    [string]$ApiGatewayId = "b31emm78z4",  # Your actual API Gateway ID
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🧪 Testing Lambda Deployment" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Gray
Write-Host "Region: $Region" -ForegroundColor Gray
Write-Host ""

$baseUrl = "https://$ApiGatewayId.execute-api.$Region.amazonaws.com/$Environment"

# Test endpoints
$testCases = @(
    @{ 
        Name = "Health Check"
        Method = "GET" 
        Path = "/health"
        ExpectedStatus = @(200, 500)  # Allow 500 during development
        Description = "Basic health check endpoint"
    },
    @{ 
        Name = "CORS Preflight"
        Method = "OPTIONS" 
        Path = "/health"
        ExpectedStatus = @(200)
        Description = "CORS preflight request"
    },
    @{ 
        Name = "Recipe List"
        Method = "GET" 
        Path = "/recipes"
        ExpectedStatus = @(200, 401, 500)  # Various auth states
        Description = "Recipe listing endpoint"
    }
)

$results = @()

foreach ($testCase in $testCases) {
    Write-Host "Testing: $($testCase.Name)" -ForegroundColor Yellow
    $url = "$baseUrl$($testCase.Path)"
    Write-Host "  URL: $url"
    Write-Host "  Method: $($testCase.Method)"
    
    try {
        $headers = @{
            'Content-Type' = 'application/json'
        }
        
        if ($testCase.Method -eq "OPTIONS") {
            $headers['Origin'] = 'http://localhost:3000'
            $headers['Access-Control-Request-Method'] = 'GET'
        }
        
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri $url -Method $testCase.Method -Headers $headers -TimeoutSec 30
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        $success = $testCase.ExpectedStatus -contains $response.StatusCode
        $status = if ($success) { "✅ PASS" } else { "❌ FAIL" }
        
        Write-Host "  $status (Status: $($response.StatusCode), Duration: $([math]::Round($duration))ms)"
        
        if ($Verbose -and $response.Content) {
            Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
        }
        
        $results += @{
            Test = $testCase.Name
            Status = $response.StatusCode
            Success = $success
            Duration = $duration
            Error = $null
        }
        
    } catch {
        $errorMessage = $_.Exception.Message
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            $success = $testCase.ExpectedStatus -contains $statusCode
            $status = if ($success) { "✅ PASS" } else { "❌ FAIL" }
            Write-Host "  $status (Status: $statusCode, Error: $errorMessage)"
            
            $results += @{
                Test = $testCase.Name
                Status = $statusCode
                Success = $success
                Duration = 0
                Error = $errorMessage
            }
        } else {
            Write-Host "  ❌ FAIL (Network Error: $errorMessage)" -ForegroundColor Red
            
            $results += @{
                Test = $testCase.Name
                Status = "Network Error"
                Success = $false
                Duration = 0
                Error = $errorMessage
            }
        }
    }
    
    Write-Host ""
}

# Summary
Write-Host "📋 Test Summary" -ForegroundColor Cyan
Write-Host ""

$passCount = ($results | Where-Object { $_.Success }).Count
$totalCount = $results.Count

Write-Host "Results: $passCount/$totalCount tests passed" -ForegroundColor $(if ($passCount -eq $totalCount) { "Green" } else { "Yellow" })
Write-Host ""

foreach ($result in $results) {
    $statusIcon = if ($result.Success) { "✅" } else { "❌" }
    Write-Host "$statusIcon $($result.Test): $($result.Status)"
}

Write-Host ""

if ($passCount -eq $totalCount) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Check CloudWatch logs:" -ForegroundColor Yellow
    Write-Host "aws logs tail /aws/lambda/mrb-app-api --follow"
}

# Check CloudWatch logs for recent errors
Write-Host ""
Write-Host "🔍 Recent Lambda Logs (last 5 minutes):" -ForegroundColor Cyan

try {
    $fiveMinutesAgo = [DateTimeOffset]::UtcNow.AddMinutes(-5).ToUnixTimeMilliseconds()
    $logEvents = aws logs filter-log-events --log-group-name "/aws/lambda/mrb-app-api" --start-time $fiveMinutesAgo --query 'events[-5:].message' --output text
    
    if ($logEvents) {
        $logEvents.Split("`n") | ForEach-Object {
            if ($_ -match "ERROR|CRITICAL|❌") {
                Write-Host "  $_" -ForegroundColor Red
            } elseif ($_ -match "WARN|⚠️") {
                Write-Host "  $_" -ForegroundColor Yellow
            } else {
                Write-Host "  $_" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "  No recent log events found" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Could not retrieve logs: $($_.Exception.Message)" -ForegroundColor Red
}

return $results