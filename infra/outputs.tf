###############################################################################
# Output - Private Subnet IDs (used by Lambda to attach to the VPC)
###############################################################################

output "private_subnet_ids" {
  description = "List of private subnet IDs for Lambda or RDS"
  value       = module.network.private_subnets
}
