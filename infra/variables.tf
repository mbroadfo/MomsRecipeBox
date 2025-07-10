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

variable "public_subnet_ids" {
  description = "Public subnets used by the bastion host"
  type        = list(string)
  default     = [
    "subnet-022be9ea4ac9e10eb",
    "subnet-032e887c9ef595bd6"
  ]
}

variable "enable_bastion" {
  description = "Enable bastion host and VPC Endpoints for RDS access via Session Manager"
  type        = bool
  default     = false
}
