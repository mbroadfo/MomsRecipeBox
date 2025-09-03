# MomsRecipeBox Admin API - Postman Setup Guide

This guide will help you set up and use the Postman collection for testing the MomsRecipeBox Admin API endpoints.

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

### 2. Configure Environment

1. Select the **MomsRecipeBox Admin - Local** environment
2. Update the following variables:
   - `auth0_admin_jwt`: Your Auth0 JWT token with admin permissions
   - `test_user_id`: A real user ID for delete testing (optional)
   - `test_email`: Email for invitation testing

### 3. Get Auth0 JWT Token

You need a valid Auth0 JWT token with admin permissions. Here are a few ways to get one:

#### Option A: Using Auth0 Dashboard (Test Token)
1. Go to Auth0 Dashboard → Applications → APIs
2. Select your API → Test tab
3. Copy the test token (limited time)

#### Option B: Using Your Frontend Application
1. Login to your application as an admin user
2. Open browser dev tools → Application → Local Storage
3. Find the access token and copy it

#### Option C: Using Postman Auth0 Flow (Advanced)
1. Set up OAuth 2.0 in Postman with your Auth0 credentials
2. Use Authorization Code flow to get tokens

## 🧪 Testing Endpoints

### Test Authentication First
1. Run the **Test Authentication** request
2. Expected responses:
   - ✅ **200 OK**: Authentication working
   - ❌ **401 Unauthorized**: Invalid JWT token
   - ❌ **403 Forbidden**: Insufficient permissions

### Test User Management
1. **List Users**: Get all users with pagination
2. **Invite User**: Create a new user (update email first!)
3. **Delete User**: Remove a user (get user_id from list users first)

## 📋 Available Endpoints

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/admin/users` | GET | `admin:read` | List all users with pagination and stats |
| `/admin/users/invite` | POST | `admin:write` | Invite a new user |
| `/admin/users/{id}` | DELETE | `admin:write` | Delete a user |

## 🔧 Troubleshooting

### Common Issues

#### 401 Unauthorized
- **Cause**: Invalid, expired, or missing JWT token
- **Solution**: 
  - Verify token in environment variables
  - Get a fresh token from Auth0
  - Check token format (should start with `eyJ`)

#### 403 Forbidden
- **Cause**: JWT valid but lacks admin permissions
- **Solution**:
  - Ensure your user has admin role
  - Check JWT contains `admin:read` and `admin:write` permissions
  - Verify Auth0 API permissions configuration

#### 404 Not Found
- **Cause**: Server not running or wrong URL
- **Solution**:
  - Ensure MomsRecipeBox server is running on localhost:3000
  - Check `base_url` environment variable

#### 500 Internal Server Error
- **Cause**: Server configuration issue
- **Solution**:
  - Check server logs for detailed error
  - Verify Auth0 M2M configuration
  - Ensure database connectivity

### Token Debugging

To debug your JWT token:
1. Copy your token
2. Go to [jwt.io](https://jwt.io)
3. Paste token to decode and inspect claims
4. Verify:
   - `iss` (issuer) matches your Auth0 domain
   - `aud` (audience) includes `https://momsrecipebox-api`
   - `permissions` array includes admin permissions
   - `exp` (expiration) is in the future

## 📝 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API server URL | `http://localhost:3000` |
| `auth0_admin_jwt` | Auth0 JWT with admin permissions | `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `auth0_domain` | Your Auth0 domain | `your-tenant.auth0.com` |
| `test_user_id` | User ID for delete testing | `auth0\|123456789` |
| `test_email` | Email for invitation testing | `test@yourdomain.com` |

## 🔄 Collection Features

### Automatic Tests
Each request includes automatic tests that check:
- Response time is reasonable (< 5 seconds)
- Response is valid JSON
- Authentication errors are detected and reported
- Content-Type headers are correct

### Pre-request Scripts
- Validates JWT token is configured
- Warns if using placeholder values

### Collection Variables
Variables are shared across all requests and can be updated in one place.

## 🎯 Next Steps

1. **Start with Test Authentication** to verify setup
2. **Use List Users** to get real user IDs for testing
3. **Test Invite User** with a real email address
4. **Be careful with Delete User** - it's permanent!

For more detailed API documentation, see the main README.md in the admin folder.

---

💡 **Tip**: Keep your JWT tokens secure and rotate them regularly. Never commit tokens to version control.
