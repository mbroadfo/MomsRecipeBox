# Variable values for Mom's Recipe Box Terraform setup

vpc_id         = "vpc-0bca063e5a0ff38c7"
db_subnet_ids  = [
  "subnet-022be9ea4ac9e10eb",  # us-west-2a
  "subnet-032e887c9ef595bd6"   # us-west-2b
]
allowed_cidrs  = [
  "174.29.251.165/32"
]
db_username    = "mrb_admin"

db_secret_arn = "arn:aws:secretsmanager:us-west-2:491696534851:secret:moms-recipe-box-secrets"
