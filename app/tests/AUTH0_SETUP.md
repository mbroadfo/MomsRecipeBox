# Auth0 Machine-to-Machine Setup Guide

This guide explains how to set up Auth0 Machine-to-Machine (M2M) authentication for the MomsRecipeBox API testing.

## 📋 Prerequisites

1. Access to Auth0 Dashboard (momsrecipebox.us.auth0.com)
2. Admin permissions to create applications and APIs

## 🛠️ Setup Steps

### Step 1: Create Machine-to-Machine Application

1. **Log into Auth0 Dashboard**
   - Go to <https://manage.auth0.com>
   - Select your tenant: `momsrecipebox`

2. **Create New Application**
   - Navigate to `Applications` → `Applications`
   - Click `+ Create Application`
   - Name: `MomsRecipeBox API Tests`
   - Type: Select `Machine to Machine Applications`
   - Click `Create`

3. **Configure Application**
   - Select your API: `MomsRecipeBox API` (identifier: `https://momsrecipebox.com/api`)
   - Grant required scopes:
     - `read:recipes`
     - `write:recipes`
     - `delete:recipes`
     - `read:comments`
     - `write:comments`
     - `delete:comments`
   - Click `Authorize`

4. **Get Credentials**
   - Note down the `Client ID` and `Client Secret`
   - These will be used for token generation

### Step 2: Configure Environment Variables

Create or update your environment configuration:

```bash
# Auth0 Configuration
AUTH0_DOMAIN=momsrecipebox.us.auth0.com
AUTH0_AUDIENCE=https://momsrecipebox.com/api
AUTH0_M2M_CLIENT_ID=your_client_id_here
AUTH0_M2M_CLIENT_SECRET=your_client_secret_here
```

**For PowerShell (Windows):**

```powershell
$env:AUTH0_DOMAIN="momsrecipebox.us.auth0.com"
$env:AUTH0_AUDIENCE="https://momsrecipebox.com/api"
$env:AUTH0_M2M_CLIENT_ID="your_client_id_here"
$env:AUTH0_M2M_CLIENT_SECRET="your_client_secret_here"
```

**For Bash (Linux/Mac):**

```bash
export AUTH0_DOMAIN="momsrecipebox.us.auth0.com"
export AUTH0_AUDIENCE="https://momsrecipebox.com/api"
export AUTH0_M2M_CLIENT_ID="your_client_id_here"
export AUTH0_M2M_CLIENT_SECRET="your_client_secret_here"
```

### Step 3: Test Token Generation

```bash
cd app/tests
node test-auth0-tokens.js
```

Expected output:

```text
🔐 Testing Auth0 JWT Token Generation

1. Validating Auth0 configuration...
✅ Configuration valid

2. Generating Auth0 JWT token...
✅ Token generated: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIs...

3. Testing token with API Gateway...
✅ API Gateway responded with status: 200
✅ Response data: [{"_id":"...","name":"..."}]...

🎉 All tests passed! JWT authentication is working correctly.
```

## 🔧 Troubleshooting

### Error: "Auth0 M2M credentials not configured"

- Ensure all environment variables are set correctly
- Verify CLIENT_ID and CLIENT_SECRET are from the M2M application

### Error: "access_denied"

- Check that the M2M application has been authorized for your API
- Verify the API identifier matches: `https://momsrecipebox.com/api`
- Ensure required scopes are granted

### Error: "Unauthorized" from API Gateway

- Verify the JWT authorizer is configured correctly
- Check that the Auth0 domain and audience match in both the authorizer and token generation

### Error: "invalid_client"

- Double-check the CLIENT_ID and CLIENT_SECRET values
- Ensure you're using credentials from a Machine-to-Machine application, not a SPA or Regular Web App

## 📚 Token Details

The generated tokens will contain:

- **Issuer (iss)**: `https://momsrecipebox.us.auth0.com/`
- **Audience (aud)**: `https://momsrecipebox.com/api`
- **Expiration (exp)**: Typically 24 hours
- **Scopes**: As configured in the M2M application

## 🔄 Next Steps

Once token generation is working:

1. Update test files to use real JWT tokens
2. Remove dummy token implementations
3. Test all CRUD operations with authentication
4. Validate error handling scenarios

---

**Note**: Keep your CLIENT_SECRET secure and never commit it to version control. Use environment variables or secure secret management.
