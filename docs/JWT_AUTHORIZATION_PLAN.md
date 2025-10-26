# JWT Authorization Implementation Plan for Lambda Mode

**Status**: 🚧 In Progress  
**Created**: October 26, 2025  
**Strategy**: API Gateway JWT Authorizer with Auth0 Integration  

## 🎯 **Project Objectives**

Transform MomsRecipeBox Lambda mode to use proper JWT authorization for all API Gateway routes, ensuring secure authentication via Auth0 while maintaining the existing functionality and UI integration.

## 📊 **Current State Analysis**

### ✅ **What's Working**
- [x] Lambda function deployment and containerization
- [x] MongoDB Atlas connectivity with correct database name (`moms_recipe_box_dev`)
- [x] Docker container optimization (187MB → 636KB, 99.7% reduction)
- [x] API Gateway routing and CORS handling
- [x] Recipe creation via POST operations (proves infrastructure works)
- [x] Build verification and deployment automation

### ❌ **What's Broken**
- [ ] API Gateway requires authentication despite Terraform config showing `authorization = "NONE"`
- [ ] Test files use dummy JWT tokens with `dummy_signature` causing 403 errors
- [ ] Inconsistent authentication behavior (POST works, GET/PUT/DELETE fail)
- [ ] No proper Auth0 JWT validation infrastructure at API Gateway level

### 🔍 **Root Cause Analysis**
**Issue**: API Gateway is enforcing authentication even though Terraform configuration specifies `authorization = "NONE"` for all routes. This suggests either:
1. Terraform changes haven't been applied to API Gateway
2. There's a default API Gateway authorizer overriding our settings
3. Different routes have inconsistent authentication configurations

**Evidence**: Even health endpoint (`/health`) returns "Missing Authentication Token" despite being configured with no authorization.

## 🏗️ **Implementation Strategy: API Gateway JWT Authorizer**

We've chosen **API Gateway JWT Authorizer** over Lambda-based validation for:
- Better performance (validation happens before Lambda invocation)
- Enhanced security (AWS-managed validation)
- Reduced Lambda execution time and cost
- Centralized authentication logic

## 📋 **Implementation Phases**

### **Phase 1: Infrastructure & Terraform Configuration** 🏗️

#### **Task 1.1: API Gateway JWT Authorizer Setup**
- **Status**: ⏳ Pending
- **Goal**: Configure proper Auth0 JWT validation at API Gateway level
- **Actions**:
  - [ ] Create JWT authorizer resource in `infra/app_api.tf`
  - [ ] Configure Auth0 JWKS URI: `https://{AUTH0_DOMAIN}/.well-known/jwks.json`
  - [ ] Set Auth0 issuer: `https://{AUTH0_DOMAIN}/`
  - [ ] Configure Auth0 audience: `https://momsrecipebox.com/api`
  - [ ] Update all route definitions from `authorization = "NONE"` to use JWT authorizer
  - [ ] Apply Terraform changes with `terraform-mrb` profile

#### **Task 1.2: IAM Permission Updates**
- **Status**: ⏳ Pending
- **Required Permissions for `mrb-api` user**:
  - [ ] `apigateway:GET` - Read API Gateway configurations
  - [ ] `apigateway:POST` - Update API Gateway settings
  - [ ] `apigateway:PUT` - Modify authorizers
- **Required Permissions for `terraform-mrb` user**:
  - [ ] `apigateway:*` - Full API Gateway management for Terraform
  - [ ] `iam:CreateRole` - Create authorizer execution roles
  - [ ] `iam:AttachRolePolicy` - Attach necessary policies

#### **Task 1.3: Terraform Configuration Files**
- **Status**: ⏳ Pending
- **Files to Modify**:
  - [ ] `infra/app_api.tf` - Add JWT authorizer resource
  - [ ] `infra/app_api.tf` - Update all route authorization settings
  - [ ] `infra/variables.tf` - Add Auth0 configuration variables
  - [ ] `infra/outputs.tf` - Output authorizer details for debugging

### **Phase 2: Auth0 Integration** 🔐

#### **Task 2.1: Auth0 JWT Configuration**
- **Status**: ⏳ Pending
- **Goal**: Configure Auth0 settings for API Gateway integration
- **Actions**:
  - [ ] Verify Auth0 API identifier: `https://momsrecipebox.com/api`
  - [ ] Confirm Auth0 domain configuration
  - [ ] Test JWKS endpoint accessibility
  - [ ] Validate Auth0 token format and claims

#### **Task 2.2: Environment Variable Updates**
- **Status**: ⏳ Pending
- **Files to Update**:
  - [ ] `config/deployment-profiles.json` - Add JWT configuration
  - [ ] AWS Secrets Manager - Verify Auth0 secrets
  - [ ] Lambda environment variables - Add Auth0 JWT settings

#### **Task 2.3: JWT Token Structure Validation**
- **Status**: ⏳ Pending
- **Required JWT Claims**:
  - [ ] `iss` (issuer): `https://{AUTH0_DOMAIN}/`
  - [ ] `aud` (audience): `https://momsrecipebox.com/api`
  - [ ] `sub` (subject): User identifier
  - [ ] `exp` (expiration): Token expiry
  - [ ] `iat` (issued at): Token creation time

### **Phase 3: Test Infrastructure Update** 🧪

#### **Task 3.1: Replace Dummy JWT Tokens**
- **Status**: ⏳ Pending
- **Files to Update**:
  - [ ] `app/tests/test_recipes.js` - Replace dummy token
  - [ ] `app/tests/test_comments.js` - Replace dummy token
  - [ ] `app/tests/test_analytics.js` - Update auth strategy

#### **Task 3.2: Real Auth0 Token Generation**
- **Status**: ⏳ Pending
- **Strategy**: Use Auth0 Machine-to-Machine client for test authentication
- **Actions**:
  - [ ] Create Auth0 M2M client for testing
  - [ ] Generate test JWT tokens with proper claims
  - [ ] Create token refresh mechanism for long-running tests
  - [ ] Add token validation to test suite

#### **Task 3.3: Test Suite Enhancement**
- **Status**: ⏳ Pending
- **Actions**:
  - [ ] Add JWT token validation tests
  - [ ] Test authentication failure scenarios
  - [ ] Verify all HTTP methods work with proper tokens
  - [ ] Add performance tests for JWT validation

### **Phase 4: Documentation & Cleanup** 📚

#### **Task 4.1: Update Documentation**
- **Status**: ⏳ Pending
- **Files to Update**:
  - [ ] `README.md` - Add JWT authentication section
  - [ ] `app/README.md` - Update API documentation
  - [ ] `docs/` - Create Auth0 integration guide

#### **Task 4.2: Remove Legacy Authentication Code**
- **Status**: ⏳ Pending
- **Actions**:
  - [ ] Clean up dummy JWT implementations
  - [ ] Remove unused authentication middleware
  - [ ] Update error handling for JWT failures

## 🔧 **Technical Implementation Details**

### **JWT Authorizer Configuration** (Terraform)
```hcl
resource "aws_api_gateway_authorizer" "auth0_jwt" {
  name                   = "auth0-jwt-authorizer"
  rest_api_id           = aws_api_gateway_rest_api.app_api.id
  authorizer_uri        = "arn:aws:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.jwt_authorizer.arn}/invocations"
  authorizer_credentials = aws_iam_role.authorizer_invocation_role.arn
  type                  = "TOKEN"
  identity_source       = "method.request.header.Authorization"
}
```

### **Auth0 Configuration Requirements**
- **Domain**: `momsrecipebox.us.auth0.com`
- **API Identifier**: `https://momsrecipebox.com/api`
- **JWKS URI**: `https://momsrecipebox.us.auth0.com/.well-known/jwks.json`
- **Token Type**: Bearer JWT
- **Validation**: RS256 signature algorithm

### **Expected JWT Token Format**
```json
{
  "iss": "https://momsrecipebox.us.auth0.com/",
  "sub": "auth0|user_id",
  "aud": "https://momsrecipebox.com/api",
  "iat": 1234567890,
  "exp": 1234567890,
  "azp": "client_id",
  "scope": "openid profile email",
  "permissions": ["read:recipes", "write:recipes"]
}
```

## 🚨 **Cleanup of Recent Changes**

### **Changes to Keep** ✅
- **Authentication header additions in test files** - Correct approach, just need real tokens
- **Comment test variable fix** (`firstComment` → `testComment`) - Legitimate bug fix
- **Docker configuration optimizations** - Valuable performance improvements
- **Database name fixes** - Necessary corrections for Atlas connectivity

### **Changes to Modify** 🔄
- **Replace dummy JWT tokens** - Need real Auth0 tokens for testing
- **Update API Gateway authorization settings** - Change from "NONE" to JWT authorizer

## 📈 **Success Criteria**

### **Phase 1 Complete When:**
- [ ] All API Gateway routes use JWT authorizer
- [ ] Terraform successfully applies without errors
- [ ] API Gateway returns proper JWT validation errors (not "Missing Authentication Token")

### **Phase 2 Complete When:**
- [ ] Valid Auth0 JWT tokens authenticate successfully
- [ ] Invalid/expired tokens receive proper 401/403 responses
- [ ] All HTTP methods (GET, POST, PUT, DELETE) work with authentication

### **Phase 3 Complete When:**
- [ ] Test suite runs successfully with real JWT tokens
- [ ] All CRUD operations pass authentication
- [ ] Recipe creation, reading, updating, and deletion work in Lambda mode

### **Overall Success When:**
- [ ] UI can connect to Lambda API Gateway with JWT authentication
- [ ] All existing functionality works with proper authentication
- [ ] No dummy tokens or authentication bypasses remain
- [ ] Performance is maintained or improved

## 🔄 **Progress Tracking**

**Last Updated**: October 26, 2025  
**Current Phase**: Phase 1 (Infrastructure Setup)  
**Next Milestone**: Complete API Gateway JWT Authorizer Configuration  
**Blockers**: None identified  
**Dependencies**: Access to modify IAM permissions for both `mrb-api` and `terraform-mrb` users  

---

**Note**: This plan will be updated as implementation progresses. Each completed task should be marked with ✅ and include completion date and any relevant notes.