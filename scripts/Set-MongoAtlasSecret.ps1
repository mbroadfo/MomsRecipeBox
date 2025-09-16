# Set-MongoAtlasSecret.ps1
# This script creates or updates the MongoDB Atlas secret in AWS Secrets Manager

param(
    [Parameter(Mandatory=$false)]
    [string]$SecretName = "moms-recipe-secrets-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-west-2",
    
    [Parameter(Mandatory=$false)]
    [string]$PublicKey,
    
    [Parameter(Mandatory=$false)]
    [string]$PrivateKey,
    
    [Parameter(Mandatory=$false)]
    [string]$OrgId,
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectId,
    
    [Parameter(Mandatory=$false)]
    [string]$Password,
    
    [Parameter(Mandatory=$false)]
    [string]$MongoUri,
    
    [Parameter(Mandatory=$false)]
    [switch]$Interactive,
    
    [Parameter(Mandatory=$false)]
    [switch]$UpdateIp
)

Write-Host "MongoDB Atlas Secret Management" -ForegroundColor Cyan
Write-Host "-----------------------------" -ForegroundColor Cyan

# Check if AWS CLI is installed
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Error "AWS CLI is not installed. Please install it first."
    exit 1
}

# Function to check if a secret exists
function Test-SecretExists {
    param(
        [string]$Name,
        [string]$Region
    )
    
    try {
        $null = aws secretsmanager describe-secret --secret-id $Name --region $Region 2>$null
        return $true
    }
    catch {
        return $false
    }
}

# Function to get current values if the secret exists
function Get-ExistingSecret {
    param(
        [string]$Name,
        [string]$Region
    )
    
    try {
        $secretJson = aws secretsmanager get-secret-value --secret-id $Name --region $Region | ConvertFrom-Json
        return $secretJson.SecretString | ConvertFrom-Json
    }
    catch {
        return $null
    }
}

# Interactive mode to gather values
if ($Interactive) {
    $existingSecret = $null
    $secretExists = Test-SecretExists -Name $SecretName -Region $Region
    
    if ($secretExists) {
        Write-Host "Secret '$SecretName' already exists." -ForegroundColor Yellow
        $existingSecret = Get-ExistingSecret -Name $SecretName -Region $Region
        Write-Host "Existing values will be shown as defaults. Press Enter to keep existing values." -ForegroundColor Yellow
    }
    
    if (-not $PublicKey) {
        $defaultValue = if ($existingSecret) { $existingSecret.MONGODB_ATLAS_PUBLIC_KEY } else { "" }
        $PublicKey = Read-Host "MongoDB Atlas Public Key [$defaultValue]"
        if (-not $PublicKey -and $defaultValue) { $PublicKey = $defaultValue }
    }
    
    if (-not $PrivateKey) {
        $defaultValue = if ($existingSecret) { $existingSecret.MONGODB_ATLAS_PRIVATE_KEY } else { "" }
        $PrivateKey = Read-Host "MongoDB Atlas Private Key [$defaultValue]"
        if (-not $PrivateKey -and $defaultValue) { $PrivateKey = $defaultValue }
    }
    
    if (-not $OrgId) {
        $defaultValue = if ($existingSecret) { $existingSecret.MONGODB_ATLAS_ORG_ID } else { "" }
        $OrgId = Read-Host "MongoDB Atlas Organization ID [$defaultValue]"
        if (-not $OrgId -and $defaultValue) { $OrgId = $defaultValue }
    }
    
    if (-not $ProjectId) {
        $defaultValue = if ($existingSecret) { $existingSecret.MONGODB_ATLAS_PROJECT_ID } else { "" }
        $ProjectId = Read-Host "MongoDB Atlas Project ID [$defaultValue]"
        if (-not $ProjectId -and $defaultValue) { $ProjectId = $defaultValue }
    }
    
    if (-not $Password) {
        $defaultValue = if ($existingSecret) { $existingSecret.MONGODB_ATLAS_PASSWORD } else { "" }
        $Password = Read-Host "MongoDB Atlas User Password [$defaultValue]" -AsSecureString
        if ($Password.Length -eq 0 -and $defaultValue) { 
            $Password = $defaultValue 
        } else {
            $Password = [System.Net.NetworkCredential]::new("", $Password).Password
        }
    }
    
    if (-not $MongoUri) {
        $defaultValue = if ($existingSecret) { $existingSecret.MONGODB_URI } else { "" }
        $MongoUri = Read-Host "MongoDB URI (optional) [$defaultValue]"
        if (-not $MongoUri -and $defaultValue) { $MongoUri = $defaultValue }
    }
    
    # Get development and lambda CIDR blocks
    $defaultDevCidr = if ($existingSecret -and $existingSecret.DEVELOPMENT_CIDR_BLOCK) { 
        $existingSecret.DEVELOPMENT_CIDR_BLOCK 
    } else { "" }
    
    $defaultLambdaCidr = if ($existingSecret -and $existingSecret.LAMBDA_CIDR_BLOCK) { 
        $existingSecret.LAMBDA_CIDR_BLOCK 
    } else { "" }
    
    # Ask if user wants to update development IP
    $updateDevIp = $UpdateIp
    if (-not $updateDevIp) {
        $updateResponse = Read-Host "Update development IP to current IP? (Y/N) [Y]"
        $updateDevIp = ($updateResponse -eq "" -or $updateResponse -eq "Y" -or $updateResponse -eq "y")
    }
    
    if ($updateDevIp) {
        $ip = (Invoke-RestMethod -Uri "https://api.ipify.org?format=text").Trim()
        $devCidr = "$ip/32"
        Write-Host "Development IP updated to: $devCidr" -ForegroundColor Yellow
    } else {
        $devCidr = Read-Host "Development CIDR Block [$defaultDevCidr]"
        if (-not $devCidr -and $defaultDevCidr) { $devCidr = $defaultDevCidr }
    }
    
    $lambdaCidr = Read-Host "Lambda CIDR Block (optional) [$defaultLambdaCidr]"
    if (-not $lambdaCidr -and $defaultLambdaCidr) { $lambdaCidr = $defaultLambdaCidr }
}
else {
    # In non-interactive mode, get existing values for any missing parameters
    if (Test-SecretExists -Name $SecretName -Region $Region) {
        $existingSecret = Get-ExistingSecret -Name $SecretName -Region $Region
        
        if (-not $PublicKey -and $existingSecret.MONGODB_ATLAS_PUBLIC_KEY) { 
            $PublicKey = $existingSecret.MONGODB_ATLAS_PUBLIC_KEY 
        }
        
        if (-not $PrivateKey -and $existingSecret.MONGODB_ATLAS_PRIVATE_KEY) { 
            $PrivateKey = $existingSecret.MONGODB_ATLAS_PRIVATE_KEY 
        }
        
        if (-not $OrgId -and $existingSecret.MONGODB_ATLAS_ORG_ID) { 
            $OrgId = $existingSecret.MONGODB_ATLAS_ORG_ID 
        }
        
        if (-not $ProjectId -and $existingSecret.MONGODB_ATLAS_PROJECT_ID) { 
            $ProjectId = $existingSecret.MONGODB_ATLAS_PROJECT_ID 
        }
        
        if (-not $Password -and $existingSecret.MONGODB_ATLAS_PASSWORD) { 
            $Password = $existingSecret.MONGODB_ATLAS_PASSWORD 
        }
        
        if (-not $MongoUri -and $existingSecret.MONGODB_URI) { 
            $MongoUri = $existingSecret.MONGODB_URI 
        }
        
        $devCidr = $existingSecret.DEVELOPMENT_CIDR_BLOCK
        $lambdaCidr = $existingSecret.LAMBDA_CIDR_BLOCK
    }
    
    # Update IP if requested
    if ($UpdateIp) {
        $ip = (Invoke-RestMethod -Uri "https://api.ipify.org?format=text").Trim()
        $devCidr = "$ip/32"
        Write-Host "Development IP updated to: $devCidr" -ForegroundColor Yellow
    }
}

# Check if required values are provided
if (-not $PublicKey -or -not $PrivateKey -or -not $OrgId -or -not $ProjectId -or -not $Password) {
    Write-Error "Missing required parameters. Please provide all required values."
    exit 1
}

# Create secret content
$secretContent = @{
    MONGODB_ATLAS_PUBLIC_KEY  = $PublicKey
    MONGODB_ATLAS_PRIVATE_KEY = $PrivateKey
    MONGODB_ATLAS_ORG_ID      = $OrgId
    MONGODB_ATLAS_PROJECT_ID  = $ProjectId
    MONGODB_ATLAS_PASSWORD    = $Password
    DEVELOPMENT_CIDR_BLOCK    = $devCidr
    LAMBDA_CIDR_BLOCK         = $lambdaCidr
}

if ($MongoUri) {
    $secretContent.MONGODB_URI = $MongoUri
}

# Convert to JSON
$secretString = $secretContent | ConvertTo-Json -Compress

# Check if secret exists and create or update accordingly
if (Test-SecretExists -Name $SecretName -Region $Region) {
    # Update existing secret
    aws secretsmanager put-secret-value --secret-id $SecretName --secret-string $secretString --region $Region | Out-Null
    Write-Host "✅ Secret '$SecretName' updated successfully." -ForegroundColor Green
} else {
    # Create new secret
    aws secretsmanager create-secret --name $SecretName --description "MongoDB Atlas credentials for MomsRecipeBox" --secret-string $secretString --region $Region | Out-Null
    Write-Host "✅ Secret '$SecretName' created successfully." -ForegroundColor Green
}

Write-Host "`nSecret Name: $SecretName" -ForegroundColor Cyan
Write-Host "Contains the following keys:" -ForegroundColor Cyan
Write-Host " - MONGODB_ATLAS_PUBLIC_KEY" -ForegroundColor Gray
Write-Host " - MONGODB_ATLAS_PRIVATE_KEY" -ForegroundColor Gray
Write-Host " - MONGODB_ATLAS_ORG_ID" -ForegroundColor Gray
Write-Host " - MONGODB_ATLAS_PROJECT_ID" -ForegroundColor Gray
Write-Host " - MONGODB_ATLAS_PASSWORD" -ForegroundColor Gray
Write-Host " - DEVELOPMENT_CIDR_BLOCK" -ForegroundColor Gray
Write-Host " - LAMBDA_CIDR_BLOCK" -ForegroundColor Gray
if ($MongoUri) {
    Write-Host " - MONGODB_URI" -ForegroundColor Gray
}

Write-Host "`nTo use these secrets in Terraform:" -ForegroundColor Cyan
Write-Host "terraform init" -ForegroundColor Gray
Write-Host "terraform plan" -ForegroundColor Gray
Write-Host "terraform apply" -ForegroundColor Gray