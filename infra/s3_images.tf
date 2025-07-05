resource "aws_s3_bucket" "recipe_images" {
  bucket = "mrb-recipe-images-dev"

  tags = {
    Environment = "dev"
    Name        = "Mom's Recipe Box Images"
  }
}

resource "aws_s3_bucket_public_access_block" "recipe_images" {
  bucket = aws_s3_bucket.recipe_images.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "allow_public_read" {
  bucket = aws_s3_bucket.recipe_images.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid       = "PublicReadGetObject",
        Effect    = "Allow",
        Principal = "*",
        Action    = "s3:GetObject",
        Resource  = "${aws_s3_bucket.recipe_images.arn}/*"
      }
    ]
  })
}

output "recipe_images_bucket_url" {
  value = "https://${aws_s3_bucket.recipe_images.bucket}.s3.amazonaws.com/"
}
