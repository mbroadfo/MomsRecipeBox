# PushAppTierContainer.ps1 - Tags with latest and Git SHA, for Lambda compatibility

# Get short Git SHA
$gitSha = (& git rev-parse --short HEAD).ToString().Trim()
$repoUri = "491696534851.dkr.ecr.us-west-2.amazonaws.com/mrb-app-api"
Write-Output "GitHub SHA: $gitSha"

# Authenticate Docker to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin $repoUri

# Build your app container (FIXED: disable attestations for Lambda compatibility)
# Build from repository root to include both app/ and tools/ directories
docker build --platform linux/amd64 --provenance=false --sbom=false -f app/Dockerfile -t mrb-app-api:latest .

# Tag image with 'latest' and short Git SHA
docker tag mrb-app-api:latest "$($repoUri):latest"
docker tag mrb-app-api:latest "$($repoUri):dev"
docker tag mrb-app-api:latest "$($repoUri):git-$gitSha"

# Push all tags
docker push "$($repoUri):latest"
docker push "$($repoUri):dev"
docker push "$($repoUri):git-$gitSha"

# Force Lambda to pull the updated 'dev' image
$imageUri = "$($repoUri):dev"
Write-Host "Updating Lambda with image: $imageUri"
aws lambda update-function-code --function-name mrb-app-api --image-uri "$imageUri"


