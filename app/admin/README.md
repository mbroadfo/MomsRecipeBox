# MomsRecipeBox Admin System

A secure, Auth0-powered admin system for user management with JWT authentication, granular permissions, and comprehensive testing.

## 📋 Overview

The admin system provides secure endpoints for managing users in the MomsRecipeBox application. It leverages Auth0's Management API for user operations and implements robust JWT validation with role-based permissions.

### Features

- **🔐 Auth0 Integration**: Machine-to-Machine (M2M) authentication with secure token management
- **👥 User Management**: List, invite, and delete users with detailed statistics  
- **🎫 JWT Validation**: Secure token validation with Auth0 signature verification
- **🛡️ Granular Permissions**: Role-based access control for admin operations
- **⚡ Token Caching**: Intelligent M2M token caching with automatic refresh
- **🧪 Comprehensive Testing**: Full test suite for all components
- **📮 Postman Integration**: Complete API testing collection with secure M2M authentication
- **🚀 Health Monitoring**: Built-in health check endpoint for API status verification
- **🏗️ Infrastructure Monitoring**: Comprehensive system status monitoring for 8 core services
- **🤖 AI Services Status**: Real-time monitoring and performance testing of AI providers
- **🔄 Enhanced Authentication Flow**: Improved admin access with race condition resolution and proper initialization timing
- **🎯 Role-Based Navigation**: Admin panel visibility properly controlled based on user roles

## 🏗️ Architecture

```text
admin/
├── README.md                    # This documentation
├── auth0_utils.js              # Auth0 M2M token management & API calls
├── jwt_validator.js            # JWT token validation middleware
├── admin_permissions.js        # Role and permission definitions
├── list_users.js              # Core user listing logic
├── invite_user.js              # Core user invitation logic
├── delete_user.js              # Core user deletion logic
├── system_status.js            # Infrastructure monitoring logic
├── ai_services_status.js       # AI services monitoring logic
├── admin_routes.js            # Express router (for future use)
├── admin_handlers/            # Lambda-style endpoint wrappers
│   ├── list_users.js          
│   ├── invite_user.js         
│   ├── delete_user.js
│   ├── system_status.js       # Infrastructure status endpoint
│   └── ai_services_status.js  # AI services status endpoint
├── postman/                   # API testing with Postman
│   ├── MomsRecipeBox-Admin-API.postman_collection.json
│   ├── MomsRecipeBox-Admin-Local.postman_environment.json
│   └── README.md              # Postman setup guide with M2M auth
└── tests/                     # Comprehensive test suite
    ├── run-tests.js           # Test runner for all admin tests
    ├── connection-test.js     # Auth0 M2M connectivity tests
    ├── functions-test.js      # Admin functions and permissions tests
    └── jwt-integration-test.js # JWT validation and endpoint tests
```

## � API Endpoints

All admin endpoints require a valid Auth0 JWT token with appropriate permissions.

### List Users

```http
GET /admin/users?page=1&per_page=10&search=email@example.com
Authorization: Bearer <auth0_jwt_token>
```

**Response:**

```json
{
  "users": [
    {
      "user_id": "auth0|123...",
      "email": "user@example.com",
      "name": "User Name",
      "created_at": "2024-01-01T00:00:00.000Z",
      "logins_count": 5,
      "last_login": "2024-01-05T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 50,
    "total_pages": 5
  },
  "stats": {
    "total_users": 50,
    "active_users": 45,
    "new_users_this_month": 8
  }
}
```

### Invite User

```http
POST /admin/users/invite
Authorization: Bearer <auth0_jwt_token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user"
}
```

**Response:**

```json
{
  "message": "User invitation sent successfully",
  "user": {
    "user_id": "auth0|new123...",
    "email": "newuser@example.com",
    "name": "New User",
    "created_at": "2024-01-06T12:00:00.000Z"
  }
}
```

### Delete User

```http
DELETE /admin/users/{user_id}
Authorization: Bearer <auth0_jwt_token>
```

**Response:**

```json
{
  "message": "User deleted successfully",
  "user_id": "auth0|123..."
}
```

### Health Check

```http
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-09-04T...",
  "version": "1.0.0",
  "environment": "development"
}
```

### System Status Monitoring

```http
GET /admin/system-status?service=mongodb
Authorization: Bearer <auth0_jwt_token>
```

**Response (All Services):**

```json
{
  "success": true,
  "timestamp": "2025-09-13T...",
  "overall_status": "operational",
  "services": {
    "mongodb": {
      "status": "operational",
      "message": "Database connection healthy",
      "stats": {
        "totalRecipes": 1247,
        "connectionTime": 15
      }
    },
    "s3": {
      "status": "operational", 
      "message": "Storage service healthy",
      "stats": {
        "storageUsed": "2.4 GB",
        "objectCount": 892
      }
    }
  }
}
```

**Response (Individual Service):**

```json
{
  "success": true,
  "timestamp": "2025-09-13T...",
  "service": "mongodb",
  "result": {
    "status": "operational",
    "message": "Database connection healthy",
    "stats": {
      "totalRecipes": 1247,
      "connectionTime": 15
    }
  }
}
```

### AI Services Status

```http
GET /admin/ai-services-status?test=detailed&includeUnavailable=true
Authorization: Bearer <auth0_jwt_token>
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2025-09-13T...",
  "summary": {
    "total_providers": 5,
    "available_providers": 4,
    "average_response_time": 1524.2
  },
  "providers": {
    "google": {
      "available": true,
      "status": "success",
      "message": "AI functionality test passed",
      "response_time_ms": 348,
      "provider": "Google Gemini"
    },
    "openai": {
      "available": true,
      "status": "success", 
      "message": "AI functionality test passed",
      "response_time_ms": 1122,
      "provider": "OpenAI"
    }
  },
  "timing_stats": {
    "fastest": {
      "time_ms": 348,
      "provider": "Google Gemini"
    },
    "slowest": {
      "time_ms": 4284,
      "provider": "DeepSeek"
    },
    "average_ms": 1524.2
  }
}
```

## 🔑 Authentication & Authorization

### JWT Token Requirements

Admin endpoints require Auth0 JWT tokens with:

- **Issuer**: Your Auth0 domain (`https://your-domain.auth0.com/`)
- **Audience**: `https://momsrecipebox/api` (matches your Auth0 API configuration)
- **Permissions**: `admin:read`, `admin:write` (as applicable)

### Permission System

| Role  | Permissions |
|-------|-------------|
| admin | `users:read`, `users:write`, `users:delete`, `admin:read`, `admin:write`, `system:monitor`, `ai:monitor` |
| user  | `users:read` |

### Required Auth0 M2M Scopes

Your Auth0 M2M application needs these Management API scopes:

- `read:users` - List and retrieve user information
- `create:users` - Create and invite new users  
- `delete:users` - Delete user accounts
- `read:user_app_metadata` - Access user metadata

## ⚙️ Configuration

### Environment Variables

Required in your `.env` file:

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your_spa_client_id
AUTH0_CLIENT_SECRET=your_spa_client_secret  
AUTH0_AUDIENCE=https://momsrecipebox/api

# Auth0 M2M Application (for admin functions)
AUTH0_M2M_CLIENT_ID=your_m2m_client_id
AUTH0_M2M_CLIENT_SECRET=your_m2m_client_secret

# Database
MONGODB_URI=mongodb://admin:password123@localhost:27017/moms_recipe_box_dev?authSource=admin
```

### Auth0 Setup

1. **Create M2M Application**:
   - Go to Auth0 Dashboard → Applications
   - Create new "Machine to Machine" application
   - Authorize for Management API
   - Grant required scopes: `read:users`, `create:users`, `delete:users`

2. **Configure SPA Application**:
   - Ensure your SPA app can issue tokens with admin permissions
   - Add custom claims for admin roles if needed

## 🧪 Testing

### Run All Tests

```bash
# From the admin directory
cd app/admin/tests
node run-tests.js
```

### Individual Tests

```bash
# Test Auth0 M2M connectivity
node connection-test.js

# Test admin functions and permissions  
node functions-test.js

# Test JWT validation and endpoint integration
node jwt-integration-test.js
```

### Test Coverage

- **Connection Test**: Auth0 M2M token acquisition, token caching, Management API access
- **Functions Test**: Environment config, permissions system, admin handlers, file structure
- **JWT Integration Test**: JWT validation, token structure, endpoint authentication

## 🔧 Integration

### With Lambda.js (Current)

Admin endpoints are integrated in `lambda.js`:

```javascript
import { listUsersHandler } from './admin/admin_handlers/list_users.js';
import { inviteUserHandler } from './admin/admin_handlers/invite_user.js';
import { deleteUserHandler } from './admin/admin_handlers/delete_user.js';

// In your routing logic
if (event.path === '/admin/users' && event.httpMethod === 'GET') {
  return await listUsersHandler(event);
}
```

### With Express (Future)

For Express integration, use the provided router:

```javascript
import express from 'express';
import adminRoutes from './admin/admin_routes.js';

const app = express();
app.use('/admin', adminRoutes);
```

## � Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Verify JWT token is valid and not expired
   - Check token includes required audience and permissions
   - Ensure Auth0 domain configuration is correct

2. **403 Forbidden**  
   - User lacks required permissions for the endpoint
   - Check role assignments and permission mappings
   - Verify M2M app has required Management API scopes

3. **M2M Token Issues**
   - Check M2M client credentials in `.env`
   - Verify M2M app is authorized for Management API
   - Ensure required scopes are granted

4. **Database Connection Errors**
   - Verify MongoDB URI in environment variables
   - Check database server is running and accessible
   - Ensure database credentials are correct

### Debug Commands

```bash
# Test Auth0 M2M connection
node admin/tests/connection-test.js

# Check environment configuration
node admin/tests/functions-test.js  

# Generate test JWT token structure
node admin/tests/jwt-integration-test.js
```

### Logs and Monitoring

Check application logs for:

- JWT validation errors
- Auth0 API call failures  
- Database connection issues
- Permission denial messages

## 📚 Development Notes

### Token Caching

The system implements intelligent M2M token caching:

- Tokens cached for 24 hours
- Automatic refresh before expiration
- Memory-based caching (suitable for single-instance deployment)

### Error Handling

All endpoints implement comprehensive error handling:

- Input validation with detailed error messages
- Auth0 API error forwarding
- Database error handling
- Structured error responses

### Security Considerations

- All admin endpoints require valid JWT authentication
- Permissions checked on every request
- Input sanitization and validation
- Audit logging for user management operations

## 🔄 Future Enhancements

- **Admin UI**: Web interface for user management
- **Audit Logging**: Detailed operation logging and history
- **Bulk Operations**: Batch user import/export
- **Advanced Permissions**: Fine-grained permission system
- **Redis Caching**: Distributed token caching for scaling
- **Rate Limiting**: API rate limiting for admin endpoints

---

For questions or issues, check the test results or review the troubleshooting section above.

### Response Formats

#### List Users (`GET /admin/users`)

```json
{
  "users": [
    {
      "user_id": "auth0|...",
      "email": "user@example.com",
      "created_at": "2025-01-01T00:00:00.000Z",
      "last_login": "2025-01-02T00:00:00.000Z",
      "logins_count": 5,
      "email_verified": true
    }
  ],
  "stats": {
    "total": 42,
    "active": 35,
    "recent": 7
  }
}
```

#### Invite User (`POST /admin/users/invite`)

```json
{
  "email": "newuser@example.com",
  "send_email": true,
  "app_metadata": {
    "role": "user"
  }
}
```

#### Delete User (`DELETE /admin/users/{id}`)

```json
{
  "message": "User deleted successfully",
  "user_id": "auth0|..."
}
```

## 🚀 Getting Started

### Prerequisites

1. **Auth0 Account**: Set up with Management API access
2. **Environment Variables**: Configured in `.env`
3. **Dependencies**: Run `npm install` in the app directory

### Environment Configuration

Ensure these variables are set in your `.env` file:

```env
# Auth0 Configuration
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_M2M_CLIENT_ID=your_m2m_client_id
AUTH0_M2M_CLIENT_SECRET=your_m2m_client_secret
```

### Running Tests

```bash
# Run all admin tests
cd app/admin/tests
node run-tests.js

# Run individual tests
node connection-test.js      # Test Auth0 connectivity
node functions-test.js       # Test function structure
node jwt-integration-test.js # Test JWT validation
```

## 🧪 Testing with HTTP Clients

### Using curl

```bash
# Get a valid Auth0 JWT first, then:

# List users
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/admin/users

# Invite user
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"email":"newuser@example.com","send_email":true}' \
     http://localhost:3000/admin/users/invite

# Delete user
curl -X DELETE \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/admin/users/auth0%7C123456789
```

### Using Postman

For easier testing, use the provided Postman collection with automated M2M authentication:

📁 **See `./postman/` folder for:**

- `MomsRecipeBox-Admin-API.postman_collection.json` - Complete API collection
- `MomsRecipeBox-Admin-Local.postman_environment.json` - Local environment config  
- `README.md` - Detailed setup instructions with secure M2M workflow

The Postman collection includes automatic token management, so you just need to:

1. Import the collection and environment
2. Set your Auth0 M2M credentials
3. Run "Get M2M Token" to authenticate
4. Test all admin endpoints automatically

## 🔧 Development

### Adding New Admin Functions

1. Create the core logic file (e.g., `new_function.js`)
2. Create the Lambda wrapper in `admin_handlers/`
3. Add the route to `app/lambda.js`
4. Update permissions in `admin_permissions.js`
5. Add tests for the new functionality

### Permission Mapping

Permissions are mapped in `admin_permissions.js`:

```javascript
export const ADMIN_PERMISSIONS = {
  LIST_USERS: 'admin:read',
  INVITE_USER: 'admin:write', 
  DELETE_USER: 'admin:write'
};
```

### M2M Token Caching

The M2M token system includes automatic caching:

- **Cache Duration**: 24 hours
- **Auto-Refresh**: Fetches new token when expired
- **Error Handling**: Graceful fallback on token failures

## 🚨 Troubleshooting

### Common Authentication Issues

#### "M2M token failed"

- Check Auth0 M2M credentials in `.env`
- Verify M2M application has Management API scopes
- Confirm Auth0 domain is correct

#### "JWT validation failed"

- Ensure JWT is from correct Auth0 tenant
- Verify JWT includes required permissions
- Check token expiration

#### "Management API access denied"

- Confirm M2M application has user management scopes
- Check Auth0 API permissions
- Verify tenant configuration

### Debug Mode

Set `NODE_ENV=development` for detailed logging:

```bash
NODE_ENV=development node connection-test.js
```

## 📊 Monitoring & Logs

The system includes comprehensive logging:

- **Token Operations**: M2M token fetch/cache events
- **API Calls**: Management API requests and responses  
- **Authentication**: JWT validation attempts
- **Errors**: Detailed error messages with context

## 🔒 Security Considerations

1. **Container-Native Secrets**: Auth0 credentials retrieved from AWS Secrets Manager at runtime - no secrets in files
2. **JWT Validation**: Always validate tokens server-side with Auth0 signature verification
3. **Permissions**: Use principle of least privilege for role-based access control
4. **Token Storage**: M2M tokens are memory-cached only with automatic expiration handling
5. **Error Messages**: Avoid exposing sensitive information in API responses
6. **AWS Integration**: Secure credential management through AWS Secrets Manager with proper IAM permissions

## 📝 Contributing

When contributing to the admin system:

1. **Test First**: Run the test suite before and after changes
2. **Documentation**: Update this README for new features
3. **Security**: Follow security best practices
4. **Permissions**: Consider permission implications
5. **Backwards Compatibility**: Maintain API compatibility

## 📚 Additional Resources

- [Auth0 Management API Documentation](https://auth0.com/docs/api/management/v2)
- [Auth0 Machine-to-Machine Guide](https://auth0.com/docs/applications/machine-to-machine)
- [JWT.io Token Debugger](https://jwt.io/)
- [MomsRecipeBox API Documentation](../docs/)

---

**Last Updated**: September 13, 2025  
**System Version**: 1.1.0  
**Auth0 Integration**: ✅ Complete  
**Infrastructure Monitoring**: ✅ Complete  
**AI Services Monitoring**: ✅ Complete
