###############################################################################
# Dedicated ECR repository for init-mrb-db Lambda
###############################################################################
resource "aws_ecr_repository" "init_db_repo" {
  name                 = "init-mrb-db"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}

###############################################################################
# IAM Role for init-mrb-db Lambda
###############################################################################

resource "aws_iam_role" "init_db_lambda_role" {
  name = "init-db-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "init_db_vpc_access" {
  role       = aws_iam_role.init_db_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "init_db_secrets_access" {
  role       = aws_iam_role.init_db_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
}

###############################################################################
# Lambda Function: init-mrb-db
# This function initializes the database and is invoked once via Terraform
###############################################################################
data "aws_db_instance" "manual_db_instance" {
  db_instance_identifier = "mrb-aurora-dsql-manual-instance-1"
}

resource "aws_lambda_function" "init_mrb_db" {
  function_name = "init-mrb-db"
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.init_db_repo.repository_url}:init-db"
  source_code_hash = filebase64sha256("${path.module}/.init-db-image-digest.txt")
  role          = aws_iam_role.init_db_lambda_role.arn
  timeout       = 30
  memory_size   = 128

  environment {
    variables = {
      DB_SECRET_ARN = data.aws_secretsmanager_secret.mrb_secrets.arn
      DB_HOST       = data.aws_db_instance.manual_db_instance.address
      DB_PORT       = "3306"
    }
  }

  vpc_config {
    subnet_ids         = module.network.private_subnets
    security_group_ids = [aws_security_group.rds_sg.id]
  }
}

###############################################################################
# One-time invocation of init-mrb-db during apply, gated by initialize_db flag
###############################################################################

resource "aws_lambda_invocation" "init_db" {
  count         = var.initialize_db ? 1 : 0
  function_name = aws_lambda_function.init_mrb_db.function_name
  input = jsonencode({})
  depends_on = [aws_lambda_function.init_mrb_db]
  triggers = {always_run = timestamp()}
}

output "init_db_invoke_response" {
  value       = var.initialize_db && length(aws_lambda_invocation.init_db) > 0 ? aws_lambda_invocation.init_db[0].result : "skipped"
  description = "Result of initializing the DB via Lambda"
}