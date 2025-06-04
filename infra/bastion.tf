# Bastion EC2 instance with SSM Session Manager support

##################################################################
# IAM Role for Bastion EC2 Instance
##################################################################
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

##################################################################
# Attach AmazonSSMManagedInstanceCore Policy to IAM Role
##################################################################
resource "aws_iam_role_policy_attachment" "ssm_core_attach" {
  role       = aws_iam_role.ssm_bastion_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

##################################################################
# Fetch Latest Amazon Linux 2023 x86_64 AMI
##################################################################
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

##################################################################
# Bastion EC2 Instance Configuration
##################################################################
resource "aws_instance" "bastion" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  subnet_id              = var.db_subnet_ids[0]
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  iam_instance_profile   = aws_iam_instance_profile.bastion_profile.name

  tags = {
    Name = "mrb-bastion-dev"
  }
}

##################################################################
# Instance Profile for Bastion EC2 Instance
##################################################################
resource "aws_iam_instance_profile" "bastion_profile" {
  name = "bastion-instance-profile"
  role = aws_iam_role.ssm_bastion_role.name
}
