output "db_writer_endpoint" {
  value = aws_rds_cluster.mrb_postgres.endpoint
}

output "db_reader_endpoint" {
  value = aws_rds_cluster.mrb_postgres.reader_endpoint
}

output "db_username" {
  value = aws_rds_cluster.mrb_postgres.master_username
}

output "db_password" {
  value     = random_password.db_password.result
  sensitive = true
}
