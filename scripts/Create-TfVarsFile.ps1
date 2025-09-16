# Create-TfVarsFile.ps1
# This script creates a tfvars file with MongoDB Atlas credentials
# It prompts for the sensitive information to avoid storing it in scripts

param(
    [Parameter(Mandatory=$false)]
    [string]$OutputFile = ".\infra\mongodb_atlas.tfvars"
)

Write-Host "MongoDB Atlas Terraform Variables Setup" -ForegroundColor Cyan
Write-Host "This script will create a tfvars file with your MongoDB Atlas credentials" -ForegroundColor Cyan
Write-Host "WARNING: The file will contain sensitive information and should not be committed to Git" -ForegroundColor Yellow
Write-Host ""

# Prompt for credentials
$publicKey = Read-Host "Enter MongoDB Atlas Public Key"
$privateKey = Read-Host "Enter MongoDB Atlas Private Key" -AsSecureString
$privateKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($privateKey))
$orgId = Read-Host "Enter MongoDB Atlas Organization ID"
$projectId = Read-Host "Enter MongoDB Atlas Project ID"
$password = Read-Host "Enter MongoDB Atlas Database User Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

# Get current IP for development access
$ip = (Invoke-RestMethod -Uri "https://api.ipify.org?format=text").Trim()
Write-Host "Your current IP address is: $ip" -ForegroundColor Green

# Ask about development access
$accessType = Read-Host "Allow MongoDB access from: (1) Your current IP only (recommended), (2) Anywhere (0.0.0.0/0)"
$cidrBlock = if ($accessType -eq "2") { "0.0.0.0/0" } else { "$ip/32" }

# Create tfvars content
$tfvarsContent = @"
# MongoDB Atlas Configuration
# DO NOT COMMIT THIS FILE TO GIT!
# Created on $(Get-Date)

mongodb_atlas_public_key  = "$publicKey"
mongodb_atlas_private_key = "$privateKeyPlain"
mongodb_atlas_org_id      = "$orgId"
mongodb_atlas_project_id  = "$projectId"
mongodb_atlas_password    = "$passwordPlain"
development_cidr_block    = "$cidrBlock"
lambda_cidr_block         = ""
"@

# Save to file
Set-Content -Path $OutputFile -Value $tfvarsContent
Write-Host "✅ MongoDB Atlas secrets saved to $OutputFile" -ForegroundColor Green
Write-Host "⚠️  This file contains sensitive information and should not be committed to Git" -ForegroundColor Yellow