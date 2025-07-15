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

# === Aurora DSQL Cluster (Free Tier) ===

resource "aws_rds_cluster" "aurora_dsql" {
  count                   = var.enable_aurora_dsql ? 1 : 0
  cluster_identifier      = "mrb-aurora-dsql-cluster"
  engine                  = "aurora-mysql"                  # MUST be this for DSQL
  engine_mode             = "provisioned"                   # Required for DSQL
  engine_version          = "8.0.mysql_aurora.3.04.0"        # Pick latest DSQL-compatible version
  database_name           = "mrb_dev"
  master_username         = local.db_creds.db_username
  master_password         = local.db_creds.db_password
  db_subnet_group_name    = aws_db_subnet_group.mrb_db_subnet_group.name
  vpc_security_group_ids  = [aws_security_group.rds_sg.id]
  skip_final_snapshot     = true
  storage_encrypted       = true

  tags = {
    Name = "mrb-aurora-dsql-cluster"
  }
}

resource "aws_rds_cluster_instance" "aurora_dsql_instance" {
  count                   = var.enable_aurora_dsql ? 1 : 0
  identifier              = "mrb-aurora-dsql-instance"
  cluster_identifier      = aws_rds_cluster.aurora_dsql.id
  instance_class          = "db.t4g.micro"   # ✅ Free tier eligible
  engine                  = "aurora-mysql"
  engine_version          = "8.0.mysql_aurora.3.04.0"
  publicly_accessible     = false
  db_subnet_group_name    = aws_db_subnet_group.mrb_db_subnet_group.name

  tags = {
    Name = "mrb-aurora-dsql-instance"
  }
}
