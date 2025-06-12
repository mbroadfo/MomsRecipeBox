# aurora.tf

# Aurora Serverless v2 Cluster
resource "aws_rds_cluster" "mrb_postgres" {
  cluster_identifier      = "mrb-postgres-cluster"
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  database_name           = "mrb_dev"
  master_username         = "mrb_admin"
  master_password         = random_password.db_password.result
  db_subnet_group_name    = aws_db_subnet_group.mrb_db_subnet_group.name
  vpc_security_group_ids  = [aws_security_group.rds_sg.id]
  skip_final_snapshot     = true

  # Enable Aurora Serverless v2 scaling
  serverlessv2_scaling_configuration {
    min_capacity = 0.5  # Smallest allowed (half an ACU)
    max_capacity = 2    # Can increase this later if needed
  }

  storage_encrypted = true

  tags = {
    Name = "mrb-postgres-cluster"
  }
}

# Aurora Instance (temporary workaround — enable Serverless v2 manually in AWS Console)
resource "aws_rds_cluster_instance" "mrb_postgres_instance" {
  cluster_identifier      = aws_rds_cluster.mrb_postgres.id
  instance_class          = "db.serverless"  # Required for Serverless v2
  engine                  = "aurora-postgresql"
  engine_version          = "15.4"
  publicly_accessible     = false
  db_subnet_group_name    = aws_db_subnet_group.mrb_db_subnet_group.name

  tags = {
    Name = "mrb-postgres-cluster-instance-1"
  }
}

# Outputs
output "aurora_cluster_endpoint" {
  value = aws_rds_cluster.mrb_postgres.endpoint
}

output "aurora_reader_endpoint" {
  value = aws_rds_cluster.mrb_postgres.reader_endpoint
}
