# Migration Plan: Secrets Manager → Parameter Store

**Goal**: Replace AWS Secrets Manager with Parameter Store to eliminate costs while maintaining security and functionality.

**Cost Savings**: Secrets Manager costs $0.40/secret/month ($4.80/year). Parameter Store Standard tier is **free**.

**Current State**:

- Secret: `moms-recipe-secrets-dev` contains 12+ fields (MongoDB credentials, Auth0 config, AI provider API keys)
- Used by: Lambda functions, Terraform, integration tests, utility scripts
- Dependencies: 15+ code references, 8+ documentation files

**Success Model**: Parameter Store token cache implementation demonstrated:

- ✅ Free tier usage (Standard tier))
- ✅ Lambda IAM permissions (GetParameter/PutParameter)
- ✅ Terraform resource managementt
- ✅ Graceful error handling
- ✅ Environment variable configurationn
- ✅ Zero downtime deployment

---

## Migration Strategy: Parallel Operation → Switchover → Cleanup

### Phase 1: Create Parallel Parameter Store (1-2 hours)

**Goal**: Establish Parameter Store alongside Secrets Manager without affecting production.

#### 1.1 Design Parameter Structure

**Decision Point**: Single parameter (JSON) vs multiple parameters (individual secrets)?

**Option A: Single JSON Parameter** (Recommended - mirrors current structure)

- Name: `/mrb/dev/secrets` (single parameter)
- Value: JSON string with all 12+ fields
- Pros: Simple migration, single IAM permission, atomic reads
- Cons: All-or-nothing updates, larger payload
- **Cost**: FREE (Standard tier, <4KB)

##### Option B: Individual Parameters

- Names: `/mrb/dev/mongodb-uri`, `/mrb/dev/auth0-domain`, etc.
- Values: Individual secret strings
- Pros: Granular permissions possible, smaller individual payloads
- Cons: 12+ IAM permissions needed, 12+ API calls to load all secrets, more complex code
- **Cost**: FREE (Standard tier, each <4KB)

**Recommendation**: Option A (Single JSON) - Keep it simple, matches current `getSecrets()` pattern.

#### 1.2 Create Terraform Configuration

```hcl
# infra/app_api.tf - Add new resource for Parameter Store

resource "aws_ssm_parameter" "application_secrets" {
  name        = "/mrb/dev/secrets"
  description = "Application secrets for Mom's Recipe Box (MongoDB, Auth0, AI providers)"
  type        = "SecureString"  # Encrypted at rest with AWS KMS
  value       = jsonencode({
    # MongoDB Atlas
    MONGODB_ATLAS_URI          = "not-initialized"
    
    # Auth0 Configuration
    AUTH0_DOMAIN               = "not-initialized"
    AUTH0_M2M_CLIENT_ID        = "not-initialized"
    AUTH0_M2M_CLIENT_SECRET    = "not-initialized"
    AUTH0_API_AUDIENCE         = "not-initialized"
    AUTH0_MRB_CLIENT_ID        = "not-initialized"
    
    # AI Provider API Keys
    OPENAI_API_KEY             = "not-initialized"
    ANTHROPIC_API_KEY          = "not-initialized"
    GROQ_API_KEY               = "not-initialized"
    GOOGLE_API_KEY             = "not-initialized"
    DEEPSEEK_API_KEY           = "not-initialized"
    
    # AWS Configuration
    AWS_ACCOUNT_ID             = "not-initialized"
    RECIPE_IMAGES_BUCKET       = "not-initialized"
  })
  tier        = "Standard"  # Free tier

  tags = {
    Project     = "MomsRecipeBox"
    Environment = "dev"
    ManagedBy   = "Terraform"
    Purpose     = "Application secrets - replacing Secrets Manager for cost optimization"
  }

  lifecycle {
    ignore_changes = [value, description]  # User manages values manually
  }
}
```

#### 1.3 Update Lambda IAM Role

```hcl
# infra/app_api.tf - Add IAM policy for Parameter Store access

# Update the existing IAM role attachment or add new inline policy
resource "aws_iam_role_policy" "lambda_parameter_store_access" {
  name = "mrb-lambda-parameter-store-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:us-west-2:*:secret:moms-recipe-secrets-dev*"
      },
      {
        Effect = "Allow"
        Action = "ssm:GetParameter"  # Read-only for secrets
        Resource = aws_ssm_parameter.application_secrets.arn
      }
    ]
  })
}
```

#### 1.4 Update terraform-mrb IAM Policy

```json
// docs/iam-policy-terraform-mrb-updated.json
// ParameterStoreManagement statement - add SecureString actions:
{
  "Sid": "ParameterStoreManagement",
  "Effect": "Allow",
  "Action": [
    "ssm:AddTagsToResource",
    "ssm:DeleteParameter",
    "ssm:GetParameter",
    "ssm:GetParameters",
    "ssm:ListTagsForResource",
    "ssm:PutParameter",
    "ssm:RemoveTagsFromResource"
  ],
  "Resource": "arn:aws:ssm:us-west-2:*:parameter/mrb/*"
}
```

#### 1.5 Add Lambda Environment Variable

```hcl
# infra/app_api.tf - Lambda environment block (update existing)

environment {
  variables = {
    AWS_SECRET_NAME            = var.aws_secret_name  # Current: moms-recipe-secrets-dev
    SSM_SECRETS_PARAMETER_NAME = aws_ssm_parameter.application_secrets.name  # NEW
    MONGODB_DATABASE           = "momsrecipebox"
    LAMBDA_APP_URL             = aws_apigatewayv2_api.mrb_api.api_endpoint
    NODE_ENV                   = "production"
    LOG_LEVEL                  = "INFO"
  }
}
```

**Deliverable**: Terraform apply creates Parameter Store parameter, updates Lambda IAM + environment variables.

---

### Phase 2: Implement Dual-Read Code (2-3 hours)

**Goal**: Lambda can read from BOTH Secrets Manager (primary) and Parameter Store (fallback/testing).

#### 2.1 Create New Parameter Store Module

```javascript
// app/utils/parameter_store.js
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { createLogger } from './logger.js';

const logger = createLogger('parameter_store');

const ssmClient = new SSMClient({
  region: process.env.AWS_REGION || 'us-west-2'
});

// Define the structure of our application secrets
export const REQUIRED_SECRETS = [
  'MONGODB_ATLAS_URI',
  'AUTH0_DOMAIN',
  'AUTH0_M2M_CLIENT_ID',
  'AUTH0_M2M_CLIENT_SECRET',
  'AUTH0_API_AUDIENCE',
  'AUTH0_MRB_CLIENT_ID'
];

export const OPTIONAL_SECRETS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GROQ_API_KEY',
  'GOOGLE_API_KEY',
  'DEEPSEEK_API_KEY',
  'AWS_ACCOUNT_ID',
  'RECIPE_IMAGES_BUCKET'
];

let cachedSecrets: AppSecrets | null = null;

/**
 * Get application secrets from Parameter Store
 * 
 * Reads from SSM parameter at /mrb/dev/secrets
 * Caches in memory for Lambda container lifetime
 * Expects JSON SecureString parameter
 * 
 * @returns {Promise<Object>} Application secrets object
 * @throws {Error} if parameter not found or invalid JSON
 */
export async function getSecretsFromParameterStore() {
  // Return cached secrets if available
  if (cachedSecrets) {
    return cachedSecrets;
  }

  const parameterName = process.env.SSM_SECRETS_PARAMETER_NAME || '/mrb/dev/secrets';

  try {
    const command = new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true  // Decrypt SecureString values
    });

    const response = await ssmClient.send(command);

    if (!response.Parameter?.Value) {
      throw new Error(`Parameter ${parameterName} not found or empty`);
    }

    // Parse JSON value
    const secrets = JSON.parse(response.Parameter.Value);

    // Validate required fields
    for (const field of REQUIRED_SECRETS) {
      if (!secrets[field]) {
        throw new Error(`Missing required secret field: ${field}`);
      }
    }

    // Cache for container lifetime
    cachedSecrets = secrets;
    
    logger.info('Secrets cached from Parameter Store', { 
      secretCount: Object.keys(secrets).length 
    });
    
    return secrets;

  } catch (error) {
    logger.error('Failed to get secrets from Parameter Store', error);
    throw new Error(`Parameter Store secrets retrieval failed: ${error.message}`);
  }
}

/**
 * Clear cached secrets (useful for testing)
 */
export function clearSecretsCache() {
  cachedSecrets = null;
  secretsInitialized = false;
}
```

#### 2.2 Update secrets_manager.js for Dual-Read

```javascript
// app/utils/secrets_manager.js - Update fetchSecrets function

import { getSecretsFromParameterStore } from './parameter_store.js';

/**
 * Fetch all secrets from AWS Secrets Manager (with Parameter Store fallback)
 * @returns {Promise<Object>} All secrets as key-value pairs
 */
export async function fetchSecrets() {
  if (secretsCache) {
    return secretsCache;
  }

  // Try Parameter Store first if SSM_SECRETS_PARAMETER_NAME is set
  const useParameterStore = process.env.SSM_SECRETS_PARAMETER_NAME;
  
  if (useParameterStore) {
    try {
      logger.info('Reading secrets from Parameter Store...');
      const secrets = await getSecretsFromParameterStore();
      logger.info('✅ Successfully loaded secrets from Parameter Store');
      secretsCache = secrets;
      return secrets;
    } catch (error) {
      logger.warn('⚠️ Parameter Store read failed, falling back to Secrets Manager', error);
      // Fall through to Secrets Manager
    }
  }

  // Fallback to Secrets Manager (current implementation)
  logger.info('Reading secrets from Secrets Manager...');
  
  try {
    const secretName = process.env.AWS_SECRET_NAME || 'moms-recipe-secrets-dev';
    const region = process.env.AWS_REGION || 'us-west-2';

    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    const secrets = JSON.parse(response.SecretString);
    secretsCache = secrets;

    logger.info('Secrets retrieved from AWS Secrets Manager', { 
      secretCount: Object.keys(secrets).length 
    });

    return secrets;
  } catch (error) {
    logger.error('Failed to fetch secrets from AWS Secrets Manager', error);
    throw error;
  }
}
```

**Testing Strategy**:

1. Deploy with `SSM_SECRETS_PARAMETER_NAME` unset → Uses Secrets Manager (current behavior)
2. Set `SSM_SECRETS_PARAMETER_NAME` but leave Parameter Store empty → Falls back to Secrets Manager
3. Populate Parameter Store → Uses Parameter Store successfully

**Deliverable**: Code deployed, dual-read working, all tests passing with Secrets Manager.

---

### Phase 3: Manual Parameter Store Population (30 mins)

**Goal**: Copy secrets from Secrets Manager to Parameter Store using AWS CLI.

#### 3.1 Export Secrets from Secrets Manager

```powershell
# Get current secrets as JSON

aws secretsmanager get-secret-value `
  --secret-id moms-recipe-secrets-dev `
  --region us-west-2 `
  --profile terraform-mrb `
  --query SecretString `
  --output text > temp-secrets.json

# Review contents (ensure no extra formatting)

Get-Content temp-secrets.json
```

#### 3.2 Import to Parameter Store

```powershell
# Put secrets into Parameter Store (SecureString = encrypted)

aws ssm put-parameter `
  --name /mrb/dev/secrets `
  --value (Get-Content temp-secrets.json -Raw) `
  --type SecureString `
  --overwrite `
  --region us-west-2 `
  --profile terraform-mrb

# Verify parameter created

aws ssm get-parameter `
  --name /mrb/dev/secrets `
  --with-decryption `
  --region us-west-2 `
  --profile terraform-mrb
```

#### 3.3 Secure Cleanup

```powershell
# Delete temporary file securely

Remove-Item temp-secrets.json -Force
```

**Deliverable**: Parameter Store contains all secrets, verified via CLI.

---

### Phase 4: Test Parameter Store Path (1-2 hours)

**Goal**: Validate Lambda can read from Parameter Store successfully.

#### 4.1 Update Lambda Environment Variable

```bash
# Temporarily enable Parameter Store (Terraform already has SSM_SECRETS_PARAMETER_NAME set)

npm run infra:apply  # Apply Terraform with environment variable
```

#### 4.2 Run Full Test Suite

```bash
# All tests should pass using Parameter Store secrets

npm run test
npm run test:integration
npx tsx backend/src/test-connection.ts
npx tsx backend/src/test-ai-chat.ts
```

#### 4.3 Monitor CloudWatch Logs

- Check Lambda logs for "✅ Successfully loaded secrets from Parameter Store""
- Verify no "⚠️ Parameter Store read failed" warnings
- Validate all API endpoints working correctly

#### 4.3 Performance Comparison

```javascript
// Add timing to fetchSecrets() for comparison
console.time('Secrets load time');
const secrets = await fetchSecrets();
console.timeEnd('Secrets load time');

// Expected:
// - Secrets Manager: ~50-150ms
// - Parameter Store: ~50-100ms (similar performance)
```

**Success Criteria**:

- ✅ All tests passing (recipes, shopping, favorites, comments, images, AI)
- ✅ No fallback warnings in logs
- ✅ CloudWatch shows "Parameter Store" in logs
- ✅ API endpoints responding normally
- ✅ Integration tests pass end-to-end

**Deliverable**: Confirmation that Parameter Store works as drop-in replacement.

---

### Phase 5: Update Documentation (1 hour)

**Goal**: Update all docs to reference Parameter Store instead of Secrets Manager.

#### 5.1 Files to Update

- [ ] `README.md` - Prerequisites, setup instructions
- [ ] `app/README.md` - Environment variables, deployment
- [ ] `infra/README.md` - Infrastructure overview, secrets management
- [ ] `docs/MongoDB-Atlas-Management-Guide.md` - References to secrets
- [ ] `docs/developer/npm_commands.md` - Update AWS profile commands
- [ ] `COPILOT_INSTRUCTIONS.md` - Update development rules
- [ ] Create `docs/parameter-store-setup.md` - New setup guide
- [ ] `infra/secret-example.json` - Create parameter-example.json

#### 5.2 Create New Migration Guide

```markdown
# docs/parameter-store-setup.md

## Manual Parameter Store Setup

### Prerequisites

- AWS CLI installed with `terraform-mrb` profile configured
- Access to current Secrets Manager secret (for migration)

### Initial Setup (New Projects)

1. Copy parameter template:

   ```bash
   cp infra/parameter-example.json temp-secrets.json
   ```

1. Fill in all values in temp-secrets.json

1. Create Parameter Store parameter:

   ```powershell
   aws ssm put-parameter `
     --name /mrb/dev/secrets `
     --value (Get-Content temp-secrets.json -Raw) `
     --type SecureString `
     --region us-west-2 `
     --profile terraform-mrb
   ```

1. Delete temp file: `Remove-Item temp-secrets.json -Force`

### Migration from Secrets Manager

[Include migration steps from Phase 3]

### Updating Secrets

```powershell
# Get current value

aws ssm get-parameter --name /mrb/dev/secrets --with-decryption --query Parameter.Value --output text > temp.json

# Edit temp.json with your changes

# Update parameter

aws ssm put-parameter --name /mrb/dev/secrets --value (Get-Content temp.json -Raw) --type SecureString --overwrite

# Cleanup

Remove-Item temp.json -Force
```

```text
(Example output from AWS CLI showing successful update)
```

**Deliverable**: All documentation updated, migration guide created.

---

### Phase 6: Remove Secrets Manager (1 hour)

**Goal**: Clean removal of Secrets Manager resources and code.

#### 6.1 Update Terraform to Remove Secrets Manager

```hcl
# infra/app_api.tf - REMOVE Secrets Manager IAM attachment

# DELETE this resource:
# resource "aws_iam_role_policy_attachment" "lambda_secretsmanager_access" {
#   role       = aws_iam_role.lambda_exec.name
#   policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
# }
```

#### 6.2 Update Lambda IAM Policy

```hcl
# infra/app_api.tf - Update inline policy to remove Secrets Manager

resource "aws_iam_role_policy" "lambda_parameter_store_access" {
  name = "mrb-lambda-parameter-store-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # REMOVE Secrets Manager statement entirely
      {
        Effect = "Allow"
        Action = "ssm:GetParameter"
        Resource = aws_ssm_parameter.application_secrets.arn
      }
    ]
  })
}
```

#### 6.3 Update Lambda Environment

```hcl
# infra/app_api.tf - Remove AWS_SECRET_NAME

environment {
  variables = {
    # REMOVE: AWS_SECRET_NAME = var.aws_secret_name
    SSM_SECRETS_PARAMETER_NAME = aws_ssm_parameter.application_secrets.name
    MONGODB_DATABASE           = "momsrecipebox"
    LAMBDA_APP_URL             = aws_apigatewayv2_api.mrb_api.api_endpoint
    NODE_ENV                   = "production"
    LOG_LEVEL                  = "INFO"
  }
}
```

#### 6.4 Update variables.tf

```hcl
# infra/variables.tf

# REMOVE this variable:
# variable "aws_secret_name" {
#   description = "AWS Secrets Manager secret name for MongoDB Atlas credentials"
#   type        = string
#   default     = "moms-recipe-secrets-dev"
# }
```

#### 6.5 Simplify Backend Code

```javascript
// app/utils/secrets_manager.js - Remove Secrets Manager code entirely

export async function fetchSecrets() {
  // Parameter Store is now the only source
  return await getSecretsFromParameterStore();
}

// REMOVE: Old Secrets Manager client code
// REMOVE: SecretsManagerClient import
// REMOVE: GetSecretValueCommand import
```

#### 6.7 Apply Terraform Changes

```bash
npm run infra:apply
# Expected: 0 to add, 2 to change (Lambda env vars + IAM policy), 0 to destroy

# Secrets Manager secret remains in AWS but is no longer referenced
```

**Deliverable**: Terraform state clean, Lambda using only Parameter Store.

---

### Phase 7: Delete Secrets Manager Secret (5 mins)

**Goal**: Remove Secrets Manager secret to stop billing.

#### 7.1 Delete via AWS Console

1. Navigate to AWS Secrets Manager console
2. Select `vehical-wellness-center-dev`
3. Actions → Delete secret
4. Choose "Schedule deletion" with 7-day recovery window (recommended)
5. Confirm deletion

**OR via AWS CLI:**

```powershell
aws secretsmanager delete-secret `
  --secret-id moms-recipe-secrets-dev `
  --recovery-window-in-days 7 `
  --region us-west-2 `
  --profile terraform-mrb
```

#### 7.2 Verify No Impact

- Run full test suite: `npm run test`
- Test all API endpoints
- Check CloudWatch logs for errors

**Rollback Plan**: If issues arise within 7 days, restore secret:

```powershell
aws secretsmanager restore-secret `
  --secret-id moms-recipe-secrets-dev `
  --region us-west-2 `
  --profile terraform-mrb
```

**Deliverable**: Secrets Manager secret deleted, $4.80/year cost savings achieved.

---

### Phase 8: Final Cleanup (30 mins)

**Goal**: Remove all Secrets Manager references from codebase.

#### 8.1 Update terraform-mrb IAM Policy

```json
// docs/iam-policy-terraform-mrb-updated.json
// REMOVE SecretsManagerAccess statement entirely if present
```

#### 8.2 Remove Dead Files

```bash
# Files to delete (if they exist):

rm infra/secret-example.json   # Will be replaced by parameter-example.json
```

#### 8.3 Search and Replace

```bash
# Find any remaining "Secrets Manager" references

grep -r "Secrets Manager" . --include="*.md" --include="*.js"
grep -r "secretsmanager" . --include="*.md" --include="*.js"
grep -r "AWS_SECRET_NAME" . --include="*.md" --include="*.js"

# Update any found references to "Parameter Store"
```

#### 8.4 Final Test Suite

```bash
npm run test
npm run test:recipes
npm run test:shopping
npm run test:favorites
npm run test:comments
npm run test:images
npm run test:ai-providers
```

**Deliverable**: Clean codebase with no Secrets Manager remnants.

---

## Commit Strategy

### Commit 1: Infrastructure Foundation

```bash
git add infra/ .github/copilot-instructions.md
git commit -m "infra: add Parameter Store for application secrets (parallel to Secrets Manager)"
```

**Files**: Terraform config, IAM policies, copilot instructions

### Commit 2: Dual-Read Implementation

```bash
git add app/utils/
git commit -m "feat(backend): implement dual-read secrets (Parameter Store with Secrets Manager fallback)"
```

**Files**: parameter_store.js, updated secrets_manager.js

### Commit 3: Enable Parameter Store

```bash
# After manual population and testing

git add CHANGELOG.md
git commit -m "feat(infra): enable Parameter Store secrets in Lambda environment"
```

**Files**: Lambda env vars, CHANGELOG

### Commit 4: Update Documentation

```bash
git add docs/ README.md backend/README.md infra/README.md
git commit -m "docs: update all documentation for Parameter Store migration"
```

**Files**: All docs, setup guides, examples

### Commit 5: Remove Secrets Manager

```bash
git add infra/ app/utils/ CHANGELOG.md
git commit -m "refactor: remove Secrets Manager dependency - $4.80/year cost savings"
```

**Files**: Terraform cleanup, simplified code, changelog

### Commit 6: Final Cleanup

```bash
git add .
git commit -m "chore: remove remaining Secrets Manager references and dead files"
```

**Files**: IAM policy, deleted files, search/replace updates

---

## Risk Mitigation

### Rollback Plan (Per Phase)

**Phase 1-2**: No risk - Secrets Manager still primary

- Action: None needed, Parameter Store not yet used

**Phase 3-4**: Parameter Store populated but not in use

- Action: Delete Parameter Store parameter, no code changes needed

**Phase 5-6**: Using Parameter Store, Secrets Manager still exists

- Rollback: Unset `SSM_SECRETS_PARAMETER_NAME` environment variable, redeploy Lambda
- Time: ~2 minutes

**Phase 7**: Secrets Manager deleted (7-day recovery window)

- Rollback: Restore secret via AWS CLI/Console, set `AWS_SECRET_NAME` env var, redeploy
- Time: ~5 minutes

**Phase 8**: Secrets Manager permanently deleted

- Rollback: Recreate secret manually, restore old code from git history
- Time: ~30 minutes

### Testing Checkpoints

- ✅ After Phase 2: Tests pass with Secrets Manager
- ✅ After Phase 4: Tests pass with Parameter Store
- ✅ After Phase 6: Tests pass without Secrets Manager reference
- ✅ After Phase 8: Full regression test suite

### Monitoring

- CloudWatch logs: Watch for "Parameter Store" vs "Secrets Manager" in Lambda logs
- Lambda errors: Monitor for SSM permission errors or JSON parsing failures
- API Gateway: Watch 5xx error rates during cutover
- Integration tests: Run test suite after each deployment phase

---

## Success Metrics

### Cost Savings

- **Before**: $0.40/month ($4.80/year) for Secrets Managerr
- **After**: $0.00/month (Parameter Store Standard tier free)
- **Annual Savings**: $4.80 (100% reduction)

### Performance

- **Secrets Manager**: ~50-150ms per secret retrievall
- **Parameter Store**: ~50-100ms per parameter retrieval
- **Expected Impact**: Negligible (<50ms difference), similar caching patterns

### Security

- **Encryption at Rest**: Both use AWS KMS (SecureString parameter type))
- **Encryption in Transit**: Both use TLS
- **IAM Permissions**: Similar granularity (resource-level ARNs))
- **Audit Logging**: Both support CloudTrail
- **Conclusion**: No security degradation

### Operational

- **Ease of Updates**: Similar (AWS CLI or Console))
- **Terraform Support**: Both fully supported
- **Backup/Recovery**: Parameter Store lacks versioning (minor downside))
- **Conclusion**: Slightly less convenient, but acceptable for cost savings

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 1. Create Parallel Parameter Store | 1-2 hours | None |
| 2. Implement Dual-Read Code | 2-3 hours | Phase 1 complete |
| 3. Manual Parameter Population | 30 mins | Phases 1-2 complete |
| 4. Test Parameter Store Path | 1-2 hours | Phase 3 complete |
| 5. Update Documentation | 1 hour | Phase 4 validated |
| 6. Remove Secrets Manager | 1 hour | Phase 5 complete |
| 7. Delete Secrets Manager Secret | 5 mins | Phase 6 validated |
| 8. Final Cleanup | 30 mins | Phase 7 complete |

**Total Estimated Time**: 7-10 hours over 2-3 sessions

**Recommended Schedule**::

- **Session 1** (3-4 hours): Phases 1-2, commit infrastructure + dual-read code
- **Session 2** (2-3 hours): Phases 3-4, populate + test, commit successful cutoverr
- **Session 3** (2-3 hours): Phases 5-8, documentation + cleanup, final commits

---

## References

- AWS Parameter Store Pricing: <https://aws.amazon.com/systems-manager/pricing//>
- AWS Secrets Manager Pricing: <https://aws.amazon.com/secrets-manager/pricing/>
- Parameter Store vs Secrets Manager: <https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-about-examples.htmll>
- SecureString Parameters: <https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-securestring.html>
- Recent Success: Parameter Store token cache implementation (commit 99065c8)
