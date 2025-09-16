# toggle-aws-profile.ps1
# Toggles between AWS profiles for MomsRecipeBox management

$current = $env:AWS_PROFILE

if (-not $current) {
    $env:AWS_PROFILE = "mrb-api"
    Write-Host "Switched to: mrb-api (was unset)"
} elseif ($current -eq "mrb-api") {
    $env:AWS_PROFILE = "terraform"
    Write-Host "Switched to: terraform"
} elseif ($current -eq "terraform") {
    $env:AWS_PROFILE = "cruise-finder"
    Write-Host "Switched to: cruise-finder"
} elseif ($current -eq "cruise-finder") {
    $env:AWS_PROFILE = "mrb-api"
    Write-Host "Switched to: mrb-api"
} else {
    $env:AWS_PROFILE = "mrb-api"
    Write-Host "Switched to: mrb-api (from $current)"
}

# Show current AWS identity
Write-Host "Current identity:" -ForegroundColor Cyan
aws sts get-caller-identity
