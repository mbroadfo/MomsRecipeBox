# === Load DB credentials from AWS Secrets Manager ===

data "aws_secretsmanager_secret" "mrb_secrets" {
  name = "moms-recipe-box-secrets"
}

data "aws_secretsmanager_secret_version" "mrb_secrets_version" {
  secret_id = data.aws_secretsmanager_secret.mrb_secrets.id
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.mrb_secrets_version.secret_string)
}

# === Aurora Serverless v2 Cluster (PostgreSQL 15.4) ===

resource "aws_rds_cluster" "aurora_dsql" {
  cluster_identifier      = "mrb-aurora-dsql-cluster"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  database_name           = "mrb_dev"
  master_username         = local.db_creds.db_username
  master_password         = local.db_creds.db_password
  db_subnet_group_name    = aws_db_subnet_group.mrb_db_subnet_group.name
  vpc_security_group_ids  = [aws_security_group.rds_sg.id]
  skip_final_snapshot     = true
  storage_encrypted       = true

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 2
  }

  tags = {
    Name = "mrb-aurora-dsql-cluster"
  }
}

# === Aurora Serverless v2 Instance ===

resource "aws_rds_cluster_instance" "aurora_dsql_instance" {
  cluster_identifier      = aws_rds_cluster.aurora_dsql.id
  instance_class          = "db.serverless"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  publicly_accessible     = false
  db_subnet_group_name    = aws_db_subnet_group.mrb_db_subnet_group.name

  tags = {
    Name = "mrb-aurora-dsql-instance"
  }
}
