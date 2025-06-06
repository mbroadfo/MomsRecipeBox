output "db_username" {
  value = aws_db_instance.mrb_postgres.username
}

output "db_password" {
  value     = random_password.db_password.result
  sensitive = true
}
