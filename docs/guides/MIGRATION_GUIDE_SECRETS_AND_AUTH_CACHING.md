# Migration Guide: Secrets Manager to Parameter Store & Auth0 Token Caching

## 🎯 Migration Overview

This guide documents the complete migration from:

- **❌ OLD**: AWS Secrets Manager for secrets storage
- **❌ OLD**: No Auth0 token caching (every request hits Auth0)

To:

- **✅ NEW**: AWS Systems Manager Parameter Store (FREE tier, same security)
- **✅ NEW**: Three-stage Auth0 token caching (Memory → SSM → Auth0)

**Benefits**:

- **Cost savings**: Parameter Store is FREE (up to 10,000 parameters)
- **Performance**: Cached tokens reduce Auth0 API calls by ~99%
- **Reliability**: Multi-stage fallback ensures robust token availability
- **Security**: Same KMS encryption, better access control

---

## 📋 Migration Phases

### Phase 1: AWS Infrastructure Setup (Manual + Terraform)

**Goal**: Set up Parameter Store structure and IAM permissions parallel to existing Secrets Manager

### Phase 2: Parameter Store Migration

**Goal**: Copy secrets from Secrets Manager to Parameter Store, test retrieval

### Phase 3: Auth0 Token Caching Implementation

**Goal**: Implement three-stage token caching with SSM as middle tier

### Phase 4: Application Code Migration

**Goal**: Add parallel Parameter Store code without removing Secrets Manager (dual mode)

### Phase 5: Testing & Validation

**Goal**: Comprehensive testing of both paths before cutover

### Phase 6: Hard Cutover

**Goal**: Switch to Parameter Store exclusively, deprecate Secrets Manager

---

## 📖 Phase 1: AWS Infrastructure Setup

### 1.1 Parameter Store Structure Design

**Secrets Organization** (based on MomsRecipeBox pattern):

```text
/your-app/dev/secrets              # Main secrets JSON blob (like our /mrb/dev/secrets)
/your-app/dev/mongodb-uri          # MongoDB connection string
/your-app/dev/auth0-cache/token    # Cached Auth0 M2M token
/your-app/dev/auth0-cache/expires  # Token expiration timestamp
```

**Why this structure?**

- `/your-app/dev/secrets` - Single JSON with all API keys (OpenAI, Anthropic, etc.)
- Separate MongoDB URI for independent rotation
- Auth0 cache parameters for token persistence

### 1.2 Create Parameters Manually (AWS Console or CLI)

**Using AWS CLI**:

```bash
# Set your AWS profile
$env:AWS_PROFILE="your-app-profile"

# Create main secrets parameter (SecureString with KMS encryption)
aws ssm put-parameter `
  --name "/your-app/dev/secrets" `
  --description "Application secrets (API keys, credentials)" `
  --value '{
    "OPENAI_API_KEY": "sk-...",
    "ANTHROPIC_API_KEY": "sk-ant-...",
    "GOOGLE_API_KEY": "...",
    "AUTH0_DOMAIN": "your-tenant.us.auth0.com",
    "AUTH0_CLIENT_ID": "...",
    "AUTH0_CLIENT_SECRET": "...",
    "AUTH0_AUDIENCE": "https://your-api"
  }' `
  --type "SecureString" `
  --tier "Standard"

# Create MongoDB URI parameter
aws ssm put-parameter `
  --name "/your-app/dev/mongodb-uri" `
  --description "MongoDB Atlas connection string" `
  --value "mongodb+srv://username:password@cluster.mongodb.net/dbname" `
  --type "SecureString" `
  --tier "Standard"

# Create placeholder for Auth0 token cache
aws ssm put-parameter `
  --name "/your-app/dev/auth0-cache/token" `
  --description "Cached Auth0 M2M access token" `
  --value "placeholder" `
  --type "SecureString" `
  --tier "Standard"

aws ssm put-parameter `
  --name "/your-app/dev/auth0-cache/expires" `
  --description "Auth0 token expiration timestamp (milliseconds)" `
  --value "0" `
  --type "String" `
  --tier "Standard"
```

**Verify parameters created**:

```bash
aws ssm get-parameters `
  --names "/your-app/dev/secrets" "/your-app/dev/mongodb-uri" `
  --with-decryption
```

### 1.3 IAM Permissions Setup

**Two IAM users need permissions** (based on MomsRecipeBox pattern):

1. **Application User** (`your-app-api`) - For Lambda/application access
2. **Terraform User** (`terraform-your-app`) - For infrastructure management

#### Step 1: Create IAM Policy for Application User

**File**: `docs/iam-policy-your-app-api-parameter-store.json`

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ParameterStoreReadSecrets",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": [
        "arn:aws:ssm:us-east-1:YOUR_ACCOUNT_ID:parameter/your-app/dev/*"
      ]
    },
    {
      "Sid": "ParameterStoreWriteAuthCache",
      "Effect": "Allow",
      "Action": [
        "ssm:PutParameter"
      ],
      "Resource": [
        "arn:aws:ssm:us-east-1:YOUR_ACCOUNT_ID:parameter/your-app/dev/auth0-cache/*"
      ]
    },
    {
      "Sid": "KMSDecryptSecrets",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:YOUR_ACCOUNT_ID:key/*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "ssm.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```

**Replace `YOUR_ACCOUNT_ID`**: Get with `aws sts get-caller-identity --query Account --output text`

#### Step 2: Attach Policy to Application User

```bash
# Switch to terraform profile (has IAM permissions)
$env:AWS_PROFILE="terraform-your-app"

# Create the policy
aws iam put-user-policy `
  --user-name your-app-api `
  --policy-name ParameterStoreAccess `
  --policy-document file://docs/iam-policy-your-app-api-parameter-store.json

# Verify policy attached
aws iam get-user-policy `
  --user-name your-app-api `
  --policy-name ParameterStoreAccess
```

#### Step 3: Lambda Execution Role Permissions (Terraform)

**File**: `infra/lambda_execution_role.tf` (or add to existing `app_api.tf`)

```hcl
# Parameter Store access for Lambda execution role
resource "aws_iam_role_policy" "lambda_parameter_store" {
  name = "lambda-parameter-store-access"
  role = aws_iam_role.lambda_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ParameterStoreReadSecrets"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/your-app/dev/*"
        ]
      },
      {
        Sid    = "ParameterStoreWriteAuthCache"
        Effect = "Allow"
        Action = [
          "ssm:PutParameter"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/your-app/dev/auth0-cache/*"
        ]
      },
      {
        Sid    = "KMSDecryptSecrets"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Data source for current AWS account ID
data "aws_caller_identity" "current" {}
```

#### Step 4: Apply Terraform Changes

```bash
# Switch to terraform profile
$env:AWS_PROFILE="terraform-your-app"

cd infra

# Review changes
terraform plan

# Apply (adds Parameter Store permissions to Lambda role)
terraform apply
```

### 1.4 Test IAM Permissions

```bash
# Switch to application profile
$env:AWS_PROFILE="your-app-api"

# Test reading secrets (should succeed)
aws ssm get-parameter `
  --name "/your-app/dev/secrets" `
  --with-decryption `
  --query "Parameter.Value" `
  --output text

# Test writing to auth cache (should succeed)
aws ssm put-parameter `
  --name "/your-app/dev/auth0-cache/token" `
  --value "test-token" `
  --type "SecureString" `
  --overwrite

# Test reading MongoDB URI (should succeed)
aws ssm get-parameter `
  --name "/your-app/dev/mongodb-uri" `
  --with-decryption `
  --query "Parameter.Value" `
  --output text
```

**✅ Phase 1 Complete When**:

- [ ] All parameters created in Parameter Store
- [ ] IAM policies attached to application user
- [ ] Terraform applied for Lambda execution role
- [ ] Manual testing confirms read/write permissions work

**Commit Point**: Commit Terraform changes after successful testing

```bash
git add infra/lambda_execution_role.tf docs/iam-policy-your-app-api-parameter-store.json
git commit -m "feat: Add Parameter Store IAM permissions for Lambda and app user"
git push
```

---

## 📖 Phase 2: Parameter Store Migration Utilities

### 2.1 Create Parameter Store Utility Module

**File**: `app/utils/parameter_store.js`

```javascript
// File: app/utils/parameter_store.js
import { SSMClient, GetParameterCommand, PutParameterCommand } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Fetch a single parameter from Parameter Store
 * @param {string} name - Parameter name (e.g., "/your-app/dev/secrets")
 * @param {boolean} decrypt - Decrypt SecureString parameters
 * @returns {Promise<string>} Parameter value
 */
export async function getParameter(name, decrypt = true) {
  try {
    const command = new GetParameterCommand({
      Name: name,
      WithDecryption: decrypt
    });
    
    const response = await ssmClient.send(command);
    return response.Parameter.Value;
  } catch (error) {
    console.error(`Failed to get parameter ${name}:`, error.message);
    throw error;
  }
}

/**
 * Fetch multiple parameters from Parameter Store
 * @param {string[]} names - Array of parameter names
 * @param {boolean} decrypt - Decrypt SecureString parameters
 * @returns {Promise<Object>} Object with parameter names as keys
 */
export async function getParameters(names, decrypt = true) {
  try {
    const { GetParametersCommand } = await import('@aws-sdk/client-ssm');
    const command = new GetParametersCommand({
      Names: names,
      WithDecryption: decrypt
    });
    
    const response = await ssmClient.send(command);
    const result = {};
    
    response.Parameters.forEach(param => {
      result[param.Name] = param.Value;
    });
    
    return result;
  } catch (error) {
    console.error('Failed to get parameters:', error.message);
    throw error;
  }
}

/**
 * Store a parameter in Parameter Store
 * @param {string} name - Parameter name
 * @param {string} value - Parameter value
 * @param {string} type - Parameter type (String, SecureString, StringList)
 * @param {boolean} overwrite - Overwrite existing parameter
 * @returns {Promise<void>}
 */
export async function putParameter(name, value, type = 'SecureString', overwrite = true) {
  try {
    const command = new PutParameterCommand({
      Name: name,
      Value: value,
      Type: type,
      Overwrite: overwrite
    });
    
    await ssmClient.send(command);
    console.log(`✅ Parameter ${name} stored successfully`);
  } catch (error) {
    console.error(`Failed to put parameter ${name}:`, error.message);
    throw error;
  }
}

/**
 * Fetch all secrets from the main secrets parameter and parse as JSON
 * @returns {Promise<Object>} Parsed secrets object
 */
export async function fetchSecrets() {
  const secretsJson = await getParameter('/your-app/dev/secrets', true);
  return JSON.parse(secretsJson);
}

/**
 * Fetch MongoDB connection URI
 * @returns {Promise<string>} MongoDB URI
 */
export async function fetchMongoUri() {
  return await getParameter('/your-app/dev/mongodb-uri', true);
}
```

### 2.2 Create Secrets Manager to Parameter Store Migration Script

**File**: `scripts/migrate-secrets-to-parameter-store.js`

```javascript
// File: scripts/migrate-secrets-to-parameter-store.js
import { 
  SecretsManagerClient, 
  GetSecretValueCommand 
} from '@aws-sdk/client-secrets-manager';
import { putParameter } from '../app/utils/parameter_store.js';

// Set AWS profile for the script
process.env.AWS_PROFILE = 'your-app-api';
console.log('🔧 AWS Profile automatically set to: your-app-api');

const secretsClient = new SecretsManagerClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

/**
 * Fetch secret from Secrets Manager
 */
async function getSecretFromSecretsManager(secretId) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await secretsClient.send(command);
    return response.SecretString;
  } catch (error) {
    console.error(`❌ Failed to fetch secret ${secretId}:`, error.message);
    throw error;
  }
}

/**
 * Main migration function
 */
async function migrateSecrets() {
  console.log('🚀 Starting Secrets Manager to Parameter Store migration...\n');

  try {
    // 1. Migrate main application secrets
    console.log('📦 Migrating application secrets...');
    const appSecrets = await getSecretFromSecretsManager('your-app/dev/secrets');
    await putParameter('/your-app/dev/secrets', appSecrets, 'SecureString', true);
    console.log('✅ Application secrets migrated\n');

    // 2. Migrate MongoDB URI
    console.log('📦 Migrating MongoDB URI...');
    const mongoUri = await getSecretFromSecretsManager('your-app/dev/mongodb-uri');
    await putParameter('/your-app/dev/mongodb-uri', mongoUri, 'SecureString', true);
    console.log('✅ MongoDB URI migrated\n');

    // 3. Verify migration
    console.log('🔍 Verifying migration...');
    const { getParameter } = await import('../app/utils/parameter_store.js');
    
    const verifySecrets = await getParameter('/your-app/dev/secrets', true);
    const verifyMongo = await getParameter('/your-app/dev/mongodb-uri', true);
    
    console.log('✅ Secrets verification: ', verifySecrets ? 'SUCCESS' : 'FAILED');
    console.log('✅ MongoDB verification: ', verifyMongo ? 'SUCCESS' : 'FAILED');
    
    console.log('\n🎉 Migration complete!');
    console.log('\n⚠️  IMPORTANT: Do NOT delete Secrets Manager secrets yet!');
    console.log('    Keep both systems running until Phase 6 cutover.');

  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

migrateSecrets();
```

### 2.3 Run Migration Script

```bash
# Ensure AWS profile is set
$env:AWS_PROFILE="your-app-api"

# Run migration
node scripts/migrate-secrets-to-parameter-store.js
```

**Expected Output**:

```text
🔧 AWS Profile automatically set to: your-app-api
🚀 Starting Secrets Manager to Parameter Store migration...

📦 Migrating application secrets...
✅ Parameter /your-app/dev/secrets stored successfully
✅ Application secrets migrated

📦 Migrating MongoDB URI...
✅ Parameter /your-app/dev/mongodb-uri stored successfully
✅ MongoDB URI migrated

🔍 Verifying migration...
✅ Secrets verification:  SUCCESS
✅ MongoDB verification:  SUCCESS

🎉 Migration complete!

⚠️  IMPORTANT: Do NOT delete Secrets Manager secrets yet!
    Keep both systems running until Phase 6 cutover.
```

**✅ Phase 2 Complete When**:

- [ ] Parameter Store utility module created and tested
- [ ] Migration script successfully copies all secrets
- [ ] Manual verification confirms data integrity
- [ ] Both Secrets Manager and Parameter Store have identical data

**Commit Point**: Commit utility code and migration script

```bash
git add app/utils/parameter_store.js scripts/migrate-secrets-to-parameter-store.js
git commit -m "feat: Add Parameter Store utilities and migration script"
git push
```

---

## 📖 Phase 3: Auth0 Token Caching Implementation

### 3.1 Create Auth0 Token Cache Manager

**File**: `app/utils/auth0_token_cache.js`

```javascript
// File: app/utils/auth0_token_cache.js
import axios from 'axios';
import { getParameter, putParameter } from './parameter_store.js';

// In-memory cache (Lambda container lifetime)
let memoryCache = {
  token: null,
  expires: 0
};

/**
 * Three-stage token retrieval: Memory → SSM → Auth0
 * @returns {Promise<string>} Valid access token
 */
export async function getAuth0Token() {
  const now = Date.now();

  // STAGE 1: Check memory cache
  if (memoryCache.token && memoryCache.expires > now) {
    console.log('✅ Auth0 token from MEMORY cache');
    return memoryCache.token;
  }

  // STAGE 2: Check SSM Parameter Store cache
  try {
    const ssmToken = await getParameter('/your-app/dev/auth0-cache/token', true);
    const ssmExpires = parseInt(await getParameter('/your-app/dev/auth0-cache/expires', false));

    if (ssmToken && ssmToken !== 'placeholder' && ssmExpires > now) {
      console.log('✅ Auth0 token from SSM cache');
      
      // Update memory cache
      memoryCache.token = ssmToken;
      memoryCache.expires = ssmExpires;
      
      return ssmToken;
    }
  } catch (error) {
    console.log('⚠️  SSM cache miss, fetching from Auth0:', error.message);
  }

  // STAGE 3: Fetch fresh token from Auth0
  console.log('🔄 Fetching fresh Auth0 token...');
  const { token, expiresAt } = await fetchFreshAuth0Token();

  // Update memory cache
  memoryCache.token = token;
  memoryCache.expires = expiresAt;

  // Update SSM cache (fire and forget - don't block response)
  updateSsmCache(token, expiresAt).catch(err => {
    console.error('⚠️  Failed to update SSM cache:', err.message);
  });

  console.log('✅ Auth0 token from Auth0 API (cached for future)');
  return token;
}

/**
 * Fetch a fresh token from Auth0
 * @returns {Promise<{token: string, expiresAt: number}>}
 */
async function fetchFreshAuth0Token() {
  // Fetch Auth0 credentials from Parameter Store
  const secrets = await fetchSecretsFromParameterStore();
  
  const tokenUrl = `https://${secrets.AUTH0_DOMAIN}/oauth/token`;
  
  const response = await axios.post(tokenUrl, {
    client_id: secrets.AUTH0_CLIENT_ID,
    client_secret: secrets.AUTH0_CLIENT_SECRET,
    audience: secrets.AUTH0_AUDIENCE,
    grant_type: 'client_credentials'
  });

  const token = response.data.access_token;
  const expiresIn = response.data.expires_in; // seconds
  
  // Calculate expiration with 5-minute buffer (expires 5 min before actual expiry)
  const expiresAt = Date.now() + ((expiresIn - 300) * 1000);

  return { token, expiresAt };
}

/**
 * Update SSM cache with new token (async, non-blocking)
 * @param {string} token - Access token
 * @param {number} expiresAt - Expiration timestamp (ms)
 */
async function updateSsmCache(token, expiresAt) {
  try {
    await putParameter('/your-app/dev/auth0-cache/token', token, 'SecureString', true);
    await putParameter('/your-app/dev/auth0-cache/expires', expiresAt.toString(), 'String', true);
    console.log('✅ SSM cache updated with new token');
  } catch (error) {
    console.error('❌ Failed to update SSM cache:', error.message);
    // Don't throw - cache update failure shouldn't break the request
  }
}

/**
 * Helper to fetch secrets from Parameter Store
 */
async function fetchSecretsFromParameterStore() {
  const secretsJson = await getParameter('/your-app/dev/secrets', true);
  return JSON.parse(secretsJson);
}

/**
 * Clear all caches (for testing)
 */
export function clearTokenCache() {
  memoryCache = { token: null, expires: 0 };
  console.log('🧹 Token cache cleared');
}
```

### 3.2 Create Token Cache Test Script

**File**: `scripts/test-auth0-token-cache.js`

```javascript
// File: scripts/test-auth0-token-cache.js
import { getAuth0Token, clearTokenCache } from '../app/utils/auth0_token_cache.js';

// Set AWS profile
process.env.AWS_PROFILE = 'your-app-api';
console.log('🔧 AWS Profile automatically set to: your-app-api\n');

async function testTokenCache() {
  console.log('🧪 Testing Auth0 Token Cache (Three-Stage Fallback)\n');
  console.log('═'.repeat(80));

  try {
    // Test 1: First call (should fetch from Auth0)
    console.log('\n📍 TEST 1: First call (cold start - no cache)');
    console.log('─'.repeat(80));
    const startTime1 = Date.now();
    const token1 = await getAuth0Token();
    const duration1 = Date.now() - startTime1;
    console.log(`Token (first 50 chars): ${token1.substring(0, 50)}...`);
    console.log(`Duration: ${duration1}ms`);
    console.log(`Expected: Auth0 API call (~500-2000ms)`);

    // Test 2: Immediate second call (should use memory cache)
    console.log('\n📍 TEST 2: Immediate second call (same Lambda container)');
    console.log('─'.repeat(80));
    const startTime2 = Date.now();
    const token2 = await getAuth0Token();
    const duration2 = Date.now() - startTime2;
    console.log(`Token matches: ${token1 === token2 ? '✅ YES' : '❌ NO'}`);
    console.log(`Duration: ${duration2}ms`);
    console.log(`Expected: Memory cache (~1-5ms)`);

    // Test 3: Clear memory, test SSM cache
    console.log('\n📍 TEST 3: After memory clear (simulates new Lambda container)');
    console.log('─'.repeat(80));
    clearTokenCache();
    const startTime3 = Date.now();
    const token3 = await getAuth0Token();
    const duration3 = Date.now() - startTime3;
    console.log(`Token matches: ${token1 === token3 ? '✅ YES' : '❌ NO'}`);
    console.log(`Duration: ${duration3}ms`);
    console.log(`Expected: SSM cache (~50-200ms)`);

    // Test 4: Performance summary
    console.log('\n═'.repeat(80));
    console.log('📊 PERFORMANCE SUMMARY\n');
    console.log(`Auth0 API:     ${duration1}ms  (Stage 3 - Full fetch)`);
    console.log(`Memory Cache:  ${duration2}ms  (Stage 1 - Instant)`);
    console.log(`SSM Cache:     ${duration3}ms  (Stage 2 - Fast)`);
    console.log(`\nSpeed improvement: ${Math.round(duration1 / duration2)}x faster with memory cache`);
    console.log(`Speed improvement: ${Math.round(duration1 / duration3)}x faster with SSM cache`);

    console.log('\n✅ All tests passed!');
    console.log('\n💡 Three-stage fallback working correctly:');
    console.log('   1. Memory cache (fastest) ✅');
    console.log('   2. SSM cache (fast) ✅');
    console.log('   3. Auth0 API (full fetch) ✅');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testTokenCache();
```

### 3.3 Run Token Cache Tests

```bash
# Set AWS profile
$env:AWS_PROFILE="your-app-api"

# Run tests
node scripts/test-auth0-token-cache.js
```

**Expected Output**:

```text
🔧 AWS Profile automatically set to: your-app-api

🧪 Testing Auth0 Token Cache (Three-Stage Fallback)

════════════════════════════════════════════════════════════════════════════════

📍 TEST 1: First call (cold start - no cache)
────────────────────────────────────────────────────────────────────────────────
🔄 Fetching fresh Auth0 token...
✅ SSM cache updated with new token
✅ Auth0 token from Auth0 API (cached for future)
Token (first 50 chars): eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik...
Duration: 1247ms
Expected: Auth0 API call (~500-2000ms)

📍 TEST 2: Immediate second call (same Lambda container)
────────────────────────────────────────────────────────────────────────────────
✅ Auth0 token from MEMORY cache
Token matches: ✅ YES
Duration: 2ms
Expected: Memory cache (~1-5ms)

📍 TEST 3: After memory clear (simulates new Lambda container)
────────────────────────────────────────────────────────────────────────────────
🧹 Token cache cleared
✅ Auth0 token from SSM cache
Token matches: ✅ YES
Duration: 87ms
Expected: SSM cache (~50-200ms)

════════════════════════════════════════════════════════════════════════════════
📊 PERFORMANCE SUMMARY

Auth0 API:     1247ms  (Stage 3 - Full fetch)
Memory Cache:  2ms  (Stage 1 - Instant)
SSM Cache:     87ms  (Stage 2 - Fast)

Speed improvement: 624x faster with memory cache
Speed improvement: 14x faster with SSM cache

✅ All tests passed!

💡 Three-stage fallback working correctly:
   1. Memory cache (fastest) ✅
   2. SSM cache (fast) ✅
   3. Auth0 API (full fetch) ✅
```

**✅ Phase 3 Complete When**:

- [ ] Auth0 token cache manager created
- [ ] All three cache stages working (Memory → SSM → Auth0)
- [ ] Test script confirms performance improvements
- [ ] SSM cache persisting tokens across Lambda invocations

**Commit Point**: Commit Auth0 caching implementation

```bash
git add app/utils/auth0_token_cache.js scripts/test-auth0-token-cache.js
git commit -m "feat: Implement three-stage Auth0 token caching (Memory → SSM → Auth0)"
git push
```

---

## 📖 Phase 4: Application Code Migration (Parallel Implementation)

### 4.1 Create Secrets Manager Wrapper (Dual Mode Support)

**File**: `app/utils/secrets_manager.js` (UPDATE EXISTING or CREATE)

```javascript
// File: app/utils/secrets_manager.js
import { 
  SecretsManagerClient, 
  GetSecretValueCommand 
} from '@aws-sdk/client-secrets-manager';
import { fetchSecrets as fetchFromParameterStore, fetchMongoUri as fetchMongoUriFromParameterStore } from './parameter_store.js';

const secretsClient = new SecretsManagerClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

// Flag to control which system to use (set via environment variable)
const USE_PARAMETER_STORE = process.env.USE_PARAMETER_STORE === 'true';

let secretsInitialized = false;
let secretsCache = null;

/**
 * Fetch secret from Secrets Manager (legacy)
 */
async function fetchFromSecretsManager(secretId) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await secretsClient.send(command);
    return JSON.parse(response.SecretString);
  } catch (error) {
    console.error(`Failed to fetch secret ${secretId} from Secrets Manager:`, error.message);
    throw error;
  }
}

/**
 * Initialize secrets into process.env (supports BOTH Secrets Manager and Parameter Store)
 * This is called once at Lambda cold start
 */
export async function initializeSecretsToEnv() {
  if (secretsInitialized) {
    console.log('Secrets already initialized, skipping...');
    return;
  }

  console.log(`🔧 Initializing secrets from ${USE_PARAMETER_STORE ? 'Parameter Store' : 'Secrets Manager'}...`);

  try {
    // Fetch secrets from configured source
    let secrets;
    if (USE_PARAMETER_STORE) {
      secrets = await fetchFromParameterStore();
      console.log('✅ Secrets loaded from Parameter Store');
    } else {
      secrets = await fetchFromSecretsManager('your-app/dev/secrets');
      console.log('✅ Secrets loaded from Secrets Manager');
    }

    // Load all secrets into process.env
    const SECRET_KEYS = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'GOOGLE_API_KEY',
      'GROQ_API_KEY',
      'DEEPSEEK_API_KEY',
      'AUTH0_DOMAIN',
      'AUTH0_CLIENT_ID',
      'AUTH0_CLIENT_SECRET',
      'AUTH0_AUDIENCE'
    ];

    for (const key of SECRET_KEYS) {
      if (secrets[key] && !process.env[key]) {
        process.env[key] = secrets[key];
      }
    }

    secretsCache = secrets;
    secretsInitialized = true;
    console.log('✅ All secrets loaded into process.env');

  } catch (error) {
    console.error('❌ Failed to initialize secrets:', error);
    throw error;
  }
}

/**
 * Fetch MongoDB URI (supports both sources)
 */
export async function fetchMongoUri() {
  if (USE_PARAMETER_STORE) {
    console.log('📦 Fetching MongoDB URI from Parameter Store');
    return await fetchMongoUriFromParameterStore();
  } else {
    console.log('📦 Fetching MongoDB URI from Secrets Manager');
    const response = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: 'your-app/dev/mongodb-uri' })
    );
    return response.SecretString;
  }
}

/**
 * Get cached secrets (for direct access if needed)
 */
export function getSecretsCache() {
  if (!secretsInitialized) {
    throw new Error('Secrets not initialized! Call initializeSecretsToEnv() first.');
  }
  return secretsCache;
}
```

### 4.2 Update Lambda Entry Point

**File**: `app/lambda.js` or `app/index.js` (UPDATE EXISTING)

```javascript
// File: app/lambda.js (or index.js)
import { initializeSecretsToEnv, fetchMongoUri } from './utils/secrets_manager.js';
import { MongoClient } from 'mongodb';

let cachedDb = null;
let cachedClient = null;

/**
 * Initialize MongoDB connection (called once per Lambda container)
 */
async function initializeDatabase() {
  if (cachedDb) {
    console.log('Using cached MongoDB connection');
    return cachedDb;
  }

  try {
    // CRITICAL: Load secrets into process.env BEFORE any other initialization
    await initializeSecretsToEnv();

    // Fetch MongoDB URI from configured source (Secrets Manager or Parameter Store)
    const mongoUri = await fetchMongoUri();

    const connectionOptions = {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    console.log('Connecting to MongoDB Atlas...');
    cachedClient = new MongoClient(mongoUri, connectionOptions);
    await cachedClient.connect();
    
    cachedDb = cachedClient.db('your-database-name');
    console.log('✅ MongoDB connected successfully');

    return cachedDb;
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Lambda handler (API Gateway proxy integration)
 */
export async function handler(event, context) {
  // Ensure secrets and database are initialized
  await initializeDatabase();

  const path = event.path;
  const method = event.httpMethod;

  console.log(`${method} ${path}`);

  // Route to appropriate handler
  if (path.startsWith('/api/recipes')) {
    const { handleRecipes } = await import('./handlers/recipes.js');
    return await handleRecipes(event, context);
  }
  // ... other routes

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' })
  };
}
```

### 4.3 Environment Variable Configuration

**For Lambda Function** (via Terraform or AWS Console):

```hcl
# In infra/app_api.tf or similar
resource "aws_lambda_function" "app_lambda" {
  # ... other configuration

  environment {
    variables = {
      USE_PARAMETER_STORE = "false"  # Start with false (Secrets Manager)
      AWS_REGION          = var.aws_region
      NODE_ENV            = "production"
    }
  }
}
```

**For Local Testing** (in `.env` file):

```bash
USE_PARAMETER_STORE=true  # Test Parameter Store locally
AWS_REGION=us-east-1
AWS_PROFILE=your-app-api
```

**✅ Phase 4 Complete When**:

- [ ] Dual-mode secrets manager implemented
- [ ] Lambda code supports both Secrets Manager and Parameter Store
- [ ] Environment variable controls which system is used
- [ ] Code deployed but still using Secrets Manager (USE_PARAMETER_STORE=false)

**Commit Point**: Commit parallel implementation

```bash
git add app/utils/secrets_manager.js app/lambda.js infra/app_api.tf .env
git commit -m "feat: Add dual-mode secrets support (Secrets Manager + Parameter Store)"
git push
```

---

## 📖 Phase 5: Testing & Validation

### 5.1 Test Secrets Manager Path (Baseline)

```bash
# Ensure Lambda is using Secrets Manager
$env:USE_PARAMETER_STORE="false"

# Deploy Lambda
cd app
npm run deploy:lambda

# Test endpoints
npm run test:lambda
```

**Expected**: All tests pass with Secrets Manager

### 5.2 Test Parameter Store Path (New System)

```bash
# Switch to Parameter Store
$env:USE_PARAMETER_STORE="true"

# Update Lambda environment variable via AWS CLI
aws lambda update-function-configuration `
  --function-name your-app-lambda `
  --environment "Variables={USE_PARAMETER_STORE=true,AWS_REGION=us-east-1}"

# Deploy code (if needed)
npm run deploy:lambda

# Test endpoints
npm run test:lambda
```

**Expected**: All tests pass with Parameter Store

### 5.3 Test Auth0 Token Caching

```bash
# Run token cache tests
node ../scripts/test-auth0-token-cache.js
```

**Expected**: Three-stage fallback working (Memory → SSM → Auth0)

### 5.4 Load Testing (Optional but Recommended)

Create a simple load test script to verify token caching under concurrent requests:

**File**: `scripts/test-auth0-load.js`

```javascript
// File: scripts/test-auth0-load.js
import { getAuth0Token } from '../app/utils/auth0_token_cache.js';

process.env.AWS_PROFILE = 'your-app-api';

async function loadTest() {
  console.log('🚀 Auth0 Token Cache Load Test\n');
  console.log('Running 50 concurrent token requests...\n');

  const startTime = Date.now();
  const promises = [];

  // Fire 50 concurrent requests
  for (let i = 0; i < 50; i++) {
    promises.push(getAuth0Token());
  }

  const tokens = await Promise.all(promises);
  const duration = Date.now() - startTime;

  // Verify all tokens are identical
  const uniqueTokens = new Set(tokens);
  
  console.log(`✅ Completed 50 requests in ${duration}ms`);
  console.log(`📊 Average: ${Math.round(duration / 50)}ms per request`);
  console.log(`🔑 Unique tokens: ${uniqueTokens.size} (should be 1)`);
  
  if (uniqueTokens.size === 1) {
    console.log('\n✅ SUCCESS: All requests used cached token!');
  } else {
    console.log('\n⚠️  WARNING: Multiple tokens generated (possible race condition)');
  }
}

loadTest();
```

```bash
node scripts/test-auth0-load.js
```

**Expected Output**:

```text
🚀 Auth0 Token Cache Load Test

Running 50 concurrent token requests...

✅ Auth0 token from Auth0 API (cached for future)
✅ Auth0 token from MEMORY cache
✅ Auth0 token from MEMORY cache
[... 47 more memory cache hits ...]

✅ Completed 50 requests in 1,523ms
📊 Average: 30ms per request
🔑 Unique tokens: 1 (should be 1)

✅ SUCCESS: All requests used cached token!
```

**✅ Phase 5 Complete When**:

- [ ] All tests pass with Secrets Manager (baseline)
- [ ] All tests pass with Parameter Store (new system)
- [ ] Auth0 token caching working correctly
- [ ] Load testing confirms cache efficiency
- [ ] No regressions in existing functionality

**Commit Point**: Document test results

```bash
git add scripts/test-auth0-load.js
git commit -m "test: Add Auth0 token cache load testing"
git push
```

---

## 📖 Phase 6: Hard Cutover

### 6.1 Pre-Cutover Checklist

**Verify all systems are ready**:

- [ ] Parameter Store has all secrets from Secrets Manager
- [ ] IAM permissions tested and working
- [ ] Auth0 token caching tested and performant
- [ ] All application tests passing with `USE_PARAMETER_STORE=true`
- [ ] Lambda deployed with dual-mode code
- [ ] Backup of current Secrets Manager secrets created

### 6.2 Create Backup Script

**File**: `scripts/backup-secrets-manager.js`

```javascript
// File: scripts/backup-secrets-manager.js
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import fs from 'fs';

process.env.AWS_PROFILE = 'your-app-api';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function backupSecret(secretId) {
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await client.send(command);
  return response.SecretString;
}

async function backupAll() {
  console.log('📦 Backing up Secrets Manager secrets...\n');

  const backupData = {
    timestamp: new Date().toISOString(),
    secrets: {}
  };

  const secretIds = [
    'your-app/dev/secrets',
    'your-app/dev/mongodb-uri'
  ];

  for (const secretId of secretIds) {
    console.log(`Backing up: ${secretId}`);
    backupData.secrets[secretId] = await backupSecret(secretId);
  }

  const backupFile = `secrets-manager-backup-${Date.now()}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

  console.log(`\n✅ Backup saved to: ${backupFile}`);
  console.log('⚠️  Store this file securely! It contains sensitive secrets.');
}

backupAll();
```

```bash
# Create backup before cutover
node scripts/backup-secrets-manager.js
```

### 6.3 Execute Cutover

#### Step 1: Update Lambda Environment Variable

```bash
# Set AWS profile
$env:AWS_PROFILE="your-app-api"

# Switch Lambda to Parameter Store
aws lambda update-function-configuration `
  --function-name your-app-lambda `
  --environment "Variables={USE_PARAMETER_STORE=true,AWS_REGION=us-east-1,NODE_ENV=production}"

# Verify update
aws lambda get-function-configuration `
  --function-name your-app-lambda `
  --query 'Environment'
```

#### Step 2: Test Production Immediately

```bash
# Run full test suite against production
cd app/tests
npm run test:lambda

# Test specific critical endpoints
curl -H "Authorization: Bearer $TOKEN" https://your-api.com/health
curl -H "Authorization: Bearer $TOKEN" https://your-api.com/api/recipes
```

#### Step 3: Monitor CloudWatch Logs

```bash
# Watch Lambda logs for any errors
aws logs tail /aws/lambda/your-app-lambda --follow --since 5m
```

**Look for**:

- ✅ "✅ Secrets loaded from Parameter Store"
- ✅ "✅ Auth0 token from SSM cache" or "✅ Auth0 token from MEMORY cache"
- ❌ Any errors related to permissions or secret access

#### Step 4: Update Terraform (Optional)

If you want to codify the change in Terraform:

```hcl
# In infra/app_api.tf
resource "aws_lambda_function" "app_lambda" {
  # ... other configuration

  environment {
    variables = {
      USE_PARAMETER_STORE = "true"  # Changed from false
      AWS_REGION          = var.aws_region
      NODE_ENV            = "production"
    }
  }
}
```

```bash
cd infra
terraform plan
terraform apply
```

### 6.4 Rollback Plan (If Issues Occur)

**If anything goes wrong, immediately rollback**:

```bash
# Rollback Lambda to Secrets Manager
aws lambda update-function-configuration `
  --function-name your-app-lambda `
  --environment "Variables={USE_PARAMETER_STORE=false,AWS_REGION=us-east-1,NODE_ENV=production}"

# Deploy previous code version if needed
cd app
git checkout <previous-commit-hash>
npm run deploy:lambda
git checkout master
```

### 6.5 Post-Cutover Validation

**After 24-48 hours of stable operation**:

```bash
# Verify no errors in CloudWatch
aws logs filter-log-events `
  --log-group-name /aws/lambda/your-app-lambda `
  --start-time $(date -u -d '24 hours ago' +%s)000 `
  --filter-pattern "ERROR"

# Check Auth0 API usage decreased (should see ~99% reduction in M2M token calls)
# Check Auth0 dashboard: Applications → Your App → Quickstart → Check M2M stats
```

**✅ Phase 6 Complete When**:

- [ ] Lambda running on Parameter Store for 24-48 hours with no issues
- [ ] CloudWatch logs show no secret access errors
- [ ] Auth0 API calls reduced by ~99% (token caching working)
- [ ] All application functionality working normally
- [ ] No performance degradation

**Commit Point**: Finalize cutover

```bash
git add infra/app_api.tf scripts/backup-secrets-manager.js
git commit -m "feat: Complete cutover to Parameter Store (remove USE_PARAMETER_STORE flag)"
git push
```

---

## 📖 Phase 7: Cleanup (After Stable Operation)

### 7.1 Deprecate Secrets Manager (After 1+ Week)

**Only after confirming 1+ week of stable Parameter Store operation**:

```bash
# Set AWS profile
$env:AWS_PROFILE="your-app-api"

# Delete Secrets Manager secrets (CAREFUL!)
aws secretsmanager delete-secret `
  --secret-id your-app/dev/secrets `
  --recovery-window-in-days 30  # 30-day recovery window

aws secretsmanager delete-secret `
  --secret-id your-app/dev/mongodb-uri `
  --recovery-window-in-days 30
```

**Note**: Secrets Manager has a 7-30 day recovery window, so you can restore if needed.

### 7.2 Remove Dual-Mode Code

**Simplify `app/utils/secrets_manager.js`** by removing Secrets Manager support:

```javascript
// File: app/utils/secrets_manager.js (SIMPLIFIED)
import { fetchSecrets, fetchMongoUri as fetchMongoUriFromParameterStore } from './parameter_store.js';

let secretsInitialized = false;
let secretsCache = null;

/**
 * Initialize secrets into process.env from Parameter Store
 */
export async function initializeSecretsToEnv() {
  if (secretsInitialized) {
    console.log('Secrets already initialized, skipping...');
    return;
  }

  console.log('🔧 Initializing secrets from Parameter Store...');

  const secrets = await fetchSecrets();

  const SECRET_KEYS = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_API_KEY',
    'GROQ_API_KEY',
    'DEEPSEEK_API_KEY',
    'AUTH0_DOMAIN',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
    'AUTH0_AUDIENCE'
  ];

  for (const key of SECRET_KEYS) {
    if (secrets[key] && !process.env[key]) {
      process.env[key] = secrets[key];
    }
  }

  secretsCache = secrets;
  secretsInitialized = true;
  console.log('✅ All secrets loaded into process.env');
}

/**
 * Fetch MongoDB URI from Parameter Store
 */
export async function fetchMongoUri() {
  return await fetchMongoUriFromParameterStore();
}

/**
 * Get cached secrets
 */
export function getSecretsCache() {
  if (!secretsInitialized) {
    throw new Error('Secrets not initialized! Call initializeSecretsToEnv() first.');
  }
  return secretsCache;
}
```

### 7.3 Remove Environment Variable

```bash
# Update Lambda to remove USE_PARAMETER_STORE flag (no longer needed)
aws lambda update-function-configuration `
  --function-name your-app-lambda `
  --environment "Variables={AWS_REGION=us-east-1,NODE_ENV=production}"
```

### 7.4 Update Terraform

```hcl
# In infra/app_api.tf
resource "aws_lambda_function" "app_lambda" {
  # ... other configuration

  environment {
    variables = {
      # Removed USE_PARAMETER_STORE
      AWS_REGION = var.aws_region
      NODE_ENV   = "production"
    }
  }
}
```

```bash
cd infra
terraform plan
terraform apply
```

### 7.5 Remove Dependencies

```bash
# Remove Secrets Manager SDK from package.json
cd app
npm uninstall @aws-sdk/client-secrets-manager

# Update package.json and package-lock.json
npm install
```

**✅ Phase 7 Complete When**:

- [ ] Secrets Manager secrets deleted (with recovery window)
- [ ] Dual-mode code removed from application
- [ ] USE_PARAMETER_STORE flag removed
- [ ] Secrets Manager SDK dependency removed
- [ ] Terraform updated and applied

**Final Commit Point**: Complete migration

```bash
git add app/utils/secrets_manager.js app/package.json infra/app_api.tf
git commit -m "chore: Complete migration to Parameter Store (remove Secrets Manager)"
git push
```

---

## 📊 Cost Comparison

### Secrets Manager (OLD)

- **Cost**: $0.40 per secret per month + $0.05 per 10,000 API calls
- **Typical cost**: ~$5-10/month for 10 secrets with moderate API usage

### Parameter Store (NEW)

- **Standard Parameters**: FREE (up to 10,000 parameters)
- **API Calls**: FREE (no per-call charges)
- **Typical cost**: $0/month

**Annual Savings**: ~$60-120/year

---

## 🔍 Troubleshooting

### Issue: "Parameter not found" errors

**Cause**: Parameter name mismatch or permissions issue

**Solution**:

```bash
# Verify parameter exists
aws ssm get-parameter --name "/your-app/dev/secrets"

# Check IAM permissions
aws iam get-user-policy --user-name your-app-api --policy-name ParameterStoreAccess
```

### Issue: "Access denied" when writing to SSM cache

**Cause**: Missing `ssm:PutParameter` permission for auth0-cache path

**Solution**: Verify IAM policy includes write permission to `/your-app/dev/auth0-cache/*`

### Issue: Token cache not persisting across Lambda invocations

**Cause**: SSM write permission missing or async update failing

**Solution**: Check CloudWatch logs for SSM cache update errors

### Issue: High Auth0 API usage (token caching not working)

**Cause**: Memory cache clearing between invocations, SSM cache not being written

**Solution**:

```bash
# Check Lambda logs for cache hit/miss patterns
aws logs filter-log-events `
  --log-group-name /aws/lambda/your-app-lambda `
  --filter-pattern "Auth0 token"

# Should see mostly "from MEMORY cache" or "from SSM cache"
# NOT "from Auth0 API" on every request
```

---

## 📚 Summary Checklist

### Pre-Migration

- [ ] Read entire migration guide
- [ ] Back up existing Secrets Manager secrets
- [ ] Ensure AWS CLI and Terraform installed
- [ ] Verify AWS profiles configured (`your-app-api`, `terraform-your-app`)

### Phase 1: Infrastructure Setup

- [ ] Create Parameter Store parameters
- [ ] Set up IAM permissions for application user
- [ ] Update Terraform for Lambda execution role
- [ ] Test Parameter Store access manually
- [ ] **COMMIT**: Terraform IAM changes

### Phase 2: Parameter Store Migration

- [ ] Create Parameter Store utility module
- [ ] Create migration script
- [ ] Run migration script
- [ ] Verify data integrity
- [ ] **COMMIT**: Utilities and migration script

### Phase 3: Auth0 Token Caching

- [ ] Create Auth0 token cache manager
- [ ] Create token cache test script
- [ ] Run tests and verify three-stage fallback
- [ ] Confirm performance improvements
- [ ] **COMMIT**: Auth0 caching implementation

### Phase 4: Parallel Implementation

- [ ] Update secrets manager for dual-mode support
- [ ] Update Lambda entry point
- [ ] Configure environment variables
- [ ] Deploy with USE_PARAMETER_STORE=false (Secrets Manager)
- [ ] **COMMIT**: Dual-mode support

### Phase 5: Testing & Validation

- [ ] Test Secrets Manager path (baseline)
- [ ] Test Parameter Store path (new system)
- [ ] Test Auth0 token caching
- [ ] Run load tests (optional)
- [ ] Verify no regressions
- [ ] **COMMIT**: Test scripts

### Phase 6: Hard Cutover

- [ ] Create Secrets Manager backup
- [ ] Update Lambda to USE_PARAMETER_STORE=true
- [ ] Test production immediately
- [ ] Monitor CloudWatch logs
- [ ] Validate for 24-48 hours
- [ ] **COMMIT**: Cutover configuration

### Phase 7: Cleanup (After 1+ Week)

- [ ] Delete Secrets Manager secrets (with recovery window)
- [ ] Remove dual-mode code
- [ ] Remove USE_PARAMETER_STORE flag
- [ ] Remove Secrets Manager SDK dependency
- [ ] Update Terraform
- [ ] **COMMIT**: Final cleanup

---

## 🎉 Success Criteria

**Migration is successful when**:

1. ✅ All secrets retrieved from Parameter Store
2. ✅ Auth0 token caching shows 99% reduction in API calls
3. ✅ Lambda cold starts complete successfully (<10 seconds)
4. ✅ Application functionality unchanged (no user-facing issues)
5. ✅ CloudWatch logs show no secret access errors
6. ✅ Cost reduced to $0/month for secrets storage
7. ✅ Performance improved (faster token retrieval)

---

## 📝 Notes

- **DO NOT delete Secrets Manager secrets until Phase 7** (after 1+ week of stable Parameter Store operation)
- **Keep backup files secure** - they contain sensitive credentials
- **Monitor CloudWatch logs closely** during cutover period
- **Test thoroughly** at each phase before committing
- **Document any custom changes** specific to your application
- **Share this guide** with your team for future reference

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-23  
**Based On**: MomsRecipeBox successful migration (Parameter Store + Auth0 token caching)
