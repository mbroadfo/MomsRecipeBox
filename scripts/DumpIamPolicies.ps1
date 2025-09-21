# DumpIamPolicies.ps1
# Updated to use terraform-mrb as default user

param (
    [string]$UserName = "terraform-mrb",
    [string]$OutputDir = ".\TerraformMrbPolicies"
)

# Ensure AWSPowerShell.NetCore is loaded
Import-Module AWSPowerShell.NetCore -ErrorAction Stop

# Create output directory if it doesn't exist
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

Write-Host "Fetching managed policies for user '$UserName'..."

# Get attached managed policies
$attachedPolicies = Get-IAMAttachedUserPolicyList -UserName $UserName

foreach ($policy in $attachedPolicies.AttachedPolicies) {
    $policyArn = $policy.PolicyArn
    $policyName = $policy.PolicyName

    $policyDetails = Get-IAMPolicy -PolicyArn $policyArn
    $version = Get-IAMPolicyVersion -PolicyArn $policyArn -VersionId $policyDetails.Policy.DefaultVersionId
    $policyJson = $version.PolicyVersion.Document | ConvertTo-Json -Depth 10

    $filePath = Join-Path $OutputDir "$UserName-managed-$policyName.json"
    $policyJson | Out-File -FilePath $filePath -Encoding utf8
    Write-Host "Saved managed policy '$policyName' to $filePath"
}

Write-Host "Fetching inline policies for user '$UserName'..."

# Get inline policies
$inlinePolicyNames = Get-IAMUserPolicyList -UserName $UserName

foreach ($policyName in $inlinePolicyNames.PolicyNames) {
    $policyDoc = Get-IAMUserPolicy -UserName $UserName -PolicyName $policyName
    $policyJson = $policyDoc.PolicyDocument | ConvertTo-Json -Depth 10

    $filePath = Join-Path $OutputDir "$UserName-inline-$policyName.json"
    $policyJson | Out-File -FilePath $filePath -Encoding utf8
    Write-Host "Saved inline policy '$policyName' to $filePath"
}

Write-Host "`nAll IAM policies for user '$UserName' dumped to: $OutputDir"
