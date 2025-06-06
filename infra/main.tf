##################################################################
# Terraform RDS PostgreSQL Setup for Mom's Recipe Box
##################################################################

provider "aws" {
  region = "us-west-2"
}

##################################################################
# Define a random password for DB admin
##################################################################
resource "random_password" "db_password" {
  length  = 16
  special = true
}

##################################################################
# Create a security group for RDS
##################################################################
resource "aws_security_group" "rds_sg" {
  name        = "mrb-rds-sg"
  description = "Allow DB access from Lambda or specific IPs"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

##################################################################
# RDS subnet group
##################################################################
resource "aws_db_subnet_group" "mrb_db_subnet_group" {
  name       = "mrb-db-subnet-group"
  subnet_ids = var.db_subnet_ids
  tags = {
    Name = "mrb-db-subnet-group"
  }
}

##################################################################
# RDS PostgreSQL instance
##################################################################
resource "aws_db_instance" "mrb_postgres" {
  identifier             = "mrb-postgres-db"
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "15.13"
  instance_class         = "db.t3.micro"
  username               = var.db_username
  password               = random_password.db_password.result
  db_subnet_group_name   = aws_db_subnet_group.mrb_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot    = true
  publicly_accessible    = false
  storage_encrypted      = true
  auto_minor_version_upgrade = true
  backup_retention_period    = 7
  tags = {
    Name = "mrb-postgres-db"
  }
}

##################################################################
# Outputs
##################################################################
output "db_endpoint" {
  value = aws_db_instance.mrb_postgres.endpoint
}
