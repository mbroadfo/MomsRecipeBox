# Variables for Mom's Recipe Box Terraform Setup

variable "vpc_id" {
  description = "The VPC ID where resources will be provisioned"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnets used by the bastion host"
  type        = list(string)
  default     = [
    "subnet-022be9ea4ac9e10eb",
    "subnet-032e887c9ef595bd6"
  ]
}

variable "enable_app_api" {
  description = "Enable the app API resources"
  type        = bool
  default     = false
}
