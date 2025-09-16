# set-aws-profile-mrbapi.ps1
# This script directly sets the AWS profile to mrb-api

$env:AWS_PROFILE = "mrb-api"
Write-Host "AWS profile set to: mrb-api" -ForegroundColor Green

# Show current AWS identity
Write-Host "Current identity:" -ForegroundColor Cyan
aws sts get-caller-identity