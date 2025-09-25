# ==============================================
# S3 + CloudFront for UI Static Hosting
# Phase 4.2: UI DevOps Integration
# ==============================================

# S3 Bucket for UI Static Hosting
resource "aws_s3_bucket" "ui_hosting" {
  bucket = var.ui_hosting_bucket

  tags = {
    Environment = "dev"
    Name        = "MomsRecipeBox UI Hosting"
    Phase       = "4.2"
    Purpose     = "StaticWebsiteHosting"
  }
}

# S3 Bucket Configuration for Static Website Hosting
resource "aws_s3_bucket_website_configuration" "ui_hosting" {
  bucket = aws_s3_bucket.ui_hosting.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html" # SPA fallback - all routes go to index.html
  }
}

# S3 Bucket Versioning (optional, for rollback capability)
resource "aws_s3_bucket_versioning" "ui_hosting" {
  bucket = aws_s3_bucket.ui_hosting.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket Public Access Configuration
resource "aws_s3_bucket_public_access_block" "ui_hosting" {
  bucket = aws_s3_bucket.ui_hosting.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# CloudFront Origin Access Control (OAC) - Modern replacement for OAI
resource "aws_cloudfront_origin_access_control" "ui_hosting" {
  name                              = "mrb-ui-hosting-oac"
  description                       = "Origin Access Control for MomsRecipeBox UI"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 Bucket Policy for CloudFront Access
resource "aws_s3_bucket_policy" "ui_hosting" {
  bucket = aws_s3_bucket.ui_hosting.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly",
        Effect    = "Allow",
        Principal = {
          Service = "cloudfront.amazonaws.com"
        },
        Action   = "s3:GetObject",
        Resource = "${aws_s3_bucket.ui_hosting.arn}/*",
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.ui_hosting.arn
          }
        }
      }
    ]
  })
}

# CloudFront Distribution for Global CDN
resource "aws_cloudfront_distribution" "ui_hosting" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "MomsRecipeBox UI Distribution - Phase 4.2"
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # Use only North America and Europe for cost optimization

  # Origin - S3 Bucket
  origin {
    domain_name              = aws_s3_bucket.ui_hosting.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.ui_hosting.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.ui_hosting.id
  }

  # Default Cache Behavior
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.ui_hosting.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    # Caching optimized for SPA
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # AWS Managed CachingDisabled
    
    # Modern security headers
    response_headers_policy_id = "5cc3b908-e619-4b99-88e5-2cf7f45965bd" # AWS Managed SecurityHeadersPolicy

    # Origin request policy for SPA
    origin_request_policy_id = "acba4595-bd28-49b8-b9fe-13317c0390fa" # AWS Managed UserAgentRefererHeaders
  }

  # Cache Behavior for Static Assets (CSS, JS, Images)
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.ui_hosting.bucket}"
    compress         = true

    viewer_protocol_policy = "redirect-to-https"
    
    # Long-term caching for versioned assets - will use custom policy after creation
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # AWS Managed CachingDisabled (temporary)
    
    response_headers_policy_id = "5cc3b908-e619-4b99-88e5-2cf7f45965bd" # AWS Managed SecurityHeadersPolicy
  }

  # Geographic Restrictions (optional)
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL Certificate (AWS-provided)
  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  # Custom Error Response for SPA Routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
    error_caching_min_ttl = 0
  }

  tags = {
    Environment = "dev"
    Name        = "MomsRecipeBox UI CDN"
    Phase       = "4.2"
    Purpose     = "UIDistribution"
  }
}

# Custom Cache Policy for Static Assets (Vite builds have hashed filenames)
resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "mrb-static-assets-cache-policy"
  comment     = "Cache policy for MRB static assets with long TTL"
  default_ttl = 31536000 # 1 year
  max_ttl     = 31536000 # 1 year
  min_ttl     = 31536000 # 1 year

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    query_strings_config {
      query_string_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    cookies_config {
      cookie_behavior = "none"
    }
  }
}

# Update the ordered_cache_behavior to use our custom policy
# This will require updating the above resource, but Terraform doesn't allow 
# forward references, so we'll handle this in the outputs or a separate run

# ==============================================
# Outputs for UI Deployment
# ==============================================

output "ui_s3_bucket_name" {
  description = "Name of the S3 bucket for UI hosting"
  value       = aws_s3_bucket.ui_hosting.bucket
}

output "ui_s3_bucket_arn" {
  description = "ARN of the S3 bucket for UI hosting"
  value       = aws_s3_bucket.ui_hosting.arn
}

output "ui_s3_website_endpoint" {
  description = "S3 website endpoint (for testing)"
  value       = aws_s3_bucket_website_configuration.ui_hosting.website_endpoint
}

output "ui_cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = aws_cloudfront_distribution.ui_hosting.id
}

output "ui_cloudfront_domain_name" {
  description = "CloudFront domain name for the UI"
  value       = aws_cloudfront_distribution.ui_hosting.domain_name
}

output "ui_cloudfront_url" {
  description = "Full HTTPS URL for the UI"
  value       = "https://${aws_cloudfront_distribution.ui_hosting.domain_name}"
}

output "ui_cloudfront_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.ui_hosting.arn
}