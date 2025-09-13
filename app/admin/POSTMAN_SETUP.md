# Postman API Documentation Setup

## MomsRecipeBox Admin API Collection

This collection provides comprehensive testing capabilities for all MomsRecipeBox API endpoints, including the new infrastructure monitoring and individual service testing features.

### Environment Setup

1. Import `MomsRecipeBox-Admin-Local.postman_environment.json` for local development
2. Update the `auth_token` variable with a valid JWT token

### Getting Authentication Token

```powershell
# Get a test token for local development
.\app\admin\get-postman-token.ps1
```

## API Endpoint Coverage

### Infrastructure Monitoring (NEW)

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/admin/system-status` | GET | All infrastructure services | ✅ Implemented |
| `/admin/system-status?service=mongodb` | GET | MongoDB only | ✅ NEW |
| `/admin/system-status?service=s3` | GET | S3 storage only | ✅ NEW |
| `/admin/system-status?service=api_gateway` | GET | API Gateway only | ✅ NEW |
| `/admin/system-status?service=lambda` | GET | Lambda functions only | ✅ NEW |
| `/admin/system-status?service=backup` | GET | Backup system only | ✅ NEW |
| `/admin/system-status?service=terraform` | GET | Infrastructure only | ✅ NEW |
| `/admin/system-status?service=security` | GET | Security/SSL only | ✅ NEW |
| `/admin/system-status?service=performance` | GET | Performance/CDN only | ✅ NEW |

### AI Services Monitoring

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/admin/ai-services-status` | GET | Configuration check | ✅ Implemented |
| `/admin/ai-services-status?test=basic` | GET | Live connectivity test | ✅ Implemented |
| `/admin/ai-services-status?provider=openai` | GET | Test specific provider | ✅ Implemented |
| `/admin/ai-services-status?includeUnavailable=true` | GET | Include unconfigured | ✅ Implemented |

### User Management

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/admin/users` | GET | List users with stats | ✅ Implemented |
| `/admin/users/invite` | POST | Invite new user | ✅ Implemented |
| `/admin/users/:id` | DELETE | Delete user | ✅ Implemented |

### Recipe Management

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/recipes` | GET | List recipes | ✅ Implemented |
| `/recipes/:id` | GET | Get recipe details | ✅ Implemented |
| `/recipes` | POST | Create recipe | ✅ Implemented |
| `/recipes/:id` | PUT | Update recipe | ✅ Implemented |
| `/recipes/:id` | DELETE | Delete recipe | ✅ Implemented |
| `/recipes/:id/like` | POST | Toggle favorite | ✅ Implemented |

### Recipe Images

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/recipes/:id/image` | GET | Get image | ✅ Implemented |
| `/recipes/:id/image` | PUT | Upload image | ✅ Implemented |
| `/recipes/:id/image` | DELETE | Delete image | ✅ Implemented |
| `/recipes/:id/copy-image` | POST | Copy image | ✅ Implemented |

### Comments

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/comments/:id` | GET | Get comment | ✅ Implemented |
| `/recipes/:id/comments` | POST | Add comment | ✅ Implemented |
| `/comments/:id` | PUT | Update comment | ✅ Implemented |
| `/comments/:id` | DELETE | Delete comment | ✅ Implemented |

### Shopping List

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/shopping-list` | GET | Get shopping list | ✅ Implemented |
| `/shopping-list/add` | POST | Add items | ✅ Implemented |
| `/shopping-list/item/:id` | PUT | Update item | ✅ Implemented |
| `/shopping-list/item/:id` | DELETE | Delete item | ✅ Implemented |
| `/shopping-list/clear` | POST | Clear list | ✅ Implemented |
| `/shopping-list/categorize` | POST | AI categorization | ✅ Implemented |

### AI Assistant

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/ai/chat` | POST | Interactive assistant | ✅ Implemented |
| `/ai/extract` | POST | Extract from text/image | ✅ Implemented |

### System Health

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/health` | GET | Basic health check | ✅ Implemented |

## Testing Infrastructure Services

### Individual Service Testing Examples

```bash
# Test MongoDB only
GET /admin/system-status?service=mongodb

# Test S3 storage only  
GET /admin/system-status?service=s3

# Test API Gateway only
GET /admin/system-status?service=api_gateway

# Test Lambda functions only
GET /admin/system-status?service=lambda
```

### Example Response Format

```json
{
  "success": true,
  "timestamp": "2025-09-12T17:53:25.644Z",
  "service": "mongodb",
  "result": {
    "status": "operational",
    "message": "MongoDB connected successfully",
    "stats": {
      "totalRecipes": 31,
      "connectionTime": 9
    }
  },
  "note": "Individual service test for mongodb"
}
```

### Error Handling

Invalid service names return 400 with available services:

```json
{
  "success": false,
  "error": "Invalid service name", 
  "availableServices": [
    "mongodb", "s3", "api_gateway", "lambda", 
    "backup", "terraform", "security", "performance"
  ]
}
```

## Real vs Simulated Metrics

| Service | Status | Data Quality |
|---------|--------|-------------|
| MongoDB | ✅ Real | Connection time, recipe count |
| S3 | ⚠️ Partial | Real connectivity, limited metrics |
| API Gateway | ⚠️ Partial | Real API count, simulated metrics |
| Lambda | ⚠️ Partial | Real function count, simulated executions |
| Backup | ❌ Simulated | All simulated timestamps |
| Terraform | ❌ Simulated | All simulated data |
| Security | ❌ Simulated | All simulated SSL/Auth0 status |
| Performance | ❌ Simulated | All simulated CDN metrics |

## Quick Test Commands

```powershell
# Test all infrastructure services
Invoke-WebRequest -Uri "http://localhost:3000/admin/system-status" -Headers @{"Authorization"="Bearer YOUR_TOKEN"}

# Test specific service
Invoke-WebRequest -Uri "http://localhost:3000/admin/system-status?service=mongodb" -Headers @{"Authorization"="Bearer YOUR_TOKEN"}

# Test AI services
Invoke-WebRequest -Uri "http://localhost:3000/admin/ai-services-status" -Headers @{"Authorization"="Bearer YOUR_TOKEN"}
```
