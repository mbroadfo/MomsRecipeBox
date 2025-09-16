# Setup MongoDB Atlas with Terraform
param(
    [Parameter(Mandatory = $false)]
    [switch]$Init,

    [Parameter(Mandatory = $false)]
    [switch]$Plan,

    [Parameter(Mandatory = $false)]
    [switch]$Apply,

    [Parameter(Mandatory = $false)]
    [switch]$Destroy,

    [Parameter(Mandatory = $false)]
    [string]$VarFile = "mongodb_atlas.tfvars"
)

$InfraDir = Join-Path $PSScriptRoot "infra"

# Check if terraform is installed
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Error "Terraform is not installed. Please install Terraform first."
    exit 1
}

# Change to the infrastructure directory
Push-Location $InfraDir

try {
    # Check if variables file exists
    if (-not (Test-Path $VarFile) -and -not $Init) {
        Write-Warning "Variables file $VarFile not found. Please create it from the example."
        Write-Host "You can copy mongodb_atlas.tfvars.example to $VarFile and update the values."
        $createVarFile = Read-Host "Do you want to create $VarFile from the example? (y/n)"
        
        if ($createVarFile -eq "y") {
            Copy-Item "mongodb_atlas.tfvars.example" $VarFile
            Write-Host "Created $VarFile from example. Please edit the file with your MongoDB Atlas credentials."
            exit 0
        } else {
            Write-Error "Cannot continue without a variables file."
            exit 1
        }
    }

    # Execute terraform commands
    if ($Init) {
        Write-Host "Initializing Terraform..." -ForegroundColor Cyan
        terraform init
    }
    elseif ($Plan) {
        Write-Host "Planning Terraform deployment..." -ForegroundColor Cyan
        terraform plan -var-file="$VarFile"
    }
    elseif ($Apply) {
        Write-Host "Applying Terraform deployment..." -ForegroundColor Yellow
        terraform apply -var-file="$VarFile"
        
        # Output connection string if apply was successful
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nGetting MongoDB connection details..." -ForegroundColor Green
            $connectionString = terraform output -json | ConvertFrom-Json
            
            Write-Host "`nMongoDB Atlas cluster has been provisioned!" -ForegroundColor Green
            Write-Host "SRV Address: $($connectionString.mongodb_srv_address.value)"
            Write-Host "To get the full connection string (with credentials): terraform output mongodb_connection_string"
            
            # Update environment variable example
            Write-Host "`nUpdate your .env file with the following:" -ForegroundColor Cyan
            Write-Host "MONGODB_URI=mongodb+srv://mrbapp:<PASSWORD>@$($connectionString.mongodb_srv_address.value)/momsrecipebox?retryWrites=true&w=majority"
            Write-Host "MONGODB_DB_NAME=momsrecipebox"
        }
    }
    elseif ($Destroy) {
        Write-Host "WARNING: This will destroy your MongoDB Atlas resources!" -ForegroundColor Red
        $confirm = Read-Host "Are you sure you want to proceed? (yes/no)"
        
        if ($confirm -eq "yes") {
            Write-Host "Destroying Terraform deployment..." -ForegroundColor Red
            terraform destroy -var-file="$VarFile"
        } else {
            Write-Host "Destroy operation canceled." -ForegroundColor Green
        }
    }
    else {
        Write-Host "Please specify an operation: -Init, -Plan, -Apply, or -Destroy" -ForegroundColor Yellow
    }
}
finally {
    # Return to the original directory
    Pop-Location
}