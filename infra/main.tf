##################################################################
# Terraform RDS MySQL Setup for Mom's Recipe Box
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
  vpc_id      = module.network.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

##################################################################
# RDS security group rule for Ingress
##################################################################
resource "aws_security_group_rule" "rds_self_ingress" {
  type                     = "ingress"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = aws_security_group.rds_sg.id
  description              = "Allow MySQL access from Lambda using same SG"
}

##################################################################
# RDS subnet group
##################################################################
resource "aws_db_subnet_group" "mrb_db_subnet_group" {
  name       = "mrb-db-subnet-group"
  subnet_ids = module.network.private_subnets  # Use module-created private subnets

  tags = {
    Name = "mrb-db-subnet-group"
  }
}

###############################################################################
# VPC Module - Creates a custom VPC with public and private subnets
# This module is required for placing the init-db Lambda function inside a VPC
###############################################################################

module "network" {
  # Source of the module: official VPC module from Terraform AWS modules registry
  source = "terraform-aws-modules/vpc/aws"
  manage_default_network_acl = false

  # Name of the VPC and resource prefixes
  name = "mrb-vpc"

  # CIDR block for the VPC
  cidr = "10.0.0.0/16"

  # Availability zones to deploy subnets across
  azs = ["us-west-2a", "us-west-2b", "us-west-2c"]

  # Private subnets (used for Lambda and RDS)
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]

  # Public subnets (used for NAT Gateway or Bastion)
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  # Enable NAT gateway for internet access from private subnets
  enable_nat_gateway = true

  # Use a single NAT gateway to reduce costs
  single_nat_gateway = true

  # Enable DNS support for Lambda function name resolution
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Tags for all resources created by this module
  tags = {
    Terraform   = "true"
    Environment = "dev"
  }
}
