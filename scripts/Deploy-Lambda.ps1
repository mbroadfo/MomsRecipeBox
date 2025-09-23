#!/usr/bin/env pwsh
# Deploy Lambda Function with Container Image
# This script builds the Docker image, pushes to ECR, and updates the Lambda function

param(
    [string]$AwsProfile = "terraform-mrb",
    [string]$Region = "us-west-2",
    [string]$EcrRepository = "491696534851.dkr.ecr.us-west-2.amazonaws.com/mrb-app-api",
    [string]$LambdaFunction = "mrb-app-api",
    [string]$ImageTag = "dev"
)

Write-Host "[DEPLOY] Starting Lambda Deployment Process" -ForegroundColor Green
Write-Host "Profile: $AwsProfile" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "ECR Repository: $EcrRepository" -ForegroundColor Yellow
Write-Host "Lambda Function: $LambdaFunction" -ForegroundColor Yellow

# Set AWS profile
$env:AWS_PROFILE = $AwsProfile
Write-Host "[OK] AWS Profile set to: $AwsProfile" -ForegroundColor Green

# Change to project root directory (needed for Dockerfile context)
Set-Location "c:\Users\Mike\Documents\Code\MomsRecipeBox"
Write-Host "[INFO] Changed to project root directory" -ForegroundColor Green

# Build Docker image (disable BuildKit for Lambda compatibility)
Write-Host "[BUILD] Building Docker image..." -ForegroundColor Blue
$env:DOCKER_BUILDKIT = "0"
docker build -f app/Dockerfile -t mrb-app-api .
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker build failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Docker image built successfully" -ForegroundColor Green

# Tag for ECR
Write-Host "[TAG] Tagging image for ECR..." -ForegroundColor Blue
docker tag mrb-app-api:latest "${EcrRepository}:${ImageTag}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker tag failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Image tagged for ECR" -ForegroundColor Green

# Login to ECR
Write-Host "[LOGIN] Logging into ECR..." -ForegroundColor Blue
aws ecr get-login-password --region $Region --profile $AwsProfile | docker login --username AWS --password-stdin $EcrRepository
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] ECR login failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Successfully logged into ECR" -ForegroundColor Green

# Push to ECR (force Docker manifest format for Lambda compatibility)
Write-Host "[PUSH] Pushing image to ECR..." -ForegroundColor Blue
$env:DOCKER_BUILDKIT = "0"
docker push "${EcrRepository}:${ImageTag}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker push failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Image pushed to ECR successfully" -ForegroundColor Green

# Update Lambda function
Write-Host "[UPDATE] Updating Lambda function..." -ForegroundColor Blue
aws lambda update-function-code `
    --function-name $LambdaFunction `
    --image-uri "${EcrRepository}:${ImageTag}" `
    --region $Region `
    --profile $AwsProfile
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Lambda update failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Lambda function updated successfully" -ForegroundColor Green

# Wait for update to complete
Write-Host "[WAIT] Waiting for Lambda function to be ready..." -ForegroundColor Blue
do {
    Start-Sleep -Seconds 2
    $status = aws lambda get-function --function-name $LambdaFunction --region $Region --profile $AwsProfile --query 'Configuration.LastUpdateStatus' --output text
    Write-Host "Status: $status" -ForegroundColor Yellow
} while ($status -eq "InProgress")

if ($status -ne "Successful") {
    Write-Host "[ERROR] Lambda function update failed with status: $status" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Lambda function is ready" -ForegroundColor Green

# Test the Lambda function
Write-Host "[TEST] Testing Lambda function..." -ForegroundColor Blue
$testResult = aws lambda invoke --function-name $LambdaFunction --region $Region --profile $AwsProfile --payload '{}' test-response.json
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Lambda test invocation failed" -ForegroundColor Red
    exit 1
}

# Check if response file was created and show result
if (Test-Path "test-response.json") {
    $responseContent = Get-Content "test-response.json" -Raw
    Write-Host "[INFO] Lambda response: $responseContent" -ForegroundColor Cyan
    Remove-Item "test-response.json" -Force
} else {
    Write-Host "[WARNING] No response file created" -ForegroundColor Yellow
}

Write-Host "[SUCCESS] Lambda deployment completed successfully!" -ForegroundColor Green
Write-Host "[INFO] Lambda function $LambdaFunction is now running with image ${EcrRepository}:${ImageTag}" -ForegroundColor Cyan