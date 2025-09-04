# MomsRecipeBox Admin API - Postman Setup Guide

This guide will help you set up and use the Postman collection for testing the MomsRecipeBox Admin API endpoints with secure M2M authentication.

## 📦 Files Included

- `MomsRecipeBox-Admin-API.postman_collection.json` - Main collection with all admin endpoints
- `MomsRecipeBox-Admin-Local.postman_environment.json` - Environment configuration for local testing

## 🚀 Quick Setup

### 1. Import Collection and Environment

1. Open Postman
2. Click **Import** button
3. Import both files:
   - `MomsRecipeBox-Admin-API.postman_collection.json`
   - `MomsRecipeBox-Admin-Local.postman_environment.json`

### 2. Configure M2M Credentials

1. Select the **MomsRecipeBox Admin - Local** environment
2. Set the following **secret** variables:
   - `auth0_m2m_client_id`: Your Auth0 M2M Client ID
   - `auth0_m2m_client_secret`: Your Auth0 M2M Client Secret

**🔐 Security Note:** These credentials should be kept secure and never shared or committed to version control.

### 3. Get M2M Credentials from Auth0

1. Go to Auth0 Dashboard → Applications
2. Find your Machine-to-Machine application (or create one)
3. Copy the **Client ID** and **Client Secret**
4. Ensure the M2M app is authorized for the Management API with scopes:
   - `read:users`
   - `create:users` 
   - `delete:users`
   - `read:user_app_metadata`

### 4. Get Admin Token Automatically

1. **First, run the "Get M2M Token" request** in the Authentication & Testing folder
2. This will automatically:
   - Call Auth0's OAuth endpoint with your M2M credentials
   - Extract the access token from the response
   - Set it in the `auth0_admin_jwt` environment variable
   - Make it available for all subsequent admin requests
3. Find the access token and copy it

#### Token Validation
## 🧪 Testing Endpoints

### Step 1: Get Token
1. Run **Get M2M Token** request first
2. Check the test results - should show "✅ M2M Token obtained and set in environment"

### Step 2: Test Admin Functions
1. **List Users**: Get all users with pagination and statistics
2. **Invite User**: Create a new user (update email first!)
3. **Delete User**: Remove a user (get user_id from list users first)

## 📋 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /admin/users` | GET | List all users with pagination and stats |
| `POST /admin/users/invite` | POST | Invite a new user |
| `DELETE /admin/users/{id}` | DELETE | Delete a user |

## 🔧 Troubleshooting

### Common Issues

#### M2M Credentials Not Set
- **Cause**: Missing `auth0_m2m_client_id` or `auth0_m2m_client_secret`
- **Solution**: Set these in your Postman environment variables

#### 401 Unauthorized on Get M2M Token
- **Cause**: Invalid M2M credentials
- **Solution**: 
  - Verify credentials in Auth0 Dashboard
  - Ensure M2M app exists and is active
  - Check client ID and secret are correct

#### 403 Forbidden on Get M2M Token  
- **Cause**: M2M app lacks required scopes
- **Solution**:
  - Go to Auth0 Dashboard → Applications → Your M2M App
  - Click "APIs" tab
  - Ensure Management API is authorized with required scopes

#### "jwt malformed" on Admin Requests
- **Cause**: Token not properly set by Get M2M Token request
- **Solution**: 
  - Re-run the "Get M2M Token" request
  - Check that it completes successfully
  - Verify `auth0_admin_jwt` environment variable is set

## 🔒 Security Features

### Secure Token Management
- **No hardcoded tokens**: Tokens are obtained dynamically via OAuth
- **Automatic expiration**: M2M tokens expire and must be refreshed
- **Credential isolation**: M2M credentials stay in environment variables
- **No token exposure**: Tokens are not logged or displayed unnecessarily

### Best Practices
1. **Rotate M2M credentials** regularly
2. **Use separate M2M apps** for different environments (dev/staging/prod)
3. **Limit M2M scopes** to only what's needed
4. **Monitor M2M usage** in Auth0 logs

## 📝 Environment Variables Reference

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `base_url` | Default | API server URL | `http://localhost:3000` |
| `auth0_admin_jwt` | Secret | Auto-set by Get M2M Token | `eyJhbGciOiJSUzI1NiIs...` |
| `auth0_domain` | Default | Your Auth0 domain | `your-tenant.auth0.com` |
| `auth0_m2m_client_id` | Secret | M2M Client ID | `your_client_id` |
| `auth0_m2m_client_secret` | Secret | M2M Client Secret | `your_client_secret` |
| `test_user_id` | Default | User ID for delete testing | `auth0\|123456789` |
| `test_email` | Default | Email for invitation testing | `test@yourdomain.com` |

## 🎯 Workflow Summary

1. **Setup**: Import collection and environment
2. **Configure**: Set M2M credentials in environment  
3. **Authenticate**: Run "Get M2M Token" to get admin access
4. **Test**: Use admin endpoints (token automatically included)
5. **Refresh**: Re-run "Get M2M Token" when token expires

This approach provides secure, automated token management while keeping your M2M credentials protected.

## 🔄 Collection Features

### Automatic Token Management
- The "Get M2M Token" request automatically sets the JWT token
- Pre-request scripts validate token presence and format
- Post-response scripts provide detailed feedback

### Automatic Tests
Each request includes automatic tests that check:
- Response time is reasonable (< 5 seconds)
- Response is valid JSON
- Authentication errors are detected and reported
- Content-Type headers are correct

### Smart Error Handling
- Clear error messages for missing credentials
- Helpful instructions for fixing common issues
- Automatic detection of token format problems

---

💡 **Security Tip**: This M2M approach is much more secure than manual token copying. Your credentials stay protected while providing seamless authentication for testing.
