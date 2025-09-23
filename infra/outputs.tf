###############################################################################
# Outputs
###############################################################################

# API Gateway URL
output "api_gateway_url" {
  description = "API Gateway endpoint URL for the Mom's Recipe Box API"
  value       = var.enable_app_api ? "https://${aws_api_gateway_rest_api.app_api[0].id}.execute-api.us-west-2.amazonaws.com/${aws_api_gateway_stage.app_api_stage[0].stage_name}" : null
}
