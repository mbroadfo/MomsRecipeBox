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
# Bastion EC2 Instance
########################################
resource "aws_instance" "bastion" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t3.micro"
  subnet_id                   = var.public_subnet_ids[0]
  vpc_security_group_ids      = [aws_security_group.rds_sg.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.bastion_profile.name
  tags = {
    Name = "bastion"
  }
  user_data = <<-EOF
    #!/bin/bash
    yum install -y amazon-ssm-agent
    yum install -y amazon-cloudwatch-agent

    systemctl enable amazon-ssm-agent
    systemctl start amazon-ssm-agent
    systemctl enable amazon-cloudwatch-agent

    echo "SSM Agent status:" > /tmp/ssm_debug.log
    systemctl status amazon-ssm-agent >> /tmp/ssm_debug.log

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
                "file_path": "/var/log/cloud-init.log",
                "log_group_name": "/ec2/bastion/cloud-init",
                "log_stream_name": "{instance_id}"
              }
            ]
          }
        }
      }
    }
    EOC

    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
      -a fetch-config \
      -m ec2 \
      -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json \
      -s
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
