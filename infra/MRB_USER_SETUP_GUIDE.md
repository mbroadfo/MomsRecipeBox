# MRB Terraform User Setup Guide

## Overview
This guide provides the consolidated policy information for creating a dedicated `terraform-mrb` IAM user with clean MRB-specific permissions, excluding cruise-finder references.

## Step 1: Create User via AWS Console
1. Navigate to IAM > Users in AWS Console
2. Create new user named: `terraform-mrb`
3. Add tags:
   - `Purpose`: MRB Terraform Operations
   - `Application`: MomsRecipeBox

## Step 2: Create Access Keys
1. Go to the terraform-mrb user
2. Create new access key pair
3. Save credentials for local AWS CLI configuration

## Step 3: Attach Policies
The following 4 **refined** policies need to be created and attached to the terraform-mrb user:

### 1. terraform-mrb-infra (Refined)
**Purpose**: ECR (for Lambda container images), S3 (for backups/images), CloudWatch Logs
**Removed**: ECS (not used), Events (not used)
**ARN**: `arn:aws:iam::491696534851:policy/terraform-mrb-infra`

### 2. terraform-mrb-services (Refined) 
**Purpose**: API Gateway, Lambda (MRB functions only), limited IAM role management
**Removed**: EC2/VPC (Lambda doesn't use VPC), broad IAM permissions
**ARN**: `arn:aws:iam::491696534851:policy/terraform-mrb-services`

### 3. terraform-mrb-secrets (Unchanged)
**Purpose**: Secrets Manager access for MRB-specific secrets
**ARN**: `arn:aws:iam::491696534851:policy/terraform-mrb-secrets`

### 4. terraform-mrb-passrole (Refined)
**Purpose**: PassRole permissions for app_lambda_role only
**Removed**: lambda_exec_role, ecsTaskExecutionRole (not MRB-specific)
**ARN**: `arn:aws:iam::491696534851:policy/terraform-mrb-passrole`

## Key Refinements Made

### What Was Removed:
- **ECS permissions** (MRB uses Lambda, not ECS)
- **Events permissions** (not used by MRB)
- **EC2/VPC permissions** (MRB Lambda doesn't use VPC)
- **Broad IAM permissions** (limited to MRB resources only)
- **Generic roles** (removed lambda_exec_role, ecsTaskExecutionRole)

### What Was Restricted:
- **ECR access** limited to `mrb-*` repositories
- **Lambda access** limited to `mrb-*` functions  
- **IAM role management** limited to `app_lambda_role` and `mrb-*` policies
- **PassRole** limited to `app_lambda_role` only

### Why Each Policy Is Needed:
1. **terraform-mrb-infra**: Deploy Lambda container images via ECR, manage S3 buckets for backups/images
2. **terraform-mrb-services**: Create API Gateway endpoints, deploy Lambda functions, manage Lambda execution role
3. **terraform-mrb-secrets**: Access MongoDB Atlas credentials stored in Secrets Manager
4. **terraform-mrb-passrole**: Allow Lambda to assume the app_lambda_role for execution

## Step 4: Policy Creation Commands
If the policies don't exist yet, you can create them via terraform:
```bash
terraform apply -target=aws_iam_policy.terraform_mrb_infra -target=aws_iam_policy.terraform_mrb_services -target=aws_iam_policy.terraform_mrb_secrets -target=aws_iam_policy.terraform_mrb_passrole
```

## Step 5: Manual Policy Attachments
After the policies are created, attach them to the terraform-mrb user via AWS Console:
1. Go to IAM > Users > terraform-mrb
2. Click "Add permissions" > "Attach policies directly"
3. Search for and attach each of the 4 policies listed above

## Step 6: Additional S3 Access
You'll also need to manually attach the existing `mrb-api-s3-access` policy to both:
- `terraform-mrb` user (for terraform operations)
- `mrb-api` user (for backup operations)

## Step 7: Configure Local AWS CLI
```bash
aws configure --profile terraform-mrb
# Enter the access key and secret from Step 2
# Region: us-west-2
# Output format: json
```

## Step 8: Test Access
Once setup is complete, test S3 access:
```bash
aws s3 ls s3://mrb-mongodb-backups-dev --profile terraform-mrb
```

## Key Benefits of This Approach
- **Clean separation**: No cruise-finder permissions mixed in
- **Minimal permissions**: Only what's needed for MRB operations  
- **S3 access**: Includes both recipe images and backup buckets
- **Secrets access**: MRB-specific secrets only
- **Role management**: Can pass MRB-specific roles only

## Policies Excluded from Original terraform User
The following policies from the original terraform user are **NOT** included:
- `terraform-rds` (MRB uses MongoDB Atlas, not RDS)
- `terraform-task-access` (cruise-finder specific)
- `terraform-pass-roll` (cruise-finder specific roles)
- `terraform-infra-policy` (mixed cruise-finder + MRB, replaced with clean MRB-only version)

## Next Steps After Setup
1. Switch local terraform operations to use `terraform-mrb` profile
2. Upload MongoDB backup to S3 using new credentials
3. Restore Atlas database from backup
4. Switch app to Atlas mode
5. Verify UI shows recipes

## S3 Bucket Permissions Included
The new user will have access to:
- `mrb-recipe-images-dev` (recipe images)
- `mrb-mongodb-backups-dev` (database backups)

## IAM Roles the User Can Pass
- `app_lambda_role` (MRB Lambda execution)
- `lambda_exec_role` (general Lambda execution)  
- `ecsTaskExecutionRole` (ECS task execution)