# Variables for Mom's Recipe Box Terraform RDS Setup

variable "vpc_id" {
  description = "The VPC ID where RDS and security groups will be provisioned"
  type        = string
}

variable "db_subnet_ids" {
  description = "List of subnet IDs to launch RDS within"
  type        = list(string)
}

variable "allowed_cidrs" {
  description = "List of CIDR blocks allowed to access the RDS instance"
  type        = list(string)
  default     = []
}

variable "db_username" {
  description = "The master username for the RDS instance"
  type        = string
  default     = "mrb_admin"
}
