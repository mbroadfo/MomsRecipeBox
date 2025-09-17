# Get-MongoAtlasUri.ps1
# This script retrieves the MongoDB Atlas URI from AWS Secrets Manager
# and outputs it for use in Docker Compose or other scripts

param(
    [Parameter(Mandatory=$false)]
    [string]$SecretName = "moms-recipe-secrets-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-west-2",
    
    [Parameter(Mandatory=$false)]
    [switch]$AsEnvironmentVariable
)

try {
    # Get MongoDB URI from AWS Secrets Manager
    $secretJson = aws secretsmanager get-secret-value --secret-id $SecretName --region $Region 2>$null | ConvertFrom-Json
    
    if ($secretJson) {
        $secrets = $secretJson.SecretString | ConvertFrom-Json
        $MongoUri = $secrets.MONGODB_URI
        
        if (-not $MongoUri) {
            Write-Error "MongoDB URI not found in AWS Secrets Manager (secret: $SecretName)"
            exit 1
        }
        
        if ($AsEnvironmentVariable) {
            # Output as environment variable setting for use in .env file or similar
            "MONGODB_ATLAS_URI=$MongoUri"
        } else {
            # Output just the URI
            $MongoUri
        }
    } else {
        Write-Error "Failed to retrieve secret from AWS Secrets Manager"
        exit 1
    }
} catch {
    Write-Error "Error accessing AWS Secrets Manager: $_"
    exit 1
}