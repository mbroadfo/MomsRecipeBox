# app_api.tf
##############################################
# Create the ECR repository
##############################################
resource "aws_ecr_repository" "app_repo" {
  count = var.enable_app_api ? 1 : 0
  name  = "mrb-app-api"

  image_scanning_configuration {
    scan_on_push = true
  }

  image_tag_mutability = "MUTABLE"

  encryption_configuration {
    encryption_type = "AES256"
  }
  force_delete         = true
}

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
# Lambda function from ECR image
##############################################
resource "aws_lambda_function" "app_lambda" {
  count = var.enable_app_api ? 1 : 0
  function_name = "mrb-app-api"
  role          = aws_iam_role.app_lambda_role[count.index].arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.app_repo[count.index].repository_url}:dev"
  timeout       = 15
  memory_size   = 256
  
  environment {
    variables = {
      # ==============================================
      # Application Configuration
      # ==============================================
      NODE_ENV = "production"
      APP_MODE = "lambda"
      
      # ==============================================
      # MongoDB Atlas Configuration
      # ==============================================
      MONGODB_MODE = "atlas"
      MONGODB_DB_NAME = "moms_recipe_box_dev"
      
      # ==============================================
      # AWS Configuration
      # ==============================================
      AWS_SECRET_NAME = var.aws_secret_name
      RECIPE_IMAGES_BUCKET = var.recipe_images_bucket
      
      # ==============================================
      # Health Check Configuration
      # ==============================================
      ENABLE_STARTUP_HEALTH_CHECKS = "true"
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
# Lambda function for JWT validation (Custom Authorizer)
##############################################

# Create ZIP file for JWT authorizer
data "archive_file" "jwt_authorizer_zip" {
  count       = var.enable_app_api ? 1 : 0
  type        = "zip"
  output_path = "${path.module}/jwt_authorizer.zip"
  
  source {
    content  = file("${path.module}/jwt_authorizer.js")
    filename = "index.js"
  }
  
  source {
    content  = file("${path.module}/package.json")
    filename = "package.json"
  }
}

resource "aws_lambda_function" "jwt_authorizer" {
  count         = var.enable_app_api ? 1 : 0
  filename      = data.archive_file.jwt_authorizer_zip[count.index].output_path
  function_name = "mrb-jwt-authorizer"
  role          = aws_iam_role.jwt_authorizer_role[count.index].arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  source_code_hash = data.archive_file.jwt_authorizer_zip[count.index].output_base64sha256

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
# API Gateway resource /recipes
##############################################
resource "aws_api_gateway_resource" "recipes" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  parent_id   = aws_api_gateway_rest_api.app_api[count.index].root_resource_id
  path_part   = "recipes"
}

##############################################
# API Gateway method GET /recipes (list_recipes)
##############################################
resource "aws_api_gateway_method" "recipes_get" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.recipes[count.index].id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

##############################################
# API Gateway integration for GET /recipes
##############################################
resource "aws_api_gateway_integration" "recipes_get_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.recipes[count.index].id
  http_method             = aws_api_gateway_method.recipes_get[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

##############################################
# API Gateway method POST /recipes (create_recipe)
##############################################
resource "aws_api_gateway_method" "recipes_post" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.recipes[count.index].id
  http_method   = "POST"
  authorization = "NONE"
}

##############################################
# API Gateway integration for POST /recipes
##############################################
resource "aws_api_gateway_integration" "recipes_post_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.recipes[count.index].id
  http_method             = aws_api_gateway_method.recipes_post[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

##############################################
# Lambda permission for API Gateway
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
    aws_api_gateway_integration.recipes_get_integration,
    aws_api_gateway_integration.recipes_post_integration,
    aws_api_gateway_integration.recipes_options_integration,
    aws_api_gateway_integration.recipe_get_integration,
    aws_api_gateway_integration.recipe_put_integration,
    aws_api_gateway_integration.recipe_delete_integration,
    aws_api_gateway_integration.comment_post_integration,
    aws_api_gateway_integration.comment_put_integration,
    aws_api_gateway_integration.comment_delete_integration,
    aws_api_gateway_integration.like_post_integration,
    aws_api_gateway_integration.recipe_image_get_integration,
    aws_api_gateway_integration.recipe_image_put_integration,
    aws_api_gateway_integration.recipe_image_delete_integration
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
# New resources for /recipe and nested paths
##############################################

resource "aws_api_gateway_resource" "recipe" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  parent_id   = aws_api_gateway_rest_api.app_api[count.index].root_resource_id
  path_part   = "recipe"
}

resource "aws_api_gateway_resource" "recipe_id" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  parent_id   = aws_api_gateway_resource.recipe[count.index].id
  path_part   = "{id}"
}

resource "aws_api_gateway_resource" "comment" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  parent_id   = aws_api_gateway_resource.recipe[count.index].id
  path_part   = "comment"
}

resource "aws_api_gateway_resource" "comment_id" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  parent_id   = aws_api_gateway_resource.comment[count.index].id
  path_part   = "{comment_id}"
}

resource "aws_api_gateway_resource" "like" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  parent_id   = aws_api_gateway_resource.recipe[count.index].id
  path_part   = "like"
}

##############################################
# OPTIONS method + integration for CORS
##############################################
resource "aws_api_gateway_method" "recipes_options" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.recipes[count.index].id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "recipes_options_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.recipes[count.index].id
  http_method             = aws_api_gateway_method.recipes_options[count.index].http_method
  type                    = "MOCK"
  request_templates       = {"application/json" = "{\"statusCode\": 200}"}
  integration_http_method = "OPTIONS"
}

resource "aws_api_gateway_method_response" "recipes_options_response" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id = aws_api_gateway_resource.recipes[count.index].id
  http_method = aws_api_gateway_method.recipes_options[count.index].http_method
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

resource "aws_api_gateway_integration_response" "recipes_options_integration_response" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id = aws_api_gateway_resource.recipes[count.index].id
  http_method = aws_api_gateway_method.recipes_options[count.index].http_method
  status_code = aws_api_gateway_method_response.recipes_options_response[count.index].status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.recipes_options_integration]
}
##############################################
# Methods and Integrations for /recipe/{id}
##############################################
resource "aws_api_gateway_method" "recipe_get" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.recipe_id[count.index].id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

resource "aws_api_gateway_integration" "recipe_get_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.recipe_id[count.index].id
  http_method             = aws_api_gateway_method.recipe_get[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

resource "aws_api_gateway_method" "recipe_put" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.recipe_id[count.index].id
  http_method   = "PUT"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

resource "aws_api_gateway_integration" "recipe_put_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.recipe_id[count.index].id
  http_method             = aws_api_gateway_method.recipe_put[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

resource "aws_api_gateway_method" "recipe_delete" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.recipe_id[count.index].id
  http_method   = "DELETE"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

resource "aws_api_gateway_integration" "recipe_delete_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.recipe_id[count.index].id
  http_method             = aws_api_gateway_method.recipe_delete[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

##############################################
# Methods and Integrations for /recipe/comment
##############################################
resource "aws_api_gateway_method" "comment_post" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.comment[count.index].id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

resource "aws_api_gateway_integration" "comment_post_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.comment[count.index].id
  http_method             = aws_api_gateway_method.comment_post[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

##############################################
# Methods and Integrations for /recipe/comment/{comment_id}
##############################################
resource "aws_api_gateway_method" "comment_put" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.comment_id[count.index].id
  http_method   = "PUT"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

resource "aws_api_gateway_integration" "comment_put_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.comment_id[count.index].id
  http_method             = aws_api_gateway_method.comment_put[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

resource "aws_api_gateway_method" "comment_delete" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.comment_id[count.index].id
  http_method   = "DELETE"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

resource "aws_api_gateway_integration" "comment_delete_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.comment_id[count.index].id
  http_method             = aws_api_gateway_method.comment_delete[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

##############################################
# Methods and Integrations for /recipe/like
##############################################
resource "aws_api_gateway_method" "like_post" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.like[count.index].id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

resource "aws_api_gateway_integration" "like_post_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.like[count.index].id
  http_method             = aws_api_gateway_method.like_post[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

##############################################
# New resources for /recipe/{id}/image
##############################################
resource "aws_api_gateway_resource" "recipe_image" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.app_api[count.index].id
  parent_id   = aws_api_gateway_resource.recipe_id[count.index].id
  path_part   = "image"
}

# POST image endpoint has been removed in favor of using PUT for both upload and update

##############################################
# API Gateway method PUT /recipe/{id}/image (update_image)
##############################################
resource "aws_api_gateway_method" "recipe_image_put" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.recipe_image[count.index].id
  http_method   = "PUT"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

##############################################
# API Gateway integration for PUT /recipe/{id}/image (update_image)
##############################################
resource "aws_api_gateway_integration" "recipe_image_put_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.recipe_image[count.index].id
  http_method             = aws_api_gateway_method.recipe_image_put[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

##############################################
# API Gateway method DELETE /recipe/{id}/image (delete_image)
##############################################
resource "aws_api_gateway_method" "recipe_image_delete" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.recipe_image[count.index].id
  http_method   = "DELETE"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

##############################################
# API Gateway integration for DELETE /recipe/{id}/image (delete_image)
##############################################
resource "aws_api_gateway_integration" "recipe_image_delete_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.recipe_image[count.index].id
  http_method             = aws_api_gateway_method.recipe_image_delete[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}

##############################################
# IAM policy for Mom's Recipe Box API
##############################################
resource "aws_iam_policy" "mrb_api_s3_access" {
  name        = "mrb-api-s3-access"
  description = "Policy for Mom's Recipe Box API to access S3 buckets"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ],
        Resource = [
          "arn:aws:s3:::mrb-recipe-images-dev/*",
          "arn:aws:s3:::mrb-mongodb-backups-dev/*"
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "s3:ListBucket"
        ],
        Resource = [
          "arn:aws:s3:::mrb-recipe-images-dev",
          "arn:aws:s3:::mrb-mongodb-backups-dev"
        ]
      }
    ]
  })
}

# Note: This policy attachment should be done manually in AWS Console
# resource "aws_iam_user_policy_attachment" "mrb_api_backup_access" {
#   user       = "mrb-api"
#   policy_arn = aws_iam_policy.mrb_api_s3_access.arn
# }

##############################################
# API Gateway method GET /recipe/{id}/image (get_image)
##############################################
resource "aws_api_gateway_method" "recipe_image_get" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id   = aws_api_gateway_resource.recipe_image[count.index].id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt[count.index].id
}

##############################################
# API Gateway integration for GET /recipe/{id}/image (get_image)
##############################################
resource "aws_api_gateway_integration" "recipe_image_get_integration" {
  count = var.enable_app_api ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.app_api[count.index].id
  resource_id             = aws_api_gateway_resource.recipe_image[count.index].id
  http_method             = aws_api_gateway_method.recipe_image_get[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda[count.index].invoke_arn
}
