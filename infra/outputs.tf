output "aurora_dsql_writer_endpoint" {
  value = aws_rds_cluster.aurora_dsql.endpoint
}
###############################################################################
# Output - Private Subnet IDs (used by Lambda to attach to the VPC)
###############################################################################

output "private_subnet_ids" {
  description = "List of private subnet IDs for Lambda or RDS"
  value       = module.network.private_subnets
}
