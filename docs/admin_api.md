# Admin API Documentation

## Overview

The MomsRecipeBox Admin API provides user management functionality with role-based access control. All admin endpoints require authentication with admin privileges.

## Authentication

Admin endpoints require a valid JWT token with admin role. The token must be included in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Token Types Accepted:
1. **Machine-to-Machine (M2M) Token**: Automatically grants admin access
2. **User Token with Admin Role**: User must have `admin` role in `https://momsrecipebox.app/roles` claim

## Admin Endpoints

### 1. List Users with Statistics

**GET** `/admin/users`

Lists all users with their Auth0 profile data and app usage statistics.

**Response:**
```json
{
  "users": [
    {
      "user_id": "auth0|60f7f2c8b1d2e3000000000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "loginCount": 15,
      "lastLogin": "2025-09-01T10:30:00.000Z",
      "userImage": "https://s.gravatar.com/avatar/...",
      "favoriteCount": 8,
      "commentCount": 12,
      "emailVerified": true,
      "createdAt": "2025-08-01T09:00:00.000Z",
      "lastUpdated": "2025-09-01T10:30:00.000Z"
    }
  ],
  "total": 45
}
```

### 2. Invite User

**POST** `/admin/users/invite`

Invites a new user to the platform.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "roles": ["user"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "User newuser@example.com invited successfully",
  "user": {
    "user_id": "auth0|60f7f2c8b1d2e3000000001",
    "email": "newuser@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "emailVerified": false
  }
}
```

### 3. Delete User

**DELETE** `/admin/users/{userId}`

Deletes a user and all their associated data (recipes, favorites, comments, shopping lists).

**Parameters:**
- `userId` (path): The Auth0 user ID (URL encoded)

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "deletedUserId": "auth0|60f7f2c8b1d2e3000000001"
}
```

### 4. System Status Check

**GET** `/admin/system-status`

Checks the status of core system components (database, S3, etc.). AI services have their own dedicated endpoint.

**Response:**

```json
{
  "success": true,
  "timestamp": "2025-09-10T10:30:00.000Z",
  "overall_status": "operational",
  "services": {
    "s3": {
      "status": "success",
      "message": "S3 bucket 'recipe-images-bucket' accessible"
    }
  },
  "note": "AI services status available at /admin/ai-services-status"
}
```

### 5. AI Services Status Check

**GET** `/admin/ai-services-status`

Comprehensive status check for all AI service providers. Supports multiple query parameters for different levels of detail.

**Query Parameters:**

- `test` (boolean): Set to `true` to perform actual connectivity tests. Default: `false`
- `includeUnavailable` (boolean): Include providers without API keys when testing. Default: `false`

**Response (basic status):**

```json
{
  "success": true,
  "timestamp": "2025-09-10T10:30:00.000Z",
  "testPerformed": false,
  "overallStatus": "operational",
  "summary": {
    "total": 5,
    "operational": 0,
    "configured": 3,
    "errors": 0,
    "rateLimited": 0,
    "unavailable": 2
  },
  "providers": [
    {
      "key": "google",
      "name": "Google Gemini",
      "status": "configured",
      "message": "API key configured, ready for testing",
      "endpoint": "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
      "model": "Default"
    },
    {
      "key": "groq",
      "name": "Groq",
      "status": "configured",
      "message": "API key configured, ready for testing",
      "endpoint": "https://api.groq.com/openai/v1/chat/completions",
      "model": "llama-3.1-8b-instant"
    },
    {
      "key": "openai",
      "name": "OpenAI",
      "status": "unavailable",
      "message": "API key not configured or invalid",
      "endpoint": "https://api.openai.com/v1/chat/completions",
      "model": "gpt-3.5-turbo"
    }
  ]
}
```

**Response (with connectivity testing):**

```json
{
  "success": true,
  "timestamp": "2025-09-10T22:42:36.760Z",
  "testPerformed": true,
  "overallStatus": "operational",
  "summary": {
    "total": 5,
    "operational": 5,
    "configured": 0,
    "errors": 0,
    "rateLimited": 0,
    "unavailable": 0
  },
  "providers": [
    {
      "key": "google",
      "name": "Google Gemini",
      "status": "operational",
      "message": "Google Gemini service operational",
      "provider": "Google Gemini",
      "responseTime": "290ms",
      "skipped": false
    },
    {
      "key": "groq",
      "name": "Groq", 
      "status": "operational",
      "message": "Groq service operational",
      "provider": "Groq",
      "responseTime": "414ms",
      "skipped": false
    },
    {
      "key": "deepseek",
      "name": "DeepSeek",
      "status": "rate_limited",
      "message": "Rate limited (45s remaining)",
      "responseTime": "N/A",
      "skipped": true,
      "rateLimitExpiry": 1725962445000
    },
    {
      "key": "openai",
      "name": "OpenAI",
      "status": "unavailable",
      "message": "API key not configured or invalid",
      "responseTime": "N/A",
      "skipped": true
    }
  ],
  "timing": {
    "tested": 5,
    "fastest": {
      "time": "290ms",
      "provider": "Google Gemini",
      "key": "google"
    },
    "slowest": {
      "time": "1770ms", 
      "provider": "DeepSeek",
      "key": "deepseek"
    },
    "average": "680ms",
    "totalTime": "3401ms"
  }
}
```

**Status Values:**

- `operational`: Provider is available and responding correctly
- `configured`: Provider has valid API key but not tested
- `rate_limited`: Provider is temporarily rate limited
- `error`: Provider encountered an error during testing
- `unavailable`: Provider has no valid API key configured

**Response Time Information:**

When `test=true` is used, each provider includes a `responseTime` field:
- Operational providers show actual response time (e.g., "290ms")
- Non-tested providers show "N/A"
- Error responses include the time taken before the error occurred

**Timing Statistics:**

When connectivity testing is performed, aggregate timing statistics are included:

- `tested`: Number of providers actually tested
- `fastest`: Object containing fastest response time, provider name, and key
- `slowest`: Object containing slowest response time, provider name, and key
- `average`: Average response time across tested providers
- `totalTime`: Sum of all individual response times

Example fastest/slowest objects:
```json
{
  "time": "290ms",
  "provider": "Google Gemini", 
  "key": "google"
}
```

## Error Responses

All admin endpoints return consistent error responses:

### Authentication Errors (401)

```json
{
  "error": "Authentication failed",
  "details": "Invalid token",
  "code": "AUTH_FAILED"
}
```

### Authorization Errors (403)

```json
{
  "error": "Insufficient permissions",
  "required": ["list_users"],
  "userRole": "user",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

### Server Errors (500)

```json
{
  "error": "Internal server error",
  "details": "Database connection failed",
  "code": "INTERNAL_ERROR"
}
```

## Permission System

The admin system uses a role-based permission model:

### Roles

- **user**: Regular application users
- **admin**: Can manage users and moderate content
- **super_admin**: Full system access (future use)

### Admin Permissions

- `list_users`: View user list and statistics
- `view_user_details`: View individual user details
- `invite_users`: Invite new users to the platform
- `delete_users`: Delete users and their data
- `delete_any_recipe`: Delete any recipe (not just own)
- `moderate_comments`: Moderate user comments
- `view_all_recipes`: View all recipes regardless of visibility
- `view_analytics`: View system analytics

## Setup Requirements

### 1. Auth0 Configuration

Create a Machine-to-Machine application in Auth0:

1. Go to Auth0 Dashboard → Applications
2. Create a "Machine to Machine Application"
3. Authorize for the Management API
4. Grant scopes: `read:users`, `create:users`, `delete:users`, `read:user_app_metadata`

### 2. Environment Variables

Add to your `.env` file:

```bash
# Auth0 M2M Configuration
AUTH0_M2M_CLIENT_ID=your_m2m_client_id
AUTH0_M2M_CLIENT_SECRET=your_m2m_client_secret
```

### 3. User Role Assignment

To grant admin privileges to a user, add a custom claim to their token:

```json
{
  "https://momsrecipebox.app/roles": ["admin"]
}
```

This can be done through Auth0 Actions or Rules.

## Testing

Use the included test script to verify functionality:

```bash
cd app
node test_admin_functions.js
```

## Security Considerations

1. **Token Validation**: All tokens are validated against Auth0's JWKS endpoint
2. **Role Verification**: Admin roles are verified through custom claims or M2M grants
3. **Audit Logging**: All admin actions are logged with user identification
4. **Self-Protection**: Users cannot delete their own accounts through the API
5. **Rate Limiting**: M2M tokens are cached for 24 hours to prevent rate limiting
6. **Data Cleanup**: User deletion removes all associated data from MongoDB

## Rate Limits

- Auth0 Management API calls are rate limited
- M2M tokens are cached for 24 hours to minimize API calls
- Consider implementing additional rate limiting for admin endpoints in production
