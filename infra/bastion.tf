# Bastion EC2 instance with SSM Session Manager support

########################################
# IAM Role for SSM
########################################
resource "aws_iam_role" "ssm_bastion_role" {
  name = "ssm-bastion-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

########################################
# IAM Policy Attachment for SSM
########################################
resource "aws_iam_role_policy_attachment" "ssm_core_attach" {
  role       = aws_iam_role.ssm_bastion_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

########################################
# IAM Policy Attachment for Cloudwatch
########################################
resource "aws_iam_role_policy_attachment" "cw_agent_attach" {
  role       = aws_iam_role.ssm_bastion_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

########################################
# IAM Instance Profile for EC2
########################################
resource "aws_iam_instance_profile" "bastion_profile" {
  name = "bastion-instance-profile"
  role = aws_iam_role.ssm_bastion_role.name
}

########################################
# Amazon Linux 2023 AMI Lookup
########################################
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["137112412989"] # Amazon

  filter {
    name   = "name"
    values = ["al2023-ami-*-kernel-6.1-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
########################################
# Bastion Security Group
########################################
resource "aws_security_group" "bastion_sg" {
  name        = "mrb-bastion-sg"
  description = "Allow outbound SSM and PostgreSQL access"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "mrb-bastion-sg"
  }
}

########################################
# Bastion EC2 Instance
########################################
resource "aws_instance" "bastion" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t3.micro"
  subnet_id                   = var.public_subnet_ids[0]
  vpc_security_group_ids      = [aws_security_group.bastion_sg.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.bastion_profile.name
  tags = {
    Name = "bastion"
  }
  user_data = <<-EOF
    #!/bin/bash
    exec > >(tee /var/log/custom-debug.log|logger -t user-data -s 2>/dev/console) 2>&1

    echo "==== Starting bastion instance setup ===="

    echo "Installing SSM and CloudWatch agents..."
    yum install -y amazon-ssm-agent
    yum install -y amazon-cloudwatch-agent

    echo "Enabling and starting SSM agent..."
    systemctl enable amazon-ssm-agent
    systemctl start amazon-ssm-agent

    echo "Enabling CloudWatch agent..."
    systemctl enable amazon-cloudwatch-agent

    echo "Writing CloudWatch Agent config..."
    cat <<EOC > /opt/aws/amazon-cloudwatch-agent/bin/config.json
    {
      "agent": {
        "metrics_collection_interval": 60,
        "run_as_user": "root"
      },
      "logs": {
        "logs_collected": {
          "files": {
            "collect_list": [
              {
                "file_path": "/var/log/messages",
                "log_group_name": "/ec2/bastion/messages",
                "log_stream_name": "{instance_id}"
              },
              {
                "file_path": "/var/log/cloud-init-output.log",
                "log_group_name": "/ec2/bastion/cloud-init-output",
                "log_stream_name": "{instance_id}"
              },
              {
                "file_path": "/var/log/amazon/ssm/amazon-ssm-agent.log",
                "log_group_name": "/ec2/bastion/ssm-agent",
                "log_stream_name": "{instance_id}"
              },
              {
                "file_path": "/var/log/yum.log",
                "log_group_name": "/ec2/bastion/yum",
                "log_stream_name": "{instance_id}"
              },
              {
                "file_path": "/var/log/custom-debug.log",
                "log_group_name": "/ec2/bastion/custom-debug",
                "log_stream_name": "{instance_id}"
              }
            ]
          }
        }
      }
    }
    EOC

    echo "Starting CloudWatch agent..."
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
      -a fetch-config \
      -m ec2 \
      -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json \
      -s

    echo "==== Setup complete ===="
  EOF
}

########################################
# VPC Region Variable
########################################
variable "region" {
  description = "AWS region to use for VPC endpoints"
  type        = string
  default     = "us-west-2"
}

########################################
# VPC Interface Endpoint for SSM
########################################
resource "aws_vpc_endpoint" "ssm" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.ssm"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.db_subnet_ids
  security_group_ids = [aws_security_group.rds_sg.id]
  private_dns_enabled = true

  tags = {
    Name = "ssm-endpoint"
  }
}

########################################
# VPC Interface Endpoint for SSM Messages
########################################
resource "aws_vpc_endpoint" "ssmmessages" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.ssmmessages"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.db_subnet_ids
  security_group_ids = [aws_security_group.rds_sg.id]
  private_dns_enabled = true

  tags = {
    Name = "ssmmessages-endpoint"
  }
}

########################################
# VPC Interface Endpoint for EC2 Messages
########################################
resource "aws_vpc_endpoint" "ec2messages" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.region}.ec2messages"
  vpc_endpoint_type = "Interface"
  subnet_ids        = var.db_subnet_ids
  security_group_ids = [aws_security_group.rds_sg.id]
  private_dns_enabled = true

  tags = {
    Name = "ec2messages-endpoint"
  }
}

########################################
# Security Group Rule for VPC Endpoint Access
########################################
resource "aws_security_group_rule" "allow_bastion_https_to_endpoints" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["10.0.1.0/24"]
  security_group_id = aws_security_group.rds_sg.id
  description       = "Allow HTTPS from Bastion subnet to VPC endpoints"
}


########################################
# Security Group Rule for Bastion Access
########################################
resource "aws_security_group_rule" "allow_bastion_to_rds" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.rds_sg.id
  source_security_group_id = aws_security_group.bastion_sg.id
  description              = "Allow bastion to access Postgres"
  depends_on               = [aws_instance.bastion]
}
