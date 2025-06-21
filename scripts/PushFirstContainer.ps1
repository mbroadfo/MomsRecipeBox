# PushFirstContainer.ps1 - Fixed for Lambda compatibility

# 1️⃣ Authenticate Docker to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin 491696534851.dkr.ecr.us-west-2.amazonaws.com

# 2️⃣ Build your app container (FIXED: disable attestations for Lambda compatibility)
docker build --platform linux/amd64 --provenance=false --sbom=false -t mrb-app-api:latest app

# 3️⃣ Tag the image for ECR
docker tag mrb-app-api:latest 491696534851.dkr.ecr.us-west-2.amazonaws.com/mrb-app-api:latest

# 4️⃣ Push to ECR
docker push 491696534851.dkr.ecr.us-west-2.amazonaws.com/mrb-app-api:latest