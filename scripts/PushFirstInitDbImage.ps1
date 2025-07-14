Write-Host "Logging into ECR..."
$region = "us-west-2"
$accountId = "491696534851"
$ecrTag = "$accountId.dkr.ecr.$region.amazonaws.com/init-mrb-db:init-db"

aws ecr get-login-password --region $region | docker login --username AWS --password-stdin "$accountId.dkr.ecr.$region.amazonaws.com"

Write-Host "Building Docker image (classic builder)..."

$repoRoot = "$PSScriptRoot\.."
$dockerfilePath = "$repoRoot\app\lambdas\init-mrb-db\Dockerfile"

# Enable BuildKit and disable default attestations to avoid manifest list
$env:DOCKER_BUILDKIT = "1"
$env:BUILDX_NO_DEFAULT_ATTESTATIONS = "1"

docker build `
  --platform linux/amd64 `
  --file $dockerfilePath `
  --tag $ecrTag `
  --no-cache `
  "$repoRoot"

Write-Host "Pushing image to ECR..."
docker push $ecrTag

Write-Host "`n Image pushed successfully to $ecrTag"

$imageDigest = docker inspect --format='{{index .RepoDigests 0}}' 491696534851.dkr.ecr.us-west-2.amazonaws.com/init-mrb-db:init-db
$imageDigest | Out-File -Encoding utf8 -FilePath "$PSScriptRoot\..\infra\.init-db-image-digest.txt"
Write-Host "`n Image digest written to init-db-image-digest.txt"