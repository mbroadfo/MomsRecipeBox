# Updated configuration for your existing auth0-jwt-validator Lambda
# Just update these values in your existing Lambda:

AUTH0_DOMAIN = "dev-jdsnf3lqod8nxlnv.us.auth0.com"  # Keep your existing domain
AUTH0_AUDIENCE_PERMISSIONS = {
    "https://cruise-admin-api": "admin",
    "https://cruise-viewer-api": "*",
    # Add MomsRecipeBox audiences:
    "https://momsrecipebox-api": "*",           # General API access
    "https://momsrecipebox-admin-api": "admin"  # Admin API access
}

# The rest of your Lambda code remains the same!
# This allows both your cruise app and MomsRecipeBox to use the same validator
