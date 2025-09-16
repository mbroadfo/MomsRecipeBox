##################################################################
# S3 Bucket for MongoDB Atlas Backups
##################################################################

resource "aws_s3_bucket" "mongodb_backups" {
  bucket = "mrb-mongodb-backups-dev"

  tags = {
    Environment = "dev"
    Name        = "Moms Recipe Box MongoDB Backups"
  }
}

# Private access only - no public access to backups
resource "aws_s3_bucket_public_access_block" "mongodb_backups" {
  bucket = aws_s3_bucket.mongodb_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Configure lifecycle policy to expire old backups after 30 days
resource "aws_s3_bucket_lifecycle_configuration" "mongodb_backups_lifecycle" {
  bucket = aws_s3_bucket.mongodb_backups.id

  rule {
    id     = "expire-old-backups"
    status = "Enabled"

    expiration {
      days = 30
    }

    # Move to Infrequent Access after 7 days to save costs
    transition {
      days          = 7
      storage_class = "STANDARD_IA"
    }
  }
}

output "mongodb_backups_bucket" {
  value = aws_s3_bucket.mongodb_backups.bucket
}