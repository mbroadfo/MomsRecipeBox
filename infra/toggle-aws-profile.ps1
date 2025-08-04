# toggle-aws-profile.ps1

$current = $env:AWS_PROFILE

if (-not $current) {
    $env:AWS_PROFILE = "terraform"
    Write-Host "Switched to: terraform (was unset)"
} elseif ($current -eq "terraform") {
    $env:AWS_PROFILE = "mrb-api"
    Write-Host "Switched to: mrb-api"
} else {
    $env:AWS_PROFILE = "terraform"
    Write-Host "Switched to: terraform"
}

# Show current AWS identity
aws sts get-caller-identity
