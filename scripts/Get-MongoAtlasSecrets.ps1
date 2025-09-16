# Get-MongoAtlasSecrets.ps1
# This script fetches MongoDB Atlas credentials from AWS Secrets Manager
# and provides multiple output options including creating a tfvars file

param(
    [Parameter(Mandatory=$false)]
    [string]$SecretName = "moms-recipe-secrets-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-west-2",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFile,
    
    [Parameter(Mandatory=$false)]
    [switch]$AsEnvironmentVariables,
    
    [Parameter(Mandatory=$false)]
    [switch]$AsHashtable,
    
    [Parameter(Mandatory=$false)]
    [switch]$UpdateIp
)

Write-Host "Fetching MongoDB Atlas secrets from AWS Secrets Manager..." -ForegroundColor Cyan

try {
    # Check if AWS CLI is installed
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Error "AWS CLI is not installed. Please install it first."
        exit 1
    }
    
    # Fetch the unified secret from AWS Secrets Manager
    $secretJson = aws secretsmanager get-secret-value --secret-id $SecretName --region $Region | ConvertFrom-Json
    $secrets = $secretJson.SecretString | ConvertFrom-Json
    
    # Get current IP for development access if requested
    if ($UpdateIp) {
        $ip = (Invoke-RestMethod -Uri "https://api.ipify.org?format=text").Trim()
        $secrets.DEVELOPMENT_CIDR_BLOCK = "$ip/32"
        
        # Update the secret in AWS with the new IP
        $updatedSecretString = $secrets | ConvertTo-Json -Compress
        aws secretsmanager put-secret-value --secret-id $SecretName --secret-string $updatedSecretString --region $Region | Out-Null
        Write-Host "Updated development IP to $ip in AWS Secrets Manager" -ForegroundColor Yellow
    }
    
    # Set environment variables if requested
    if ($AsEnvironmentVariables) {
        foreach ($property in $secrets.PSObject.Properties) {
            $envVarName = $property.Name
            $envVarValue = $property.Value
            
            # Set the environment variable
            [Environment]::SetEnvironmentVariable($envVarName, $envVarValue, "Process")
            Write-Host "Environment variable set: $envVarName" -ForegroundColor Cyan
        }
        
        Write-Host "All MongoDB Atlas secrets have been set as environment variables" -ForegroundColor Green
    }
    
    # Create tfvars file if requested
    if ($OutputFile) {
        # Create tfvars content
        $tfvarsContent = @"
# MongoDB Atlas Configuration
# DO NOT COMMIT THIS FILE TO GIT!
# Auto-generated on $(Get-Date)

mongodb_atlas_public_key  = "$($secrets.MONGODB_ATLAS_PUBLIC_KEY)"
mongodb_atlas_private_key = "$($secrets.MONGODB_ATLAS_PRIVATE_KEY)"
mongodb_atlas_org_id      = "$($secrets.MONGODB_ATLAS_ORG_ID)"
mongodb_atlas_project_id  = "$($secrets.MONGODB_ATLAS_PROJECT_ID)"
mongodb_atlas_password    = "$($secrets.MONGODB_ATLAS_PASSWORD)"
development_cidr_block    = "$($secrets.DEVELOPMENT_CIDR_BLOCK)"
lambda_cidr_block         = "$($secrets.LAMBDA_CIDR_BLOCK)"
"@
        
        # Save to file
        Set-Content -Path $OutputFile -Value $tfvarsContent
        Write-Host "✅ MongoDB Atlas secrets saved to $OutputFile" -ForegroundColor Green
    }
    
    # Return as hashtable if requested
    if ($AsHashtable) {
        $result = @{}
        foreach ($property in $secrets.PSObject.Properties) {
            $result[$property.Name] = $property.Value
        }
        return $result
    }
    else {
        # Return the secrets object by default if no other output method is specified
        if (-not ($OutputFile -or $AsEnvironmentVariables)) {
            return $secrets
        }
    }
    
} catch {
    Write-Error "Error fetching secrets: $_"
    exit 1
}