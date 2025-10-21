# Auth0 Discovery Checklist - Phase 0

## Overview

This checklist will help us document your existing Auth0 setup and plan the integration with Mom's Recipe Box's multi-mode architecture.

## 1. Current Auth0 Tenant Information

### Basic Tenant Details
- [ ] **Tenant Domain**: `dev-jdsnf3lqod8nxlnv.us.auth0.com` ✅ (confirmed)
- [ ] **Tenant Region**: (Please confirm - likely US)
- [ ] **Plan Type**: (Free, Developer, Developer Pro, etc.)
- [ ] **Custom Domain**: (If any - e.g., auth.yourdomain.com)

### Existing Applications
Please provide the following for each application in your tenant:

#### Application 1: [Your Existing Application Name]
- [ ] **Application Type**: (SPA, Regular Web App, M2M, etc.)
- [ ] **Client ID**: (We'll need this for reference)
- [ ] **Allowed Callback URLs**: (Current configuration)
- [ ] **Allowed Logout URLs**: (Current configuration)
- [ ] **Allowed Web Origins**: (Current configuration)
- [ ] **Grants**: (Authorization Code, Implicit, etc.)

#### Application 2: [If you have additional applications]
- [ ] **Application Type**: 
- [ ] **Client ID**: 
- [ ] **Callback URLs**: 
- [ ] **Logout URLs**: 
- [ ] **Web Origins**: 
- [ ] **Grants**: 

### Machine-to-Machine Applications
- [ ] **M2M App Name**: (For Management API access)
- [ ] **M2M Client ID**: 
- [ ] **Authorized APIs**: (Auth0 Management API, Custom APIs)
- [ ] **Scopes**: (read:users, create:users, delete:users, etc.)

## 2. Current API Configuration

### Existing APIs
For each API configured in your tenant:

#### API 1: [Your Existing API Name]
- [ ] **API Name**: 
- [ ] **Identifier**: (e.g., https://your-api-identifier)
- [ ] **Signing Algorithm**: (RS256, HS256)
- [ ] **Scopes**: (List all scopes)
- [ ] **Token Expiration**: 

#### API 2: [If additional APIs exist]
- [ ] **API Name**: 
- [ ] **Identifier**: 
- [ ] **Scopes**: 

## 3. Current Branding & Customization

### Universal Login Page
- [ ] **Custom Template**: (Do you have a custom login page template?)
- [ ] **Branding Assets**: (Logo, colors, CSS)
- [ ] **Current HTML Template**: (Please provide the template code)
- [ ] **Custom CSS**: (Please provide any custom CSS)
- [ ] **JavaScript Customizations**: (Any custom JS code)

### Password Reset Flow
- [ ] **Custom Password Reset Template**: (If customized)
- [ ] **Email Templates**: (Custom password reset emails)

### Current Branding Elements
- [ ] **Primary Colors**: (Hex codes for your brand colors)
- [ ] **Logo URLs**: (Current logo used in Auth0)
- [ ] **Favicon**: (If customized)
- [ ] **Background Images**: (Any custom backgrounds)

## 4. User Management & Roles

### Current User Base
- [ ] **Total Users**: (Approximate count)
- [ ] **User Sources**: (Database, Social, Enterprise)
- [ ] **Connection Types**: (Username-Password, Google, etc.)

### Role & Permission Structure
- [ ] **Roles Defined**: (admin, user, etc.)
- [ ] **Custom Claims**: (Any custom user metadata)
- [ ] **Permission Scopes**: (How permissions are structured)

### User Metadata Structure
- [ ] **App Metadata**: (What's stored in app_metadata)
- [ ] **User Metadata**: (What's stored in user_metadata)

## 5. Rules, Hooks & Actions

### Auth0 Rules (Legacy)
- [ ] **Active Rules**: (List any rules currently active)
- [ ] **Rule Purposes**: (What each rule does)

### Auth0 Actions (Current)
- [ ] **Login Actions**: (Any custom login flow actions)
- [ ] **Post-Login Actions**: (Actions after successful login)
- [ ] **Pre-User Registration**: (Actions before user registration)

### Hooks
- [ ] **Active Hooks**: (Any webhooks configured)

## 6. Integration Requirements for Mom's Recipe Box

### Domain Requirements
Based on your multi-mode setup, we need to plan for:

- [ ] **Local Development**: `http://localhost:3000`, `http://localhost:5173`
- [ ] **Atlas Development**: Same as local (using cloud database)
- [ ] **Lambda Testing**: Do you have a staging domain planned?
- [ ] **Production**: Do you have a production domain planned? (e.g., momsrecipebox.app)

### Dual-Branding Requirements
- [ ] **Brand Differentiation**: How should Mom's Recipe Box branding differ from your existing app?
- [ ] **Shared Elements**: What branding elements should be shared between apps?
- [ ] **Domain-Based Detection**: Should branding change based on callback domain?

## 7. Export Tasks

Please provide the following exports/screenshots:

### Auth0 Dashboard Exports
- [ ] **Applications List**: (Screenshot of Applications page)
- [ ] **APIs List**: (Screenshot of APIs page)
- [ ] **Users & Roles**: (Screenshot of Users page)
- [ ] **Branding Settings**: (Screenshot of Universal Login branding)

### Configuration Files
- [ ] **Universal Login Template**: (Copy/paste the HTML template)
- [ ] **Custom CSS**: (Any custom CSS code)
- [ ] **Environment Variables**: (Current Auth0 env vars from your other project)

### Application Configurations
For each application, please export or provide:
- [ ] **Application Settings JSON**: (Download or copy settings)
- [ ] **Callback URL Lists**: (Complete lists)
- [ ] **Advanced Settings**: (Token settings, grants, etc.)

## 8. Auth0 Credential Extraction Guide

### Step-by-Step Credential Collection

#### 8.1 Get Auth0 Domain
- [ ] **Value**: `dev-jdsnf3lqod8nxlnv.us.auth0.com` ✅ (confirmed)
- [ ] **Location**: Auth0 Dashboard > Settings > General

#### 8.2 Create/Find Machine-to-Machine Application

**Navigation**: Auth0 Dashboard > Applications > Create Application

1. **Create M2M Application for Mom's Recipe Box**:
   - [ ] **Name**: "MomsRecipeBox-M2M" 
   - [ ] **Type**: Machine to Machine Applications
   - [ ] **Authorize for**: Auth0 Management API
   - [ ] **Scopes**: 
     - `read:users`
     - `create:users` 
     - `delete:users`
     - `read:user_app_metadata`
     - `update:user_app_metadata`

2. **Extract M2M Credentials**:
   - [ ] **Client ID**: (Copy from Settings tab)
   - [ ] **Client Secret**: (Copy from Settings tab)

#### 8.3 Create/Find SPA Application

**Navigation**: Auth0 Dashboard > Applications > Create Application

1. **Create SPA Application for Mom's Recipe Box**:
   - [ ] **Name**: "MomsRecipeBox-SPA"
   - [ ] **Type**: Single Page Application
   - [ ] **Technology**: React

2. **Configure SPA Settings**:
   ```
   Allowed Callback URLs:
   http://localhost:3000/callback,
   http://localhost:5173/callback,
   https://staging.momsrecipebox.app/callback,
   https://momsrecipebox.app/callback

   Allowed Logout URLs:
   http://localhost:3000,
   http://localhost:5173,
   https://staging.momsrecipebox.app,
   https://momsrecipebox.app

   Allowed Web Origins:
   http://localhost:3000,
   http://localhost:5173,
   https://staging.momsrecipebox.app,
   https://momsrecipebox.app
   ```

3. **Extract SPA Credentials**:
   - [ ] **Client ID**: (Copy from Settings tab)
   - [ ] **Client Secret**: (If using confidential client)

#### 8.4 Create API Resource

**Navigation**: Auth0 Dashboard > APIs > Create API

1. **Create API for Mom's Recipe Box**:
   - [ ] **Name**: "MomsRecipeBox API"
   - [ ] **Identifier**: `https://momsrecipebox/api`
   - [ ] **Signing Algorithm**: RS256

2. **Define Scopes**:
   - [ ] `read:recipes`
   - [ ] `write:recipes`
   - [ ] `delete:recipes`
   - [ ] `admin:read`
   - [ ] `admin:write`
   - [ ] `users:read`
   - [ ] `users:write`

#### 8.5 Credentials Summary Checklist

Once you have all applications configured, fill in these values:

```bash
# Domain (always same)
AUTH0_DOMAIN=dev-jdsnf3lqod8nxlnv.us.auth0.com

# M2M Application (for backend Management API access)
AUTH0_M2M_CLIENT_ID=your_m2m_client_id_here
AUTH0_M2M_CLIENT_SECRET=your_m2m_client_secret_here

# SPA Application (for frontend user authentication)
AUTH0_MRB_CLIENT_ID=your_spa_client_id_here
AUTH0_MRB_CLIENT_SECRET=your_spa_client_secret_here  # If needed

# API Configuration
AUTH0_API_AUDIENCE=https://momsrecipebox/api
AUTH0_MANAGEMENT_AUDIENCE=https://dev-jdsnf3lqod8nxlnv.us.auth0.com/api/v2/
```

### Step-by-Step AWS Secrets Manager Setup

#### 8.6 Update AWS Secrets Manager

**Command to update your existing secret**:

```bash
# Set your AWS profile first
$env:AWS_PROFILE="mrb-api"

# Update the existing secret with Auth0 credentials
aws secretsmanager update-secret `
  --secret-id "moms-recipe-secrets-dev" `
  --secret-string '{
    "MONGODB_URI": "your_existing_mongodb_uri",
    "MONGODB_ATLAS_URI": "your_existing_atlas_uri",
    "AUTH0_DOMAIN": "dev-jdsnf3lqod8nxlnv.us.auth0.com",
    "AUTH0_M2M_CLIENT_ID": "your_m2m_client_id_here",
    "AUTH0_M2M_CLIENT_SECRET": "your_m2m_client_secret_here",
    "AUTH0_MRB_CLIENT_ID": "your_spa_client_id_here",
    "AUTH0_MRB_CLIENT_SECRET": "your_spa_client_secret_here",
    "AUTH0_API_AUDIENCE": "https://momsrecipebox/api",
    "AUTH0_MANAGEMENT_AUDIENCE": "https://dev-jdsnf3lqod8nxlnv.us.auth0.com/api/v2/"
  }'
```

**Verify the update**:

```bash
aws secretsmanager get-secret-value --secret-id "moms-recipe-secrets-dev" --query SecretString --output text
```

## 9. Next Steps Planning

Once we have this information, we'll:

1. **Analyze Current Setup**: Review your existing configuration
2. **Plan Integration**: Determine how to integrate with Mom's Recipe Box
3. **Design Dual-Branding**: Plan the branding differentiation approach
4. **Map Multi-Mode Configuration**: Plan Auth0 config for each deployment profile
5. **Create Migration Plan**: Plan for user data migration

## How to Provide This Information

You can provide this information by:

1. **Screenshots**: For dashboard pages and settings
2. **Copy/Paste**: For code templates and configuration
3. **Export Files**: Download configuration files where possible
4. **Notes**: Add explanations for complex setups

Please start with whichever sections you can easily provide, and we'll work through them systematically.