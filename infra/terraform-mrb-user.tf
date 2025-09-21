# terraform-mrb-policies.tf
# Define consolidated IAM policies for MRB Terraform operations
# These policies can be applied via terraform, then manually attached to terraform-mrb user

##############################################
# Consolidated MRB Infrastructure Policy (Refined)
##############################################
resource "aws_iam_policy" "terraform_mrb_infra" {
  name        = "terraform-mrb-infra"
  description = "Infrastructure permissions for MRB Terraform operations"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAccess"
        Effect = "Allow"
        Action = [
          "ecr:*"
        ]
        Resource = "*"
        Condition = {
          StringLike = {
            "ecr:repositoryName" = "mrb-*"
          }
        }
      },
      {
        Sid    = "LogsAccess"
        Effect = "Allow"
        Action = [
          "logs:*"
        ]
        Resource = "*"
      },
      {
        Sid    = "S3AccessMRBBuckets"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject",
          "s3:ListAllMyBuckets",
          "s3:GetBucketPolicy",
          "s3:GetBucketAcl",
          "s3:GetBucketCORS",
          "s3:GetBucketWebsite",
          "s3:GetBucketVersioning",
          "s3:GetAccelerateConfiguration",
          "s3:GetBucketRequestPayment",
          "s3:GetBucketLogging",
          "s3:GetLifecycleConfiguration",
          "s3:GetReplicationConfiguration",
          "s3:GetEncryptionConfiguration",
          "s3:GetBucketObjectLockConfiguration",
          "s3:GetBucketTagging",
          "s3:PutBucketTagging",
          "s3:PutBucketPublicAccessBlock",
          "s3:GetBucketPublicAccessBlock",
          "s3:PutBucketPolicy",
          "s3:DeleteBucket",
          "s3:DeleteBucketPolicy",
          "s3:CreateBucket",
          "s3:GetBucketLocation",
          "s3:PutLifecycleConfiguration"
        ]
        Resource = [
          "arn:aws:s3:::mrb-recipe-images-dev",
          "arn:aws:s3:::mrb-recipe-images-dev/*",
          "arn:aws:s3:::mrb-mongodb-backups-dev",
          "arn:aws:s3:::mrb-mongodb-backups-dev/*"
        ]
      }
    ]
  })
}

##############################################
# MRB AWS Services Policy (Refined - API Gateway, Lambda only)
##############################################
resource "aws_iam_policy" "terraform_mrb_services" {
  name        = "terraform-mrb-services"
  description = "AWS services permissions for MRB Terraform operations"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "APIGatewayAccess"
        Effect = "Allow"
        Action = [
          "apigateway:DELETE",
          "apigateway:GET",
          "apigateway:PATCH",
          "apigateway:POST",
          "apigateway:PUT",
          "apigateway:UpdateRestApiPolicy"
        ]
        Resource = "*"
      },
      {
        Sid    = "LambdaAccess"
        Effect = "Allow"
        Action = [
          "lambda:AddPermission",
          "lambda:CreateFunction",
          "lambda:DeleteFunction",
          "lambda:GetFunction",
          "lambda:GetFunctionCodeSigningConfig",
          "lambda:GetPolicy",
          "lambda:InvokeFunction",
          "lambda:ListFunctions",
          "lambda:ListVersionsByFunction",
          "lambda:RemovePermission",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunctionConfiguration"
        ]
        Resource = "arn:aws:lambda:us-west-2:491696534851:function:mrb-*"
      },
      {
        Sid    = "IAMRoleManagement"
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:AttachRolePolicy",
          "iam:CreatePolicy",
          "iam:GetRole",
          "iam:GetPolicy",
          "iam:GetPolicyVersion",
          "iam:GetRolePolicy",
          "iam:ListAttachedRolePolicies",
          "iam:ListPolicyVersions",
          "iam:ListRolePolicies",
          "iam:PassRole",
          "iam:PutRolePolicy",
          "iam:DeletePolicy",
          "iam:DeleteRole",
          "iam:DeleteRolePolicy",
          "iam:DetachRolePolicy"
        ]
        Resource = [
          "arn:aws:iam::491696534851:role/app_lambda_role",
          "arn:aws:iam::491696534851:policy/mrb-*"
        ]
      }
    ]
  })
}

##############################################
# MRB Secrets Access Policy
##############################################
resource "aws_iam_policy" "terraform_mrb_secrets" {
  name        = "terraform-mrb-secrets"
  description = "Secrets Manager access for MRB Terraform operations"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:GetResourcePolicy",
          "secretsmanager:ListSecrets"
        ]
        Resource = [
          "arn:aws:secretsmanager:us-west-2:491696534851:secret:moms-recipe-box-secrets-dev*",
          "arn:aws:secretsmanager:us-west-2:*:secret:moms-recipe-secrets-dev-*",
          "arn:aws:secretsmanager:us-west-2:*:secret:moms-recipe-secrets-*"
        ]
      }
    ]
  })
}

##############################################
# MRB Role PassRole Policy (Refined - MRB roles only)
##############################################
resource "aws_iam_policy" "terraform_mrb_passrole" {
  name        = "terraform-mrb-passrole"
  description = "PassRole permissions for MRB-specific roles only"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = [
          "arn:aws:iam::491696534851:role/app_lambda_role"
        ]
      }
    ]
  })
}

