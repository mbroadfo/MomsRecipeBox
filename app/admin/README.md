# MomsRecipeBox Admin System

A secure, Auth0-powered admin system for user management with JWT authentication, granular permissions, and comprehensive testing.

## 📋 Overview

The admin system provides secure endpoints for managing users in the MomsRecipeBox application. It leverages Auth0's Management API for user operations and implements robust JWT validation with role-based permissions.

### Features

- **🔐 Auth0 Integration**: Machine-to-Machine (M2M) authentication with Management API access
- **👥 User Management**: List, invite, and delete users with detailed statistics
- **🎫 JWT Validation**: Secure token validation with Auth0 signature verification
- **🛡️ Granular Permissions**: Role-based access control for admin operations
- **⚡ Token Caching**: Intelligent M2M token caching with automatic refresh
- **🧪 Comprehensive Testing**: Full test suite for all components

## 🏗️ Architecture

```
admin/
├── README.md                    # This documentation
├── auth0_utils.js              # Auth0 M2M token management & API calls
├── jwt_validator.js            # JWT token validation middleware
├── admin_permissions.js        # Role and permission definitions
├── list_users.js              # Core user listing logic
├── invite_user.js              # Core user invitation logic
├── delete_user.js              # Core user deletion logic
├── admin_routes.js            # Express router (for future use)
├── admin_handlers/            # Lambda-style endpoint wrappers
│   ├── list_users.js          
│   ├── invite_user.js         
│   └── delete_user.js         
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

## 🔑 Authentication & Authorization

### JWT Token Requirements

Admin endpoints require Auth0 JWT tokens with:
- **Issuer**: Your Auth0 domain (`https://your-domain.auth0.com/`)
- **Audience**: `https://momsrecipebox-api`
- **Permissions**: `admin:read`, `admin:write` (as applicable)

### Permission System

| Role  | Permissions |
|-------|-------------|
| admin | `users:read`, `users:write`, `users:delete`, `admin:read`, `admin:write` |
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
AUTH0_AUDIENCE=https://momsrecipebox-api

# Auth0 M2M Application (for admin functions)
AUTH0_M2M_CLIENT_ID=your_m2m_client_id
AUTH0_M2M_CLIENT_SECRET=your_m2m_client_secret

# Database
MONGODB_URI=mongodb://admin:password123@localhost:27017/momsrecipebox?authSource=admin
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
1. **Set Authorization**: Bearer Token with your Auth0 JWT
2. **Set Headers**: `Content-Type: application/json`
3. **Set Base URL**: `http://localhost:3000`
4. **Test Endpoints**: Use the routes listed above

## 🔧 Development

### Adding New Admin Functions
1. Create the core logic file (e.g., `new_function.js`)
2. Create the Lambda wrapper in `admin_handlers/`
3. Add the route to `app/lambda.js`
4. Update permissions in `admin_permissions.js`
5. Add tests for the new functionality

### Permission System
Permissions are mapped in `admin_permissions.js`:

```javascript
export const ADMIN_PERMISSIONS = {
  LIST_USERS: 'admin:read',
  INVITE_USER: 'admin:write', 
  DELETE_USER: 'admin:write'
};
```

### Token Caching
The M2M token system includes automatic caching:

- **Cache Duration**: 24 hours
- **Auto-Refresh**: Fetches new token when expired
- **Error Handling**: Graceful fallback on token failures

## 🚨 Troubleshooting

### Common Issues

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

1. **Environment Variables**: Never commit `.env` files
2. **JWT Validation**: Always validate tokens server-side
3. **Permissions**: Use principle of least privilege
4. **Token Storage**: M2M tokens are memory-cached only
5. **Error Messages**: Avoid exposing sensitive information

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

**Last Updated**: September 3, 2025  
**System Version**: 1.0.0  
**Auth0 Integration**: ✅ Complete
