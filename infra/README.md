# Infrastructure (Terraform)

This directory contains Terraform configuration for deploying MomsRecipeBox to AWS infrastructure. It manages the complete cloud deployment including API Gateway, Lambda functions, S3 storage, CloudFront CDN, and security components.

## 🏗️ Architecture Overview

### Core Components

- **API Gateway**: RESTful API endpoints with JWT authentication
- **Lambda Functions**: Serverless application runtime (mrb-app-api)
- **JWT Authorizer**: Auth0-integrated Lambda authorizer (mrb-jwt-authorizer)
- **S3 Buckets**: Recipe images and UI hosting
- **CloudFront**: CDN for UI distribution
- **MongoDB Atlas**: Managed database integration
- **ECR**: Container registry for Lambda deployment

### Security Features

- **JWT Authentication**: API Gateway custom authorizer with Auth0 integration
- **IAM Roles**: Least-privilege access for Lambda execution
- **Secrets Manager**: Secure configuration management
- **VPC Integration**: Secure network isolation

## 🚀 Quick Start

### Prerequisites

- Terraform >= 1.0
- AWS CLI configured with appropriate profiles
- Node.js for build scripts

### Essential Commands

```bash
# Switch to Terraform AWS profile
npm run aws:terraform
$env:AWS_PROFILE="terraform-mrb"  # PowerShell

# Plan infrastructure changes
terraform plan -var="enable_app_api=true"

# Apply infrastructure
terraform apply -var="enable_app_api=true"

# Build JWT authorizer package
npm run build:jwt-authorizer
```

## 📁 File Structure

```text
infra/
├── app_api.tf              # API Gateway, Lambda functions, JWT authorizer
├── variables.tf            # Terraform variable definitions
├── outputs.tf              # Infrastructure outputs (URLs, ARNs)
├── main.tf                 # Provider configuration and core resources
├── mongodb_atlas.tf        # MongoDB Atlas cluster and database
├── s3_ui_hosting.tf        # S3 + CloudFront for frontend hosting
├── s3_images.tf            # S3 bucket for recipe images
├── s3_backups.tf           # S3 bucket for database backups
├── secrets.tf              # AWS Secrets Manager configuration
├── jwt_authorizer.js       # Auth0 JWT validation Lambda function
├── package.json            # JWT authorizer dependencies
└── jwt_authorizer.zip      # Built deployment package
```

## 🔐 JWT Authentication

### Architecture

The JWT authentication system uses API Gateway custom authorizer with Auth0 integration:

1. **Client Request**: Includes `Authorization: Bearer <jwt_token>` header
2. **API Gateway**: Invokes JWT authorizer Lambda for token validation
3. **JWT Authorizer**: Validates token against Auth0 JWKS and audience
4. **Authorization**: Returns IAM policy allowing/denying request
5. **Caching**: 300-second TTL for performance optimization

### Configuration

```terraform
# Auth0 Configuration
auth0_domain = "momsrecipebox.us.auth0.com"
auth0_audience = "https://momsrecipebox.com/api"
```

### Protected Endpoints

All API methods require JWT authentication except OPTIONS (for CORS):

- `GET /recipes` - List recipes
- `POST /recipes` - Create recipe
- `PUT /recipes/{id}` - Update recipe
- `DELETE /recipes/{id}` - Delete recipe
- `POST /recipe/{id}/like` - Toggle like
- `POST /recipe/comment` - Create comment
- `PUT /recipe/comment/{id}` - Update comment
- `DELETE /recipe/comment/{id}` - Delete comment
- `GET /recipe/{id}/image` - Get recipe image
- `PUT /recipe/{id}/image` - Upload recipe image
- `DELETE /recipe/{id}/image` - Delete recipe image

## 🔧 Development Workflow

### Building JWT Authorizer

```bash
# Build deployment package with dependencies
npm run build:jwt-authorizer

# Package includes:
# - jwt_authorizer.js (Auth0 validation logic)
# - node_modules/ (jsonwebtoken, jwks-rsa dependencies)
# - package.json (dependency manifest)
```

### Testing Changes

```bash
# Local testing (requires API running)
$env:APP_MODE='lambda'
$env:APP_BASE_URL='https://your-api-gateway-url.amazonaws.com/dev'
cd ../app/tests
node test_recipes.js
```

### Deployment Process

1. **Build Dependencies**: `npm run build:jwt-authorizer`
2. **Plan Changes**: `terraform plan -var="enable_app_api=true"`
3. **Apply Infrastructure**: `terraform apply -var="enable_app_api=true"`
4. **Verify Deployment**: Test API endpoints with valid JWT tokens

## 🔍 Monitoring & Logging

### CloudWatch Log Groups

- `/aws/lambda/mrb-app-api` - Application logs (3-day retention)
- `/aws/lambda/mrb-jwt-authorizer` - Auth logs (1-day retention)

### Key Metrics to Monitor

- JWT authorizer invocation count and duration
- API Gateway 4xx/5xx error rates
- Lambda function duration and memory usage
- MongoDB Atlas connection health

## 🛠️ Troubleshooting

### Common Issues

**JWT Authorizer Module Errors**:

```bash
# Rebuild with dependencies
npm run build:jwt-authorizer
aws lambda update-function-code --function-name mrb-jwt-authorizer --zip-file fileb://jwt_authorizer.zip
```

**API Gateway 401 Errors**:

- Verify JWT token format and Auth0 configuration
- Check CloudWatch logs for specific validation errors
- Ensure proper Authorization header format

**Terraform State Issues**:

```bash
# Import existing resources
terraform import 'aws_cloudwatch_log_group.app_lambda_logs[0]' '/aws/lambda/mrb-app-api'
```

### Debug Commands

```bash
# Check JWT authorizer logs
aws logs describe-log-streams --log-group-name "/aws/lambda/mrb-jwt-authorizer"

# Test API Gateway directly
curl -H "Authorization: Bearer <valid_jwt>" https://your-api-gateway-url.amazonaws.com/dev/recipes

# Verify Lambda function
aws lambda invoke --function-name mrb-jwt-authorizer --payload '{}' response.json
```

## 📊 Resource Management

### Cost Optimization

- **Lambda**: Pay-per-invocation pricing
- **API Gateway**: Pay-per-request with caching
- **CloudWatch**: Automatic log retention for cost control
- **S3**: Lifecycle policies for image optimization

### Scaling Considerations

- **JWT Authorizer**: 300-second cache TTL reduces invocations
- **Lambda Concurrency**: Auto-scaling based on request volume
- **MongoDB Atlas**: Managed scaling with connection pooling
- **CloudFront**: Global CDN for UI performance

## 🔒 Security Best Practices

### IAM Principles

- **Least Privilege**: Each role has minimal required permissions
- **Role Separation**: Different roles for Lambda execution vs API Gateway invocation
- **Resource Scoping**: Permissions limited to specific resources

### Auth0 Integration

- **JWKS Validation**: Dynamic key rotation support
- **Audience Verification**: Prevents token reuse across applications
- **Issuer Validation**: Ensures tokens from correct Auth0 domain

## 📝 Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `enable_app_api` | Enable API Gateway and Lambda resources | `false` | Yes |
| `auth0_domain` | Auth0 tenant domain | `momsrecipebox.us.auth0.com` | Yes |
| `auth0_audience` | JWT audience for API | `https://momsrecipebox.com/api` | Yes |
| `recipe_images_bucket` | S3 bucket for images | `mrb-recipe-images-dev` | Yes |
| `aws_secret_name` | Secrets Manager secret name | `mrb-mongodb-atlas` | Yes |

## 🚀 Outputs Reference

| Output | Description |
|--------|-------------|
| `api_gateway_url` | API Gateway base URL |
| `ui_cloudfront_url` | CloudFront distribution URL |
| `recipe_images_bucket_url` | S3 bucket URL for images |
| `mongodb_srv_address` | MongoDB Atlas connection string |

---

*This infrastructure supports the complete MomsRecipeBox cloud deployment with security, scalability, and cost optimization.*
