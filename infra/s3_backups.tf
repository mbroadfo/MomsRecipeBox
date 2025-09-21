##################################################################
# S3 Bucket for MongoDB Atlas Backups
# TEMPORARILY COMMENTED OUT - Bucket already exists but can't be imported
# due to permission limitations with current terraform user
##################################################################

# resource "aws_s3_bucket" "mongodb_backups" {
#   bucket = "mrb-mongodb-backups-dev"
# 
#   tags = {
#     Environment = "dev"
#     Name        = "Moms Recipe Box MongoDB Backups"
#   }
# }

# # Private access only - no public access to backups
# resource "aws_s3_bucket_public_access_block" "mongodb_backups" {
#   bucket = aws_s3_bucket.mongodb_backups.id
# 
#   block_public_acls       = true
#   block_public_policy     = true
#   ignore_public_acls      = true
#   restrict_public_buckets = true
# }

# # Configure lifecycle policy to expire old backups after 30 days
# resource "aws_s3_bucket_lifecycle_configuration" "mongodb_backups_lifecycle" {
#   bucket = aws_s3_bucket.mongodb_backups.id
# 
#   rule {
#     id     = "expire-old-backups"
#     status = "Enabled"
# 
#     filter {
#       prefix = ""  # Apply to all objects in the bucket
#     }
# 
#     expiration {
#       days = 30
#     }
# 
#     # Move to Infrequent Access after 7 days to save costs
#     transition {
#       days          = 7
#       storage_class = "STANDARD_IA"
#     }
#   }
# }

# output "mongodb_backups_bucket" {
#   value = aws_s3_bucket.mongodb_backups.bucket
# }

# NOTE: The mrb-mongodb-backups-dev bucket already exists
# Will be managed manually until terraform-mrb user is created

# Note: The mrb_api_s3_access policy is defined in app_api.tf and includes backup bucket permissions