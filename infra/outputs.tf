output "db_endpoint" {
  value = "${try(aws_rds_cluster.mrb_postgres[0].endpoint, "")}:5432"
}

output "db_username" {
  value = try(aws_rds_cluster.mrb_postgres[0].master_username, "")
}

output "db_password" {
  value     = try(random_password.db_password.result, "")
  sensitive = true
}

output "aurora_cluster_endpoint" {
  value = try(aws_rds_cluster.mrb_postgres[0].endpoint, "")
}

output "aurora_reader_endpoint" {
  value = try(aws_rds_cluster.mrb_postgres[0].reader_endpoint, "")
}
