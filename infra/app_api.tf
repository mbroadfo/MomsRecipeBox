# app_api.tf

# Create the ECR repository
resource "aws_ecr_repository" "app_repo" {
  name = "mrb-app-api"

  image_scanning_configuration {
    scan_on_push = true
  }

  image_tag_mutability = "MUTABLE"

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# Lambda execution role
resource "aws_iam_role" "app_lambda_role" {
  name = "app_lambda_role"

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

# Attach policies to the Lambda role
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.app_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_secretsmanager_access" {
  role       = aws_iam_role.app_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
}

# Lambda function from ECR image
resource "aws_lambda_function" "app_lambda" {
  function_name = "mrb-app-api"
  role          = aws_iam_role.app_lambda_role.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.app_repo.repository_url}:latest"
  timeout       = 15
  memory_size   = 256

  environment {
    variables = {
      NODE_ENV    = "production"
      DB_HOST     = "<aurora_writer_endpoint>"
      DB_USER     = "mrb_admin"
      DB_PASSWORD = "<password>"
      DB_NAME     = "mrb_dev"
    }
  }
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "app_api" {
  name        = "mrb-app-api"
  description = "API Gateway for Mom's Recipe Box app tier"
}

# API Gateway resource /recipes
resource "aws_api_gateway_resource" "recipes" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  parent_id   = aws_api_gateway_rest_api.app_api.root_resource_id
  path_part   = "recipes"
}

# API Gateway method GET /recipes (list_recipes)
resource "aws_api_gateway_method" "recipes_get" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.recipes.id
  http_method   = "GET"
  authorization = "NONE"
}

# API Gateway integration for GET /recipes
resource "aws_api_gateway_integration" "recipes_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.recipes.id
  http_method             = aws_api_gateway_method.recipes_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda.invoke_arn
}

# API Gateway method POST /recipes (create_recipe)
resource "aws_api_gateway_method" "recipes_post" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.recipes.id
  http_method   = "POST"
  authorization = "NONE"
}

# API Gateway integration for POST /recipes
resource "aws_api_gateway_integration" "recipes_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.recipes.id
  http_method             = aws_api_gateway_method.recipes_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda.invoke_arn
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.app_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.app_api.execution_arn}/*/*"
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "app_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  depends_on = [
    aws_api_gateway_integration.recipes_get_integration,
    aws_api_gateway_integration.recipes_post_integration
  ]
}

# API Gateway stage
resource "aws_api_gateway_stage" "app_api_stage" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  deployment_id = aws_api_gateway_deployment.app_api_deployment.id
  stage_name    = "dev"
}
