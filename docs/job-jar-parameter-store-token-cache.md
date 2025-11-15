# Job Jar: Parameter Store Token Caching for Mom's Recipe Box

## Overview

Implement AWS Systems Manager Parameter Store for shared Auth0 bearer token caching across all Lambda invocations. This eliminates the limitation of module-level caching (container-specific) and ensures tokens are reused across cold starts, reducing Auth0 API calls and improving performance.

## Current State

**Module-level caching (current implementation):**

- Token cached in Lambda container memory (in `app/admin/auth0_utils.js`)
- Cache lifetime: 15-45 minutes (Lambda container lifetime)
- Not shared across containers (each concurrent invocation gets own cache)
- Lost on cold starts
- Works for tests and low-traffic apps
- Zero cost

**Problem:**

- High concurrency = many containers = many Auth0 token requests
- Cold starts = cache miss = redundant token fetches
- Auth0 rate limit: 1,000 M2M tokens/month (free tier)
- Admin panel requires M2M tokens for Auth0 Management API

## Proposed Solution

**AWS Systems Manager Parameter Store:**

- Shared cache across ALL Lambda containers
- Survives cold starts
- Free (standard tier: 10,000 parameters, 40 TPS throughput)
- ~50-100ms latency (acceptable for token retrieval)
- Built-in versioning and IAM integration
- No infrastructure to manage (no buckets, tables, clusters)

## Implementation Plan

### 1. Create Parameter Store Resource (Terraform)

**File:** `infra/app_api.tf`

Add SSM parameter resource:

```hcl
# Auth0 Management API token cache in Parameter Store
resource "aws_ssm_parameter" "auth0_token_cache" {
  name        = "/mrb/dev/auth0-token-cache"
  description = "Cached Auth0 M2M bearer token with expiration metadata"
  type        = "String"
  value       = "not-initialized" # Initial placeholder value
  tier        = "Standard"

  tags = {
    Project     = "MomsRecipeBox"
    Environment = "dev"
    ManagedBy   = "Terraform"
    Purpose     = "Auth0 Management API token cache"
  }

  lifecycle {
    ignore_changes = [value, description] # Managed by Lambda at runtime
  }
}
```

**Why ignore_changes?**

- Lambda will update token value and description (expiration timestamp)
- Terraform should not overwrite runtime-managed data
- Only infrastructure (name, type, tier) is Terraform-managed

### 2. Update Lambda IAM Policy (Terraform)

**File:** `infra/app_api.tf`

Add inline policy for Parameter Store access:

```hcl
# Parameter Store access for Auth0 token cache
resource "aws_iam_role_policy" "lambda_parameter_store_token_cache" {
  name = "mrb-lambda-parameter-store-token-cache"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ParameterStoreTokenCacheAccess"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:PutParameter"
        ]
        Resource = aws_ssm_parameter.auth0_token_cache.arn
      }
    ]
  })
}
```

**Permissions needed:**

- `ssm:GetParameter` - Read cached token
- `ssm:PutParameter` - Write new token and update expiration

### 3. Update terraform-mrb IAM Policy

**File:** `docs/iam-policy-terraform-mrb-updated.json`

Add SSM permissions for Terraform user:

```json
{
  "Statement": [
    {
      "Sid": "ParameterStoreManagement",
      "Effect": "Allow",
      "Action": [
        "ssm:AddTagsToResource",
        "ssm:DeleteParameter",
        "ssm:DescribeParameters",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:ListTagsForResource",
        "ssm:PutParameter",
        "ssm:RemoveTagsFromResource"
      ],
      "Resource": "arn:aws:ssm:us-west-2:*:parameter/mrb/*"
    }
  ]
}
```

**Manual step required:**

```powershell
# Update AWS IAM policy
aws iam put-user-policy `
  --user-name terraform-mrb `
  --policy-name terraform-mrb-core `
  --policy-document (Get-Content docs/iam-policy-terraform-mrb-updated.json -Raw) `
  --profile terraform-mrb
```

### 4. Install AWS SDK SSM Client (Backend)

**File:** `app/package.json`

Add dependency:

```json
{
  "dependencies": {
    "@aws-sdk/client-secrets-manager": "^3.709.0",
    "@aws-sdk/client-ssm": "^3.709.0",
    "mongodb": "^6.10.0"
  }
}
```

Install:

```powershell
cd app
npm install @aws-sdk/client-ssm
```

### 5. Implement Token Cache Service (Backend)

**File:** `app/admin/auth0_utils.js`

Replace current implementation with Parameter Store caching:

```javascript
import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth0_utils');

// Module-level cache as first-tier (in-memory, fastest)
let memoryCache = null;

// Parameter Store as second-tier (shared, persistent)
const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || 'us-west-2'
});
const PARAMETER_NAME = process.env.AUTH0_TOKEN_PARAMETER_NAME || '/mrb/dev/auth0-token-cache';

/**
 * Get cached token from Parameter Store
 * Returns null if not found or expired
 * @returns {Promise<Object|null>} Cached token object or null
 */
async function getTokenFromParameterStore() {
  try {
    const command = new GetParameterCommand({
      Name: PARAMETER_NAME
    });
    const response = await ssmClient.send(command);
    
    if (!response.Parameter?.Value || !response.Parameter?.Description) {
      return null;
    }
    
    // Parse expiration from description (format: "expires:1234567890")
    const match = response.Parameter.Description.match(/expires:(\d+)/);
    if (!match) return null;
    
    const expiresAt = parseInt(match[1], 10);
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000; // 5-minute buffer
    
    // Check if token is still valid
    if (expiresAt <= now + bufferMs) {
      logger.debug('Token expired or too close to expiration', { expiresAt, now });
      return null; // Expired or too close to expiration
    }
    
    logger.info('Token retrieved from Parameter Store cache');
    return {
      token: response.Parameter.Value,
      expiresAt
    };
  } catch (error) {
    // Parameter not found or access denied - return null
    logger.warn('Failed to get token from Parameter Store', error);
    return null;
  }
}

/**
 * Save token to Parameter Store with expiration metadata
 * @param {string} token - The Auth0 access token
 * @param {number} expiresAt - Unix timestamp when token expires
 * @returns {Promise<void>}
 */
async function saveTokenToParameterStore(token, expiresAt) {
  try {
    const command = new PutParameterCommand({
      Name: PARAMETER_NAME,
      Value: token,
      Type: 'String',
      Description: `expires:${expiresAt}`,
      Overwrite: true
    });
    await ssmClient.send(command);
    logger.info('Token saved to Parameter Store cache', { expiresAt });
  } catch (error) {
    // Log but don't fail - module-level cache still works
    logger.error('Failed to save token to Parameter Store', error);
  }
}

/**
 * Fetch new token from Auth0 Management API
 * @returns {Promise<Object>} Token object with token and expiresAt
 */
async function fetchNewToken() {
  logger.info('Fetching new Auth0 Management API token');
  
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_M2M_CLIENT_ID;
  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET;
  const audience = `https://${domain}/api/v2/`;
  
  if (!domain || !clientId || !clientSecret) {
    throw new Error('Missing required Auth0 M2M credentials in environment');
  }
  
  const tokenUrl = `https://${domain}/oauth/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: audience,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get Auth0 token: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const data = await response.json();
  const now = Date.now();
  const expiresAt = now + (data.expires_in * 1000);
  
  logger.info('Successfully fetched new Auth0 token', { 
    expiresIn: data.expires_in,
    expiresAt 
  });
  
  return {
    token: data.access_token,
    expiresAt
  };
}

/**
 * Get an Auth0 Management API access token using Client Credentials flow (M2M)
 * 
 * Uses two-tier caching:
 * 1. Memory cache (fastest, container-specific)
 * 2. Parameter Store (shared across all containers)
 * 
 * @returns {Promise<string>} Access token string
 * @throws {Error} if token retrieval fails
 */
export async function getAuth0ManagementToken() {
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // 5-minute buffer
  
  // Tier 1: Check memory cache (fastest)
  if (memoryCache && memoryCache.expiresAt > now + bufferMs) {
    logger.debug('Using memory-cached Auth0 token');
    return memoryCache.token;
  }
  
  // Tier 2: Check Parameter Store (shared across containers)
  const cachedToken = await getTokenFromParameterStore();
  if (cachedToken) {
    // Update memory cache for next invocation
    memoryCache = cachedToken;
    return cachedToken.token;
  }
  
  // Tier 3: Fetch new token from Auth0
  const newToken = await fetchNewToken();
  
  // Update both caches
  memoryCache = newToken;
  await saveTokenToParameterStore(newToken.token, newToken.expiresAt);
  
  return newToken.token;
}

/**
 * Clear both memory and Parameter Store caches (useful for testing)
 * @returns {Promise<void>}
 */
export async function clearAuth0TokenCache() {
  logger.info('Clearing Auth0 token cache');
  memoryCache = null;
  try {
    await saveTokenToParameterStore('', 0); // Clear Parameter Store
  } catch {
    // Ignore errors during cache clear
  }
}
```

**Key features:**

- **Two-tier caching:** Memory (fast) + Parameter Store (shared)
- **Graceful degradation:** If Parameter Store fails, still works with memory cache
- **5-minute expiration buffer:** Ensures tokens are refreshed before expiration
- **Single Auth0 call:** Token shared across all Lambda containers
- **Error handling:** Logs but doesn't fail on Parameter Store errors

### 6. Update Environment Variables (Terraform)

**File:** `infra/app_api.tf`

Add parameter name to Lambda environment:

```hcl
resource "aws_lambda_function" "mrb_app_api" {
  # ... existing config ...
  
  environment {
    variables = {
      MONGODB_DATABASE           = "momsrecipebox"
      AWS_SECRET_NAME            = var.aws_secret_name
      LAMBDA_APP_URL             = aws_apigatewayv2_api.mrb_api.api_endpoint
      NODE_ENV                   = "production"
      LOG_LEVEL                  = "INFO"
      AUTH0_TOKEN_PARAMETER_NAME = aws_ssm_parameter.auth0_token_cache.name  # NEW
    }
  }
}
```

Code already uses environment variable correctly:

```javascript
const PARAMETER_NAME = process.env.AUTH0_TOKEN_PARAMETER_NAME || '/mrb/dev/auth0-token-cache';
```

## Testing Plan

### Unit Tests

Test token caching logic:

```javascript
// app/tests/test_auth0_token_cache.js
import { getAuth0ManagementToken, clearAuth0TokenCache } from '../admin/auth0_utils.js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

describe('Auth0 Token Caching', () => {
  beforeEach(async () => {
    await clearAuth0TokenCache();
  });
  
  it('should fetch token on first call', async () => {
    const token = await getAuth0ManagementToken();
    assert.ok(token, 'Token should be truthy');
    assert.ok(token.startsWith('eyJ'), 'Token should be a JWT');
  });
  
  it('should reuse cached token on second call', async () => {
    const token1 = await getAuth0ManagementToken();
    const token2 = await getAuth0ManagementToken();
    assert.strictEqual(token1, token2, 'Tokens should be identical (cached)');
  });
  
  it('should clear cache when requested', async () => {
    await getAuth0ManagementToken();
    await clearAuth0TokenCache();
    // Next call should fetch new token
  });
});
```

### Integration Tests

Verify Parameter Store integration:

```powershell
# Deploy infrastructure
cd infra
terraform apply

# Run tests (should use Parameter Store)
cd ..
npm run test

# Check Parameter Store (should contain token)
aws ssm get-parameter --name /mrb/dev/auth0-token-cache --region us-west-2 --profile terraform-mrb

# Verify token expiration metadata
aws ssm get-parameter --name /mrb/dev/auth0-token-cache --query 'Parameter.Description' --output text --region us-west-2 --profile terraform-mrb

# Test admin endpoint with cached token
$token = aws ssm get-parameter --name /mrb/dev/auth0-token-cache --query 'Parameter.Value' --output text --region us-west-2 --profile terraform-mrb
# Note: This token is for Auth0 Management API, not MRB API
```

### Performance Tests

Measure latency impact:

```javascript
// app/tests/test_token_performance.js
const start = Date.now();
const token = await getAuth0ManagementToken();
const duration = Date.now() - start;
console.log(`Token retrieval: ${duration}ms`);

// Expected results:
// - Memory cache hit: 0-1ms
// - Parameter Store hit: 50-100ms
// - Auth0 fetch: 500-1000ms
```

## Deployment Steps

1. **Update IAM policy for terraform-mrb user** (manual step)

   ```powershell
   aws iam put-user-policy `
     --user-name terraform-mrb `
     --policy-name terraform-mrb-core `
     --policy-document (Get-Content docs/iam-policy-terraform-mrb-updated.json -Raw) `
     --profile terraform-mrb
   ```

1. **Install SSM client:** `cd app && npm install @aws-sdk/client-ssm`

1. **Update auth0_utils.js** with Parameter Store implementation

1. **Update Terraform:** Add SSM parameter resource and Lambda permissions to `infra/app_api.tf`

1. **Deploy infrastructure:**

   ```powershell
   cd infra
   terraform apply
   ```

1. **Run tests:** `npm run test` (admin tests should pass with no changes)

1. **Verify Parameter Store:** Check token is cached in AWS console

1. **Monitor logs:** Ensure no permission errors in CloudWatch logs for Lambda

## Rollback Plan

If Parameter Store implementation has issues:

1. Revert `app/admin/auth0_utils.js` to module-level caching only
2. Keep Terraform resources (no harm, just unused)
3. Module-level cache continues to work as fallback
4. Can remove SSM resources later via Terraform

## Cost Analysis

**Current (module-level cache):**

- Cost: $0
- Token requests: ~50-500/month (depends on admin panel usage and cold starts)

**With Parameter Store:**

- SSM Parameter: $0 (standard tier free)
- SSM API calls: $0 (40 TPS free tier, we use <<1 TPS)
- Token requests to Auth0: ~30/month (1 per day, shared across containers)
- Total cost: $0

**Savings:**

- Reduced Auth0 API calls: 20-470/month fewer requests
- Better rate limit headroom for production scaling
- Improved admin panel performance (reuse cached token)
- Faster cold starts when accessing admin features

## Security Considerations

**Token security:**

- Tokens stored as standard parameters (not SecureString)
- Tokens are JWTs (already encrypted/signed by Auth0)
- IAM policies restrict access to Lambda execution role only
- Tokens expire in 24 hours (short-lived)
- No sensitive data in token payload (M2M tokens contain only client_id, aud, iss)

**IAM permissions:**

- Lambda: Read/write access to specific parameter only
- Terraform: Full parameter management under `/vwc/*` namespace
- No public access (private parameters)

**Audit trail:**

- Parameter version history tracks token updates
- CloudWatch logs show token fetch/cache events
- CloudTrail logs Parameter Store API calls

## Benefits Summary

✅ **Shared cache** - All Lambda containers use same token
✅ **Survives cold starts** - Token persists across container lifecycle
✅ **100% free** - Standard tier Parameter Store
✅ **Reduced latency** - Fewer Auth0 API calls (500-1000ms → 50-100ms)
✅ **Rate limit protection** - 30x reduction in Auth0 token requests
✅ **Graceful degradation** - Falls back to memory cache if Parameter Store fails
✅ **Easy to implement** - ~200 lines of code, 20 lines of Terraform
✅ **Production-ready** - Scales to high concurrency with no changes

## Future Enhancements

- **CloudWatch metrics:** Track cache hit/miss rates
- **Automatic token refresh:** Background Lambda to proactively refresh before expiration
- **Multi-region:** Replicate parameter across regions (if needed)
- **Token rotation:** Support multiple M2M clients for zero-downtime rotation

## References

- [AWS Systems Manager Parameter Store Pricing](https://aws.amazon.com/systems-manager/pricing/)
- [Parameter Store Best Practices](https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-best-practices.html)
- [Auth0 Rate Limits](https://auth0.com/docs/troubleshoot/customer-support/operational-policies/rate-limit-policy)

## Status

- **Priority:** Medium (optimization, not critical)
- **Complexity:** Low-Medium (2-3 hours implementation + testing)
- **Risk:** Low (graceful degradation to current solution)
- **Dependencies:** None (can implement anytime)
- **Milestone:** Post-MVP (after core CRUD operations complete)
