# Rollback-Lambda.ps1 - Rollback Lambda deployment to previous version
param(
    [string]$LambdaFunction = "mrb-app-api",
    [string]$Region = "us-west-2",
    [string]$TargetVersion = "$LATEST",
    [switch]$ListVersions = $false,
    [switch]$Confirm = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🔄 Lambda Rollback Utility" -ForegroundColor Cyan
Write-Host "Function: $LambdaFunction" -ForegroundColor Gray
Write-Host "Region: $Region" -ForegroundColor Gray
Write-Host ""

# List available versions if requested
if ($ListVersions) {
    Write-Host "📋 Available versions:" -ForegroundColor Yellow
    
    try {
        $versions = aws lambda list-versions-by-function --function-name $LambdaFunction --region $Region | ConvertFrom-Json
        
        foreach ($version in $versions.Versions) {
            $lastModified = [DateTime]::Parse($version.LastModified).ToString("yyyy-MM-dd HH:mm:ss")
            Write-Host "  Version: $($version.Version) (Modified: $lastModified)"
            Write-Host "    SHA: $($version.CodeSha256)"
            Write-Host "    Size: $($version.CodeSize) bytes"
            Write-Host ""
        }
    } catch {
        Write-Error "Failed to list versions: $($_.Exception.Message)"
    }
    
    return
}

# Get current function configuration
Write-Host "🔍 Getting current function configuration..." -ForegroundColor Yellow

try {
    $currentFunction = aws lambda get-function --function-name $LambdaFunction --region $Region | ConvertFrom-Json
    
    Write-Host "Current configuration:"
    Write-Host "  Version: $($currentFunction.Configuration.Version)"
    Write-Host "  SHA: $($currentFunction.Configuration.CodeSha256)"
    Write-Host "  Last Modified: $($currentFunction.Configuration.LastModified)"
    Write-Host "  Image URI: $($currentFunction.Code.ImageUri)"
    Write-Host ""
} catch {
    Write-Error "Failed to get function configuration: $($_.Exception.Message)"
}

# Confirm rollback
if (-not $Confirm) {
    Write-Host "⚠️  This will rollback the Lambda function to version: $TargetVersion" -ForegroundColor Yellow
    Write-Host "Current function will be overwritten." -ForegroundColor Yellow
    Write-Host ""
    $confirmation = Read-Host "Do you want to continue? (y/N)"
    
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-Host "Rollback cancelled." -ForegroundColor Gray
        return
    }
}

# Perform rollback
Write-Host "🔄 Rolling back Lambda function..." -ForegroundColor Yellow

try {
    if ($TargetVersion -eq "$LATEST") {
        # Get the previous image from ECR
        $repoUri = "491696534851.dkr.ecr.us-west-2.amazonaws.com/mrb-app-api"
        
        # List images to find previous version
        $images = aws ecr describe-images --repository-name "mrb-app-api" --region $Region --query 'sort_by(imageDetails, &imagePushedAt)' | ConvertFrom-Json
        
        if ($images.Count -lt 2) {
            Write-Error "No previous images found for rollback"
        }
        
        # Get second-to-last image (previous version)
        $previousImage = $images[-2]
        $previousImageUri = "$repoUri@$($previousImage.imageDigest)"
        
        Write-Host "Rolling back to image: $previousImageUri"
        
        $rollbackResult = aws lambda update-function-code --function-name $LambdaFunction --image-uri $previousImageUri --region $Region | ConvertFrom-Json
    } else {
        # Rollback to specific version
        $rollbackResult = aws lambda update-function-code --function-name $LambdaFunction --zip-file-or-image-uri $TargetVersion --region $Region | ConvertFrom-Json
    }
    
    Write-Host "✅ Rollback initiated"
    Write-Host "  Function: $($rollbackResult.FunctionName)"
    Write-Host "  New SHA: $($rollbackResult.CodeSha256)"
    Write-Host ""
    
    # Wait for rollback to complete
    Write-Host "Waiting for rollback to complete..."
    do {
        Start-Sleep -Seconds 2
        $status = aws lambda get-function --function-name $LambdaFunction --region $Region | ConvertFrom-Json
        Write-Host "Status: $($status.Configuration.LastUpdateStatus)"
    } while ($status.Configuration.LastUpdateStatus -eq "InProgress")
    
    if ($status.Configuration.LastUpdateStatus -eq "Successful") {
        Write-Host "✅ Rollback completed successfully" -ForegroundColor Green
        
        # Test the rolled-back function
        Write-Host ""
        Write-Host "🧪 Testing rolled-back function..." -ForegroundColor Yellow
        
        try {
            $testUrl = "https://b31emm78z4.execute-api.$Region.amazonaws.com/dev/health"
            $response = Invoke-WebRequest -Uri $testUrl -Method GET -TimeoutSec 30
            Write-Host "✅ Health check passed (Status: $($response.StatusCode))" -ForegroundColor Green
        } catch {
            Write-Warning "⚠️  Health check failed: $($_.Exception.Message)"
            Write-Host "Check CloudWatch logs: aws logs tail /aws/lambda/$LambdaFunction --follow"
        }
    } else {
        Write-Error "❌ Rollback failed. Status: $($status.Configuration.LastUpdateStatus)"
    }
    
} catch {
    Write-Error "Rollback failed: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "🔗 Useful commands:" -ForegroundColor Cyan
Write-Host "View logs: aws logs tail /aws/lambda/$LambdaFunction --follow"
Write-Host "List versions: .\Rollback-Lambda.ps1 -ListVersions"
Write-Host "Function status: aws lambda get-function --function-name $LambdaFunction"