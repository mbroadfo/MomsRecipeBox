# app_api.tf
##############################################
# Create the ECR repository
##############################################
resource "aws_ecr_repository" "app_repo" {
  name = "mrb-app-api"

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

##############################################
# Attach policies to the Lambda role
##############################################
resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.app_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.app_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_secretsmanager_access" {
  role       = aws_iam_role.app_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
}

##############################################
# Lambda function from ECR image
##############################################
resource "aws_lambda_function" "app_lambda" {
  function_name = "mrb-app-api"
  role          = aws_iam_role.app_lambda_role.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.app_repo.repository_url}:dev"
  timeout       = 15
  memory_size   = 256
  environment {
    variables = {
      DB_SECRET_ARN = data.aws_secretsmanager_secret.mrb_secrets.arn
      DB_HOST       = data.aws_db_instance.manual_db_instance.address
      DB_PORT       = "3306"
      MYSQL_USER      = jsondecode(data.aws_secretsmanager_secret_version.mrb_secrets_version.secret_string)["db_username"]
      MYSQL_PASSWORD  = jsondecode(data.aws_secretsmanager_secret_version.mrb_secrets_version.secret_string)["db_password"]
      MYSQL_DATABASE  = jsondecode(data.aws_secretsmanager_secret_version.mrb_secrets_version.secret_string)["db_name"]
    }
  }
  vpc_config {
    subnet_ids         = module.network.private_subnets
    security_group_ids = [aws_security_group.rds_sg.id]
  }
}

##############################################
# API Gateway REST API
##############################################
resource "aws_api_gateway_rest_api" "app_api" {
  name        = "mrb-app-api"
  description = "API Gateway for Mom's Recipe Box app tier"
}

##############################################
# API Gateway resource /recipes
##############################################
resource "aws_api_gateway_resource" "recipes" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  parent_id   = aws_api_gateway_rest_api.app_api.root_resource_id
  path_part   = "recipes"
}

##############################################
# API Gateway method GET /recipes (list_recipes)
##############################################
resource "aws_api_gateway_method" "recipes_get" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.recipes.id
  http_method   = "GET"
  authorization = "NONE"
}

##############################################
# API Gateway integration for GET /recipes
##############################################
resource "aws_api_gateway_integration" "recipes_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.recipes.id
  http_method             = aws_api_gateway_method.recipes_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda.invoke_arn
}

##############################################
# API Gateway method POST /recipes (create_recipe)
##############################################
resource "aws_api_gateway_method" "recipes_post" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.recipes.id
  http_method   = "POST"
  authorization = "NONE"
}

##############################################
# API Gateway integration for POST /recipes
##############################################
resource "aws_api_gateway_integration" "recipes_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.recipes.id
  http_method             = aws_api_gateway_method.recipes_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda.invoke_arn
}

##############################################
# Lambda permission for API Gateway
##############################################
resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.app_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.app_api.execution_arn}/*/*"
}

##############################################
# API Gateway deployment
##############################################
resource "aws_api_gateway_deployment" "app_api_deployment" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  depends_on = [
    aws_api_gateway_integration.recipes_get_integration,
    aws_api_gateway_integration.recipes_post_integration,
    aws_api_gateway_integration.recipe_get_integration,
    aws_api_gateway_integration.recipe_put_integration,
    aws_api_gateway_integration.recipe_delete_integration,
    aws_api_gateway_integration.comment_post_integration,
    aws_api_gateway_integration.comment_put_integration,
    aws_api_gateway_integration.comment_delete_integration,
    aws_api_gateway_integration.like_post_integration
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
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  deployment_id = aws_api_gateway_deployment.app_api_deployment.id
  stage_name    = "dev"
}

##############################################
# New resources for /recipe and nested paths
##############################################

resource "aws_api_gateway_resource" "recipe" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  parent_id   = aws_api_gateway_rest_api.app_api.root_resource_id
  path_part   = "recipe"
}

resource "aws_api_gateway_resource" "recipe_id" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  parent_id   = aws_api_gateway_resource.recipe.id
  path_part   = "{id}"
}

resource "aws_api_gateway_resource" "comment" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  parent_id   = aws_api_gateway_resource.recipe.id
  path_part   = "comment"
}

resource "aws_api_gateway_resource" "comment_id" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  parent_id   = aws_api_gateway_resource.comment.id
  path_part   = "{comment_id}"
}

resource "aws_api_gateway_resource" "like" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  parent_id   = aws_api_gateway_resource.recipe.id
  path_part   = "like"
}

##############################################
# OPTIONS method + integration for CORS
##############################################
resource "aws_api_gateway_method" "recipes_options" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.recipes.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "recipes_options_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.recipes.id
  http_method             = aws_api_gateway_method.recipes_options.http_method
  type                    = "MOCK"
  request_templates       = {"application/json" = "{\"statusCode\": 200}"}
  integration_http_method = "OPTIONS"
}

resource "aws_api_gateway_method_response" "recipes_options_response" {
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  resource_id = aws_api_gateway_resource.recipes.id
  http_method = aws_api_gateway_method.recipes_options.http_method
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
  rest_api_id = aws_api_gateway_rest_api.app_api.id
  resource_id = aws_api_gateway_resource.recipes.id
  http_method = aws_api_gateway_method.recipes_options.http_method
  status_code = aws_api_gateway_method_response.recipes_options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
##############################################
# Methods and Integrations for /recipe/{id}
##############################################
resource "aws_api_gateway_method" "recipe_get" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.recipe_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "recipe_get_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.recipe_id.id
  http_method             = aws_api_gateway_method.recipe_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda.invoke_arn
}

resource "aws_api_gateway_method" "recipe_put" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.recipe_id.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "recipe_put_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.recipe_id.id
  http_method             = aws_api_gateway_method.recipe_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda.invoke_arn
}

resource "aws_api_gateway_method" "recipe_delete" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.recipe_id.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "recipe_delete_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.recipe_id.id
  http_method             = aws_api_gateway_method.recipe_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda.invoke_arn
}

##############################################
# Methods and Integrations for /recipe/comment
##############################################
resource "aws_api_gateway_method" "comment_post" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.comment.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "comment_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.comment.id
  http_method             = aws_api_gateway_method.comment_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda.invoke_arn
}

##############################################
# Methods and Integrations for /recipe/comment/{comment_id}
##############################################
resource "aws_api_gateway_method" "comment_put" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.comment_id.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "comment_put_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.comment_id.id
  http_method             = aws_api_gateway_method.comment_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda.invoke_arn
}

resource "aws_api_gateway_method" "comment_delete" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.comment_id.id
  http_method   = "DELETE"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "comment_delete_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.comment_id.id
  http_method             = aws_api_gateway_method.comment_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda.invoke_arn
}

##############################################
# Methods and Integrations for /recipe/like
##############################################
resource "aws_api_gateway_method" "like_post" {
  rest_api_id   = aws_api_gateway_rest_api.app_api.id
  resource_id   = aws_api_gateway_resource.like.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "like_post_integration" {
  rest_api_id             = aws_api_gateway_rest_api.app_api.id
  resource_id             = aws_api_gateway_resource.like.id
  http_method             = aws_api_gateway_method.like_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.app_lambda.invoke_arn
}
