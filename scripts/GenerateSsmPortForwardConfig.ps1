# Load environment
. "$PSScriptRoot/../.env.ps1"

# Extract endpoint from Terraform output
$writerEndpoint = terraform output -raw aurora_dsql_writer_endpoint

# Create JSON object
$portForwardConfig = @{
    host             = @($writerEndpoint)
    portNumber       = @("3306")
    localPortNumber  = @("3306")
}

# Save to file
$portForwardConfig | ConvertTo-Json -Depth 3 | Set-Content -Path "$PSScriptRoot/../infra/ssm-port-forward.json" -Encoding UTF8

Write-Host "✅ ssm-port-forward.json updated with host: $writerEndpoint"
