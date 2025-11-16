# app_api.tf
##############################################
# Lambda execution role
##############################################
resource "aws_iam_role" "app_lambda_role" {
  count = var.enable_app_api ? 1 : 0
  name  = "app_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

##############################################
# Attach policies to the Lambda role
##############################################
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  count = var.enable_app_api ? 1 : 0
  role       = aws_iam_role.app_lambda_role[count.index].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_secretsmanager_access" {
  count = var.enable_app_api ? 1 : 0
  role       = aws_iam_role.app_lambda_role[count.index].name
  policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
}

##############################################
# Custom policy for S3 access to recipe images bucket
##############################################
resource "aws_iam_role_policy" "lambda_s3_access" {
  count = var.enable_app_api ? 1 : 0
  name  = "lambda-s3-recipe-images-access"
  role  = aws_iam_role.app_lambda_role[count.index].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::${var.recipe_images_bucket}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = "arn:aws:s3:::${var.recipe_images_bucket}"
      }
    ]
  })
}

##############################################
# Custom policy for SSM Parameter Store access (Auth0 token caching)
##############################################
resource "aws_iam_role_policy" "lambda_parameter_store_access" {
  count = var.enable_app_api ? 1 : 0
  name  = "lambda-parameter-store-auth0-token-cache"
  role  = aws_iam_role.app_lambda_role[count.index].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:PutParameter"
        ]
        Resource = "arn:aws:ssm:us-west-2:*:parameter/mrb/dev/*"
      }
    ]
  })
}

##############################################
# Parameter Store for application secrets
##############################################
resource "aws_ssm_parameter" "application_secrets" {
  count       = var.enable_app_api ? 1 : 0
  name        = "/mrb/dev/secrets"
  description = "Application secrets for Mom's Recipe Box (MongoDB, Auth0, AI providers)"
  type        = "SecureString"  # Encrypted at rest with AWS KMS
  value = jsonencode({
    # MongoDB Atlas
    MONGODB_ATLAS_URI          = "not-initialized"
    
    # Auth0 Configuration
    AUTH0_DOMAIN               = "not-initialized"
    AUTH0_M2M_CLIENT_ID        = "not-initialized"
    AUTH0_M2M_CLIENT_SECRET    = "not-initialized"
    AUTH0_API_AUDIENCE         = "not-initialized"
    AUTH0_MRB_CLIENT_ID        = "not-initialized"
    
    # AI Provider API Keys
    OPENAI_API_KEY             = "not-initialized"
    ANTHROPIC_API_KEY          = "not-initialized"
    GROQ_API_KEY               = "not-initialized"
    GOOGLE_API_KEY             = "not-initialized"
    DEEPSEEK_API_KEY           = "not-initialized"
    
    # AWS Configuration
    AWS_ACCOUNT_ID             = "not-initialized"
    RECIPE_IMAGES_BUCKET       = "not-initialized"
  })
  tier        = "Standard"  # Free tier

  tags = {
    Project     = "MomsRecipeBox"
    Environment = "dev"
    ManagedBy   = "Terraform"
    Purpose     = "Application secrets - replacing Secrets Manager for cost optimization"
  }

  lifecycle {
    ignore_changes = [value]  # User manages secret values manually, but Terraform can read metadata
  }
}

##############################################
# Lambda function from ZIP file
##############################################
resource "aws_lambda_function" "app_lambda" {
  count         = var.enable_app_api ? 1 : 0
  function_name = "mrb-app-api"
  role          = aws_iam_role.app_lambda_role[count.index].arn
  
  # ZIP deployment instead of container image
  package_type  = "Zip"
  filename      = "${path.module}/../lambda-deployment.zip"
  handler       = "lambda.handler"
  runtime       = "nodejs18.x"
  source_code_hash = filebase64sha256("${path.module}/../lambda-deployment.zip")
  
  timeout       = 30
  memory_size   = 512

  environment {
    variables = {
      # ==============================================
      # Application Configuration
      # ==============================================
      NODE_ENV = "production"
      APP_MODE = "lambda"
      LOG_LEVEL = "INFO"

      # ==============================================
      # MongoDB Atlas Configuration
      # ==============================================
      MONGODB_MODE = "atlas"
      MONGODB_DB_NAME = "moms_recipe_box_dev"
      # MONGODB_ATLAS_URI is fetched from AWS Secrets Manager at runtime

      # ==============================================
      # AWS Configuration
      # ==============================================
      AWS_SECRET_NAME = var.aws_secret_name
      SSM_SECRETS_PARAMETER_NAME = var.enable_app_api ? aws_ssm_parameter.application_secrets[0].name : ""
      RECIPE_IMAGES_BUCKET = var.recipe_images_bucket

      # ==============================================
      # Health Check Configuration
      # ==============================================
      ENABLE_STARTUP_HEALTH_CHECKS = "false"
      ENABLE_PERIODIC_HEALTH_CHECKS = "false"
      FAIL_ON_CRITICAL_HEALTH = "false"
      ENABLE_DATA_QUALITY_CHECKS = "true"
      HEALTH_CHECK_TIMEOUT_MS = "15000"
    }
  }
}

##############################################
# API Gateway REST API
##############################################
resource "aws_api_gateway_rest_api" "app_api" {
  count = var.enable_app_api ? 1 : 0
  name        = "mrb-app-api"
  description = "API Gateway for Mom's Recipe Box app tier"
}

##############################################
# JWT Authorizer Lambda function
##############################################
resource "aws_lambda_function" "jwt_authorizer" {
  count         = var.enable_app_api ? 1 : 0
  filename      = "${path.module}/jwt_authorizer.zip"
  function_name = "mrb-jwt-authorizer"
  role          = aws_iam_role.jwt_authorizer_role[count.index].arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  source_code_hash = filebase64sha256("${path.module}/jwt_authorizer.zip")

  environment {
    variables = {
      AUTH0_DOMAIN   = var.auth0_domain
      AUTH0_AUDIENCE = var.auth0_audience
    }
  }
}

##############################################
# CloudWatch Log Groups with Retention
##############################################
resource "aws_cloudwatch_log_group" "app_lambda_logs" {
  count             = var.enable_app_api ? 1 : 0
  name              = "/aws/lambda/mrb-app-api"
  retention_in_days = 3
}

resource "aws_cloudwatch_log_group" "jwt_authorizer_logs" {
  count             = var.enable_app_api ? 1 : 0
  name              = "/aws/lambda/mrb-jwt-authorizer"
  retention_in_days = 1
}

##############################################
# IAM role for JWT authorizer Lambda
##############################################
resource "aws_iam_role" "jwt_authorizer_role" {
  count = var.enable_app_api ? 1 : 0
  name  = "jwt-authorizer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

##############################################
# IAM policy attachment for JWT authorizer
##############################################
resource "aws_iam_role_policy_attachment" "jwt_authorizer_basic_execution" {
  count      = var.enable_app_api ? 1 : 0
  role       = aws_iam_role.jwt_authorizer_role[count.index].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

##############################################
# Custom Authorizer for Auth0 JWT Integration
##############################################
resource "aws_api_gateway_authorizer" "auth0_jwt" {
  count                            = var.enable_app_api ? 1 : 0
  name                             = "auth0-jwt-authorizer"
  rest_api_id                      = aws_api_gateway_rest_api.app_api[count.index].id
  authorizer_uri                   = aws_lambda_function.jwt_authorizer[count.index].invoke_arn
  authorizer_credentials           = aws_iam_role.jwt_authorizer_invocation_role[count.index].arn
  type                             = "TOKEN"
  identity_source                  = "method.request.header.Authorization"
  authorizer_result_ttl_in_seconds = 300
}

##############################################
# IAM role for API Gateway to invoke JWT authorizer
##############################################
resource "aws_iam_role" "jwt_authorizer_invocation_role" {
  count = var.enable_app_api ? 1 : 0
  name  = "jwt-authorizer-invocation-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "apigateway.amazonaws.com"
      }
    }]
  })
}

##############################################
# IAM policy for JWT authorizer invocation
##############################################
resource "aws_iam_role_policy" "jwt_authorizer_invocation_policy" {
  count = var.enable_app_api ? 1 : 0
  name  = "jwt-authorizer-invocation-policy"
  role  = aws_iam_role.jwt_authorizer_invocation_role[count.index].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "lambda:InvokeFunction"
      Resource = aws_lambda_function.jwt_authorizer[count.index].arn
    }]
  })
}

##############################################
# Lambda permission for API Gateway to invoke JWT authorizer
##############################################
resource "aws_lambda_permission" "jwt_authorizer_permission" {
  count         = var.enable_app_api ? 1 : 0
  statement_id  = "AllowAPIGatewayInvokeJWTAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.jwt_authorizer[count.index].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.app_api[count.index].execution_arn}/*/*"
}

##############################################
# Proxy Resource - Catch-all for all routes
##############################################
resource "aws_api_gateway_resource" "proxy" {
  count       = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  parent_id   = aws_api_gateway_rest_api.app_api[count.index].root_resource_id
  path_part   = "{proxy+}"
}

##############################################
# ANY method for proxy (all HTTP methods)
##############################################
resource "aws_api_gateway_method" "proxy_any" {
  count         = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.proxy[count.index].id
  http_method   = "ANY"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

##############################################
# Lambda integration for proxy ANY method
##############################################
resource "aws_api_gateway_integration" "proxy_lambda" {
  count                   = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.proxy[count.index].id
  http_method             = aws_api_gateway_method.proxy_any[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

##############################################
# OPTIONS method for CORS preflight on proxy
##############################################
resource "aws_api_gateway_method" "proxy_options" {
  count         = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.proxy[count.index].id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

##############################################
# MOCK integration for CORS preflight
##############################################
resource "aws_api_gateway_integration" "proxy_options" {
  count       = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id = aws_api_gateway_resource.proxy[count.index].id
  http_method = aws_api_gateway_method.proxy_options[count.index].http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

##############################################
# OPTIONS method response
##############################################
resource "aws_api_gateway_method_response" "proxy_options_200" {
  count       = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id = aws_api_gateway_resource.proxy[count.index].id
  http_method = aws_api_gateway_method.proxy_options[count.index].http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

##############################################
# OPTIONS integration response
##############################################
resource "aws_api_gateway_integration_response" "proxy_options_200" {
  count       = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id = aws_api_gateway_resource.proxy[count.index].id
  http_method = aws_api_gateway_method.proxy_options[count.index].http_method
  status_code = aws_api_gateway_method_response.proxy_options_200[count.index].status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Accept,Authorization,X-Requested-With,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

##############################################
# Lambda permission for API Gateway invoke
##############################################
resource "aws_lambda_permission" "api_gateway_invoke" {
  count = var.enable_app_api ? 1 : 0
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.app_lambda[count.index].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.app_api[count.index].execution_arn}/*/*"
}

##############################################
# API Gateway deployment
##############################################
resource "aws_api_gateway_deployment" "app_api_deployment" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  depends_on = [
    aws_api_gateway_integration.proxy_lambda,
    aws_api_gateway_integration.proxy_options
  ]

  triggers = {
    redeploy = timestamp()
  }

  lifecycle {
    create_before_destroy = true
  }
}

##############################################
# API Gateway stage
##############################################
resource "aws_api_gateway_stage" "app_api_stage" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  deployment_id = aws_api_gateway_deployment.app_api_deployment[count.index].id
  stage_name    = "dev"
}

##############################################
# Gateway Responses for CORS on errors
##############################################

# Handle 401 Unauthorized responses with CORS headers
resource "aws_api_gateway_gateway_response" "unauthorized" {
  count         = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  response_type = "UNAUTHORIZED"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
}

# Handle 403 Forbidden responses with CORS headers
resource "aws_api_gateway_gateway_response" "access_denied" {
  count         = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  response_type = "ACCESS_DENIED"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }

  response_templates = {
    "application/json" = "{\"message\":\"Access Denied\"}"
  }
}

# Handle 4XX errors with CORS headers
resource "aws_api_gateway_gateway_response" "default_4xx" {
  count         = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
}

# Handle 5XX errors with CORS headers
resource "aws_api_gateway_gateway_response" "default_5xx" {
  count         = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
}
