# GitHub Copilot Development Instructions

This document contains key learnings and common mistakes to avoid when working on MomsRecipeBox. These instructions help prevent recurring issues and improve development efficiency.

## 🎯 **FUNDAMENTAL PRINCIPLE: DATA FIXES OVER CODE COMPLEXITY**

**⚠️ CRITICAL MANDATE: Always consider simple data fixes rather than complex code fixes!**

When encountering data inconsistency or mixed format issues:

1. **✅ FIRST**: Can I fix the data to be consistent? (Update database records, standardize S3 files, etc.)
2. **❌ AVOID**: Writing complex code to handle multiple inconsistent formats

**Example from Image Standardization:**

- **❌ WRONG**: Complex frontend logic to handle `.png`, `.webp`, `.jpg`, and API URLs with fallbacks  
- **✅ RIGHT**: Convert all S3 images to `.jpg` and standardize all database URLs to direct S3 format
- **Result**: Simple frontend code assumes one format, no fallback complexity needed

**Keep It Simple, Stupid (KISS) Principle:**

- Fix the minority format to match the majority
- Standardize data at the source rather than accommodate chaos in code
- One format, one pattern, one simple solution

## 🏗️ **SIMPLIFIED CLOUD-ONLY ARCHITECTURE**

**🎯 CRITICAL CONTEXT: This application has been SIMPLIFIED to use ONLY cloud-only architecture!**

- **✅ CURRENT**: AWS Lambda + Atlas MongoDB via AWS Secrets Manager
- **❌ ELIMINATED**: Docker containers, local MongoDB, profile switching, multi-mode complexity
- **✅ SIMPLIFIED COMMANDS**: `npm run dev`, `npm run test`, `npm run deploy`

### **Simplified Development Commands**

```bash
# Core development workflow (SIMPLIFIED!)
npm run dev              # Start UI development server
npm run test             # Run tests against cloud API (100% pass rate)
npm run deploy           # Deploy to AWS Lambda + S3

# AWS profile management
npm run aws:mrb-api      # Set AWS profile for development/testing
npm run aws:status       # Check current AWS profile

# Individual test suites (all run against cloud)
npm run test:recipes     # Recipe CRUD operations
npm run test:shopping    # Shopping list features
npm run test:favorites   # Favorites functionality
npm run test:comments    # Comments system
npm run test:images      # Image upload/management
npm run test:ai-providers # AI service connectivity
npm run test:lambda      # Lambda function health
npm run test:ai-lambda   # AI Lambda integration

# Data management
npm run data:add         # Add test recipes and shopping items
npm run data:add:recipe  # Add test recipe only
npm run data:add:shopping # Add test shopping items only
npm run db:query         # Query Atlas database for analysis
```

**❌ REMOVED COMMANDS** (No longer exist):

- ~~`npm run profile:*`~~ (Profile switching eliminated)
- ~~`npm run restart`~~ (No more Docker containers)
- ~~`npm run rebuild:*`~~ (No more containers to rebuild)
- ~~`cd app/tests && npm run test:express/atlas/lambda`~~ (All tests are cloud-only now)

### **Updated Architecture Flow**

**Development Mode:**

```text
UI Dev Server (localhost:5173) → AWS Lambda API (cloud) → Atlas MongoDB
```

**Testing Mode:**

```text
Test Suite → AWS Lambda API (cloud) → Atlas MongoDB
```

**Production Mode:**

```text
CloudFront S3 UI → AWS Lambda API → Atlas MongoDB
```

**Key Simplifications**:

- **No Docker containers**: Eliminated Docker, docker-compose, container management
- **No local databases**: Atlas MongoDB exclusively via AWS Secrets Manager
- **No profile switching**: Single cloud configuration
- **No mode detection**: Always cloud-only

## 🚨 Critical Mistakes to Avoid

### 1. NEVER Hardcode Production Credentials (SECURITY CRITICAL)

**❌ ABSOLUTELY FORBIDDEN**: Hardcoding any production domains, credentials, or secrets in code
**✅ MANDATORY**: Always use proper configuration management and throw errors on malformed settings

**Security Violation Example (NEVER DO THIS)**:

```javascript
// ❌ SECURITY VIOLATION - NEVER hardcode production domains!
if (!auth0Domain || auth0Domain === '$' || auth0Domain.includes('${')) {
  auth0Domain = 'moms-recipe-box.us.auth0.com'; // FORBIDDEN!
}
```

**Correct Security Pattern**:

```javascript
// ✅ SECURE - Throw error on malformed configuration
if (!auth0Domain || auth0Domain === '$' || auth0Domain.includes('${')) {
  throw new Error(`Invalid AUTH0_DOMAIN configuration: ${auth0Domain}. Check AWS Secrets Manager.`);
}
```

**CRITICAL SECURITY RULES**:

- **NEVER hardcode domains**: Even for "temporary" fixes or debugging
- **NEVER hardcode API keys**: Use AWS Secrets Manager or environment variables  
- **NEVER hardcode passwords**: All credentials must be externally managed
- **ALWAYS fail securely**: Throw errors instead of using fallback credentials
- **ASSUME PUBLIC REPOSITORIES**: All code may become public - never embed secrets

**Security Violation Consequences**:

- **Immediate security risk**: Hardcoded credentials expose production systems
- **Repository contamination**: Secrets remain in Git history even after removal
- **Compliance violations**: Violates security policies and best practices
- **Attack surface expansion**: Gives attackers direct access paths

**Proper Configuration Management**:

- **AWS Secrets Manager**: For production credentials and sensitive configuration
- **Environment variables**: For development and testing configuration  
- **Configuration validation**: Always validate settings and fail safely on invalid values
- **Error logging**: Log configuration issues without exposing sensitive values

### 1b. PowerShell AWS Profile Limitations (RESOLVED)

**❌ MISTAKE**: Expecting Node.js scripts to set PowerShell parent process environment variables
**✅ CORRECT**: Set AWS profiles internally within Node.js script processes

**Breaking PowerShell Environment Pattern**:

```javascript
// ❌ This doesn't work - can't modify parent PowerShell process
process.env.AWS_PROFILE = 'mrb-api';
// User runs: aws sts get-caller-identity
// Still uses old profile from PowerShell environment!
```

**Working Internal Process Pattern**:

```javascript
// ✅ Set profile for current Node.js process only
process.env.AWS_PROFILE = 'mrb-api';
console.log('🔧 AWS Profile automatically set to: mrb-api');
// All AWS SDK calls within this script use mrb-api
```

**Root Cause**: Node.js child processes cannot modify their parent PowerShell session's environment variables. PowerShell environment persists independently.

**Solution Implemented**: All deployment and maintenance scripts now automatically set their required AWS profile at startup, eliminating need for manual profile switching.

### 2. Production Authentication Patterns (CLOUD-ONLY)

**❌ MISTAKE**: Using demo query parameters in production authentication
**✅ CORRECT**: Always use proper JWT tokens for all API calls (cloud-only architecture requires this)

**Breaking Pattern**:

```javascript
// ❌ Demo pattern that bypasses authentication
const url = `/recipes?user_id=demo-user`;
fetch(url); // Will get 401 in cloud-only architecture
```

**Correct Cloud-Only Pattern**:

```javascript
// ✅ Cloud-only pattern with JWT authentication
const url = `/recipes`; // No query parameters
fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`, // JWT from Auth0
    'Content-Type': 'application/json'
  }
}); // AWS Lambda + API Gateway validates JWT
```

**Critical Context**: Our simplified cloud-only architecture REQUIRES proper authentication. All endpoints go through AWS Lambda with Auth0 JWT validation.

**❌ MISTAKE**: Using mixed authentication patterns
**✅ CORRECT**: Use consistent JWT authentication throughout (simplified architecture)

**Breaking Mixed Pattern**:

```javascript
// ❌ Frontend using JWT but backend expecting query parameters
// Frontend (api.ts)
const data = await apiClient.get('/shopping-list'); // Uses JWT

// Backend (handler)
const user_id = event.queryStringParameters?.user_id; // Expects query param!
// Result: Backend gets null user_id, returns 400/401 error
```

**Correct Unified Pattern**:

```javascript
// ✅ Frontend using JWT
const data = await apiClient.get('/shopping-list'); // JWT in Authorization header

// ✅ Backend using JWT context
const user_id = event.requestContext?.authorizer?.principalId; // From JWT
// Result: User ID extracted from validated JWT token
```

**Critical Implementation Rules**:

- **Frontend**: ALWAYS use `apiClient.get/post/put/delete()` for authenticated API calls
- **Backend**: ALWAYS extract user ID from `event.requestContext.authorizer.principalId` in Lambda handlers
- **Never mix patterns**: If frontend sends JWT, backend must read JWT context (not query params)
- **Auth0 Configuration**: Must include `offline_access` scope and `useRefreshTokens: true` for production

### 2. AWS Lambda and Environment Detection

**❌ MISTAKE**: Assuming multiple environment modes exist
**✅ CORRECT**: Our simplified architecture uses ONLY cloud mode (AWS Lambda + Atlas MongoDB)

**Removed Complexity**:

- ~~Docker containers and profiles~~ (ELIMINATED)
- ~~Multi-mode environment detection~~ (ELIMINATED)
- ~~Local MongoDB installations~~ (ELIMINATED)
- ~~Express mode and container restarts~~ (ELIMINATED)

**Current Cloud-Only Pattern**:

```javascript
// ✅ Simplified environment detection (cloud-only)
async function getBaseUrl() {
  // Always use AWS Secrets Manager for dynamic endpoint resolution
  const config = await getAwsConfig();
  return config.LAMBDA_APP_URL; // From AWS Secrets Manager
}
```

**Critical Simplifications**:

- **Single Environment**: Always cloud (AWS Lambda + Atlas MongoDB)
- **AWS Secrets Manager**: All configuration dynamically retrieved
- **No Local Dependencies**: No Docker, local MongoDB, or containers
- **Consistent Testing**: All tests run against same cloud infrastructure as production

### 3. Simplified Testing Architecture (Cloud-Only)

**❌ MISTAKE**: Looking for complex multi-mode testing
**✅ CORRECT**: Our simplified architecture uses unified cloud-only testing with 100% pass rate

**Critical Testing Patterns**:

```bash
# ✅ Simplified testing commands
npm run test             # Complete test suite against cloud API
npm run test:recipes     # Individual test suites (all cloud-based)
```

**Cloud-Only Test Benefits**:

- **100% Pass Rate**: All 6 test suites passing consistently
- **True Dev/Prod Parity**: Tests run against same AWS infrastructure as production  
- **No Environment Variables**: AWS Secrets Manager handles all configuration
- **Fast Feedback**: Cached JWT tokens and direct cloud API testing

### 3. Lambda Secrets Management and AI Integration

**❌ MISTAKE**: Not loading AI API keys from AWS Secrets Manager at Lambda cold start
**✅ CORRECT**: Initialize all secrets into process.env at Lambda cold start, before any handlers run

**Critical Pattern for Lambda Secrets**:

```javascript
// ❌ WRONG - Only fetching MongoDB URI
async function initializeDatabase() {
  const mongoUri = await fetchMongoUriFromSecretsManager();
  // AI providers won't find their API keys!
}

// ✅ CORRECT - Load ALL secrets at cold start
async function initializeSecrets() {
  const secrets = await fetchSecretsFromAWS();
  // Load into process.env so all providers can find them
  process.env.OPENAI_API_KEY = secrets.OPENAI_API_KEY;
  process.env.ANTHROPIC_API_KEY = secrets.ANTHROPIC_API_KEY;
  process.env.GROQ_API_KEY = secrets.GROQ_API_KEY;
  process.env.GOOGLE_API_KEY = secrets.GOOGLE_API_KEY;
  process.env.DEEPSEEK_API_KEY = secrets.DEEPSEEK_API_KEY;
}

// Call BEFORE initializing database or handling requests
await initializeSecrets();
```

**Why This Matters**:

- **AI providers check process.env**: All provider classes check for API keys in environment variables
- **Cold start only**: Secrets loaded once per container lifetime, cached in process.env
- **No per-request overhead**: Environment variables available for entire Lambda execution context
- **Works with existing code**: No changes needed to provider classes or handlers

**AI Provider Architecture**:

```javascript
// How AI providers detect availability
class OpenAIProvider {
  isAvailable() {
    // Checks process.env - MUST be set at cold start!
    return process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY.startsWith('sk-');
  }
}

// AIProviderFactory auto-detects available providers
const providers = AIProviderFactory.getAvailableProviders();
// Returns: ['google', 'openai', 'groq', 'anthropic', 'deepseek']
```

**Secrets Manager Integration Pattern**:

```javascript
// Create utility: app/utils/secrets_manager.js
export async function initializeSecretsToEnv() {
  if (secretsInitialized) return; // Only once per container

  const secrets = await fetchSecrets();

  // Load all secrets into process.env
  for (const key of SECRET_KEYS) {
    if (secrets[key] && !process.env[key]) {
      process.env[key] = secrets[key];
    }
  }

  secretsInitialized = true;
}

// In lambda.js - call at cold start
async function initializeSecrets() {
  await initializeSecretsToEnv();
}

async function initializeDatabase() {
  await initializeSecrets(); // BEFORE database connection
  // Now MongoDB URI and AI keys are all in process.env
}
```

**Testing AI Integration**:

```bash
# Verify all providers are available
curl -H "Authorization: Bearer $TOKEN" \
  https://api-gateway-url/dev/ai/providers

# Should return all 5 providers as "available"
```

### 4. UI Styling and AI Categorization Patterns

**❌ MISTAKE**: Relying solely on CSS classes for critical UI element visibility
**✅ CORRECT**: Use inline styles with `!important` modifiers for elements that must always be visible

**Breaking CSS Dependency Pattern**:

```tsx
// ❌ Can be overridden by conflicting CSS
<button className="bg-white text-blue-600 border-blue-300">
  Button Text
</button>
```

**Bulletproof Styling Pattern**:

```tsx
// ✅ Guaranteed visibility with inline styles + CSS classes
<button 
  className={`bg-white text-blue-600 border-2 border-blue-300 ${activeClass}`}
  style={{
    backgroundColor: '#ffffff !important',
    color: '#2563eb !important',
    border: '2px solid #93c5fd'
  }}
>
  Button Text
</button>
```

**❌ MISTAKE**: Automatic AI categorization triggering on data load
**✅ CORRECT**: Implement on-demand AI categorization only when users request it

**Breaking Auto-Trigger Pattern**:

```tsx
// ❌ Triggers AI categorization automatically
useEffect(() => {
  if (items.length > 0) {
    categorizeWithAI(); // Runs on every data load!
  }
}, [items]);
```

**On-Demand Categorization Pattern**:

```tsx
// ✅ Manual categorization only when requested
const categorizeWithAI = async () => {
  // Only categorize when user explicitly requests it
  if (aiCategorized && Object.keys(aiCategorizations).length > 0) {
    return; // Skip if already categorized
  }
  // ... categorization logic
};

// Called only from button click
<button onClick={() => {
  setViewMode('category');
  categorizeWithAI(); // Explicit user action only
}}>
```

**❌ MISTAKE**: Verbose, ingredient-specific AI prompts
**✅ CORRECT**: Use concise, general prompts for faster and more accurate AI responses

**Verbose AI Prompt (Avoid)**:

```javascript
// ❌ Long, specific instructions
const prompt = `
Categorize these ingredients by grocery store aisle/section to make shopping more efficient. 

Group items based on where they're ACTUALLY located in real grocery stores, not by what they're made from.

Important location guidelines:
- Mayonnaise, ketchup, mustard, soy sauce, fish sauce = "Spices & Condiments" aisle
- Milk, cheese, butter, yogurt, eggs = "Dairy & Eggs" section  
- Fresh herbs, vegetables, fruits, lemons = "Produce" section
- Raw meat, chicken, fish, seafood = "Meat & Seafood" section
...
`;
```

**Concise AI Prompt (Best Practice)**:

```javascript
// ✅ Short, effective prompt
const prompt = `
Categorize these ingredients by grocery store aisle/section for efficient shopping.

Group items by where they're ACTUALLY located in real grocery stores.
Use clear aisle names like: Produce, Dairy & Eggs, Meat & Seafood, Spices & Condiments, Bakery, Frozen Foods, Canned Goods.

Return JSON with EXACT ingredient strings as keys and aisle names as values.
`;
```

### 5. Shopping List Add Item UX Patterns

**❌ MISTAKE**: Multi-step add item process with separate forms and confusing UI flows
**✅ CORRECT**: Single-step add functionality with unified search/add interface

**Breaking Multi-Step Pattern**:

```tsx
// ❌ Confusing two-step process
const [showAddItemForm, setShowAddItemForm] = useState(false);
const [newItemText, setNewItemText] = useState('');

<button onClick={() => setShowAddItemForm(true)}>Add Item</button>
{showAddItemForm && (
  <input 
    value={newItemText}
    onChange={(e) => setNewItemText(e.target.value)}
    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
  />
)}
```

**Single-Step Add Pattern**:

```tsx
// ✅ Unified search/add interface
<input
  placeholder="Type to search or add item..."
  value={searchText}
  onChange={(e) => setSearchText(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && searchText.trim()) {
      handleAddItemFromSearch();
    }
  }}
/>
<button 
  onClick={handleAddItemFromSearch}
  disabled={!searchText.trim()}
>
  Add
</button>

const handleAddItemFromSearch = async () => {
  await addItems([{
    name: searchText.trim(),
    recipeId: undefined,
    recipeTitle: 'Custom Item',
    checked: false
  }]);
  setSearchText(''); // Clear after adding
  showToast(`Added "${searchText.trim()}" to shopping list`, ToastType.Success);
};
```

**Key UX Principles**:

- **One Action = One Result**: Type item → press Enter/click Add → item added
- **Clear Visual Hierarchy**: Search and add functionality clearly separated from other controls
- **Immediate Feedback**: Success toast, input clearing, disabled states
- **Keyboard Navigation**: Enter key support for power users

### 6. Authentication Timing & Race Condition Patterns

**❌ MISTAKE**: Making API calls before Auth0 authentication is fully ready (causes 401 errors on hard refresh)
**✅ CORRECT**: Wait for authentication completion before API calls with proper timing controls

**Breaking Race Condition Pattern**:

```tsx
// ❌ API call happens immediately, before token is set
useEffect(() => {
  loadShoppingList(); // 401 Unauthorized on hard refresh
}, []);
```

**Proper Authentication Timing Pattern**:

```tsx
// ✅ Wait for Auth0 authentication to complete
const { isAuthenticated, isLoading: authLoading } = useAuth0();

const useShoppingList = (isAuthenticated?: boolean, authLoading?: boolean) => {
  useEffect(() => {
    if (typeof isAuthenticated !== 'undefined' && typeof authLoading !== 'undefined') {
      if (!authLoading && isAuthenticated) {
        // Small delay ensures API client token is properly set
        const timer = setTimeout(() => {
          loadShoppingList();
        }, 100);
        return () => clearTimeout(timer);
      }
    } else {
      // Legacy behavior for non-auth components
      loadShoppingList();
    }
  }, [loadShoppingList, isAuthenticated, authLoading]);
};
```

**Production Console Cleanup Pattern**:

```tsx
// ❌ Debug logging clutters production console
console.log('🔍 Current user set:', { userId: user.sub, email: user.email });
console.log('🔐 Token received from Auth0:', token);
console.log('🌐 API URL configuration:', { environment, selectedUrl });

// ✅ Clean production code - remove debug logs
// Only keep essential error logging
if (error) {
  console.error('❌ Failed to get Auth0 token:', error);
}
```

**Authentication Integration Best Practices**:

- **100ms Delay**: Ensures Auth0 token setup completes before API calls
- **Stable Dependencies**: Use primitive values (isAuthenticated, authLoading) not objects to prevent infinite loops
- **Conditional Loading**: Only make API calls when `!authLoading && isAuthenticated`
- **Legacy Support**: Maintain backward compatibility for components without auth state
- **Clean Console**: Remove all debug logging in production builds

**Critical UI Development Rules**:

- **Button Visibility**: Use both Tailwind classes AND inline styles for critical buttons
- **AI Performance**: Never auto-trigger expensive AI operations - always user-initiated
- **Prompt Optimization**: Keep AI prompts short and general for better performance
- **State Management**: Prevent re-categorization if AI results already exist
- **User Feedback**: Show loading states during AI operations with clear button text changes

### 5. API Gateway Architecture Patterns

**❌ MISTAKE**: Creating individual API Gateway resources for every endpoint
**✅ CORRECT**: Use proxy resource pattern for Lambda integration

**Bloated Approach (Don't Do This)**:

```terraform
# ❌ Creates 100+ Terraform resources for ~15 endpoints
resource "aws_api_gateway_resource" "recipes" { path_part = "recipes" }
resource "aws_api_gateway_resource" "recipes_id" { path_part = "{id}" }
resource "aws_api_gateway_method" "recipes_get" { http_method = "GET" }
resource "aws_api_gateway_method" "recipes_post" { http_method = "POST" }
resource "aws_api_gateway_integration" "recipes_get" { ... }
resource "aws_api_gateway_integration" "recipes_post" { ... }
# ... repeat for every endpoint, every method, OPTIONS for CORS ...
# Result: 1322 lines, 100+ resources, slow deployments
```

**Proxy Pattern (Correct Approach)**:

```terraform
# ✅ Single proxy resource handles all routes
resource "aws_api_gateway_resource" "proxy" {
  path_part = "{proxy+}"  # Catch-all pattern
}

resource "aws_api_gateway_method" "proxy_any" {
  http_method   = "ANY"  # All HTTP methods
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.auth0_jwt.id
}

resource "aws_api_gateway_integration" "proxy_lambda" {
  type = "AWS_PROXY"  # Lambda handles all routing
  uri  = aws_lambda_function.app_lambda.invoke_arn
}

# Result: ~460 lines, ~20 resources, fast deployments
```

**Benefits of Proxy Pattern**:

- **65% less Terraform code**: 1322 lines → 460 lines
- **Faster deployments**: Less Terraform state to manage
- **No Terraform changes for new routes**: Lambda routing handles everything
- **Simpler dependencies**: 2 integrations vs 20+ in deployment
- **Standard AWS pattern**: Recommended approach for Lambda APIs

**When Adding New Endpoints**:

```javascript
// ❌ OLD: Required Terraform changes for each new route
// 1. Add aws_api_gateway_resource
// 2. Add aws_api_gateway_method
// 3. Add aws_api_gateway_integration
// 4. Add OPTIONS method for CORS
// 5. terraform apply

// ✅ NEW: Just add Lambda handler code
export async function handler(event) {
  const path = event.path;

  // New route - no Terraform changes needed!
  if (path === '/new-endpoint') {
    return handleNewEndpoint(event);
  }
}
```

**Proxy Resource Configuration**:

- **Path**: `/{proxy+}` catches all routes under API Gateway stage
- **Methods**: Use `ANY` method to handle GET, POST, PUT, DELETE, OPTIONS
- **Authorization**: Apply JWT authorizer at proxy level (inherited by all routes)
- **CORS**: Configure OPTIONS method with MOCK integration for preflight
- **Error Handling**: Use Gateway Responses for 4XX/5XX errors with CORS headers

### 6. Lambda and MongoDB Atlas Integration

**❌ MISTAKE**: Calling async functions without `await`
**✅ CORRECT**: Always await async functions that return Promises

**Critical Pattern**:

```javascript
// ❌ WRONG - Missing await on async function
const uri = getMongoConnectionString();  // Returns Promise, not string!

// ✅ CORRECT - Properly awaiting async function
const uri = await getMongoConnectionString();
```

**Root Cause**: When `getMongoConnectionString()` was changed from synchronous to async (to fetch from Secrets Manager), the calling code wasn't updated with `await`. This caused the function to return a Promise object instead of the connection string, leading to MongoDB connection failures.

**❌ MISTAKE**: Storing MongoDB Atlas credentials in Lambda environment variables
**✅ CORRECT**: Fetch MongoDB Atlas URI from AWS Secrets Manager at runtime

**Why This Matters**:

- Terraform only has access to local MongoDB passwords, not Atlas passwords
- Atlas passwords stored securely in AWS Secrets Manager
- Lambda must fetch credentials at runtime using AWS SDK
- Environment variables would contain wrong/stale passwords

**Lambda MongoDB Connection Pattern**:

```javascript
// Fetch from Secrets Manager (Lambda only)
if (process.env.APP_MODE === 'lambda') {
  const client = new SecretsManagerClient({ region: 'us-west-2' });
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  const secrets = JSON.parse(response.SecretString);
  return secrets.MONGODB_ATLAS_URI;
}
```

**❌ MISTAKE**: Using default MongoDB timeout settings in Lambda
**✅ CORRECT**: Configure connection timeouts appropriate for Lambda cold starts

**Required Connection Options**:

```javascript
const connectionOptions = {
  serverSelectionTimeoutMS: 10000,  // 10 seconds for server selection
  connectTimeoutMS: 10000,           // 10 seconds for initial connection
  socketTimeoutMS: 45000,            // 45 seconds for operations
};
const client = new MongoClient(uri, connectionOptions);
```

**Lambda Timeout Considerations**:

- Secrets Manager fetch: ~1-2 seconds
- MongoDB Atlas connection: ~2-5 seconds
- Lambda timeout should be 30+ seconds for cold starts
- Warm starts connect much faster (cached connection)

### 7. AWS Profile Management (Fully Automated)

**❌ MISTAKE**: Manual AWS profile switching before running scripts
**✅ CORRECT**: All Node.js scripts now automatically set their required AWS profile internally

**✅ AUTOMATED PROFILE SYSTEM**: Scripts automatically set correct AWS profiles at startup:

- **Application Scripts**: Automatically use `mrb-api` profile (backup, deploy, test, data scripts)
- **Infrastructure Scripts**: Automatically use `terraform-mrb` profile (IAM setup, Terraform operations)
- **Visual Feedback**: All scripts show "🔧 AWS Profile automatically set to: {profile-name}"
- **PowerShell Compatible**: Works within PowerShell environment limitations by setting internal process.env

**✅ SCRIPTS WITH AUTOMATIC PROFILE SETTING**:

```javascript
// Pattern used in all deployment/maintenance scripts
process.env.AWS_PROFILE = 'mrb-api';
console.log('🔧 AWS Profile automatically set to: mrb-api');
```

**Scripts Updated:**

- `scripts/backup-mongodb.js`, `scripts/restore-mongodb.js` → `mrb-api`
- `scripts/deploy-lambda.js`, `scripts/deploy-ui.js` → `mrb-api`
- `scripts/test-lambda.js`, `scripts/test-ai-lambda.js` → `mrb-api`
- `scripts/find-orphan-images.js`, `scripts/query_atlas.js` → `mrb-api`
- `scripts/setup-iam-policy.js` → `terraform-mrb`
- `app/convert-images-to-jpeg.js` → `mrb-api`

**Critical Commands (No Manual Profile Setup Needed)**:

```bash
# ✅ CORRECT - scripts handle profiles automatically
npm run deploy           # Auto-sets mrb-api profile
npm run backup           # Auto-sets mrb-api profile
npm run restore:latest   # Auto-sets mrb-api profile
npm run test:lambda      # Auto-sets mrb-api profile
```

**PowerShell Limitation Resolved**: Previous PowerShell parent process limitation prevented Node.js scripts from setting `$env:AWS_PROFILE` for the shell. New approach sets `process.env.AWS_PROFILE` within each script's execution context, eliminating need for manual profile switching.

### 8. PowerShell vs Cross-Platform Compatibility

**❌ MISTAKE**: Using PowerShell commands in npm scripts that should be cross-platform
**✅ CORRECT**:

- **In npm scripts**: Use Node.js cross-platform approaches
- **In terminal commands**: Use proper PowerShell syntax for user's environment
- **Example**: Replace `curl` with Node.js `http.request()` in rebuild scripts

**❌ MISTAKE**: Using bash syntax in Windows PowerShell terminal commands
**✅ CORRECT**: Use PowerShell-compatible command chaining

```bash
# ❌ WRONG - bash syntax
cd ui && npm run dev

# ✅ CORRECT - PowerShell syntax  
cd ui; npm run dev
```

**Key Rule**: When user's shell is PowerShell, use `;` for command chaining, not `&&`

### 9. Terminal Management & AWS Profile Context

**❌ MISTAKE**: Not understanding terminal context when running commands
**✅ CORRECT**: Always be aware of current working directory and AWS profile

**Critical Terminal Rules**:

- **New terminals**: Always start in project root directory
- **Existing terminals**: Stay in whatever directory you were in previously
- **New terminals**: AWS profile defaults to `cruise-finder` user
- **AWS operations**: MUST switch to correct profile before any AWS commands

**Terminal Context Pattern**:

```bash
# ❌ WRONG - assuming terminal context
npm run deploy:lambda  # Fails if wrong profile or wrong directory

# ✅ CORRECT - verify context first
pwd                    # Check current directory
npm run aws:status     # Check current AWS profile
npm run aws:mrb-api    # Switch to correct profile for deployment
npm run deploy:lambda  # Now safe to deploy
```

**AWS Profile Management Rules**:

- **New terminal = cruise-finder profile**: Always switch before AWS operations
- **Infrastructure operations** (terraform): Switch to `terraform-mrb` profile first
- **Application operations** (ECR push, Lambda deploy): Switch to `mrb-api` profile first
- **PowerShell Environment Variable**: Node.js scripts can't set PowerShell env vars - must set manually
- **Always verify**: Use `npm run aws:status` to confirm correct profile

**Critical PowerShell AWS Profile Pattern**:

```bash
# ❌ WRONG - Node.js script sets only its own process env
npm run aws:mrb-api
aws sts get-caller-identity  # Still uses cruise-finder!

# ✅ CORRECT - Must manually set PowerShell environment variable
npm run aws:mrb-api          # Shows which profile to use
$env:AWS_PROFILE="mrb-api"   # Actually set it in PowerShell
aws sts get-caller-identity  # Now uses mrb-api correctly
```

**Why this happens**: Node.js processes can only modify their own environment variables, not the parent PowerShell session. The `npm run aws:mrb-api` script tells you what to set, but you must manually run `$env:AWS_PROFILE="profile-name"` for AWS CLI commands to work correctly.

## 🧪 Simplified Cloud-Only Testing Architecture

### 1. Environment Detection (Cloud-Only)

**❌ MISTAKE**: Looking for complex multi-mode environment detection
**✅ CORRECT**: Our simplified architecture uses cloud-only environment detection

**Simplified Environment Detection Pattern**:

```javascript
// ✅ Cloud-only environment detection
async function getBaseUrl() {
  // Always use AWS Secrets Manager for endpoint resolution
  const config = await getAwsConfig();
  return config.LAMBDA_APP_URL; // Dynamic cloud endpoint
}
```

**Critical Implementation Rules**:

- **Cloud-Only Detection**: Always uses AWS Lambda + Atlas MongoDB via Secrets Manager
- **Dynamic Endpoint Resolution**: Retrieves API Gateway URL from AWS Secrets Manager
- **No Local Modes**: Eliminated express/local/docker environment complexity
- **Consistent Testing**: All tests run against same cloud infrastructure

### 2. Simplified Test File Structure

**❌ MISTAKE**: Not awaiting async URL construction in test files
**✅ CORRECT**: Always await dynamic URL construction with simplified cloud detection

**Correct Cloud-Only Test Pattern**:

```javascript
// ✅ Simplified async URL construction
import { getBaseUrl } from './utils/environment-detector.js';

async function runTests() {
  const BASE_URL = await getBaseUrl(); // Cloud endpoint from AWS Secrets
  const response = await fetch(`${BASE_URL}/recipes`); // Always cloud API
}
```

**Critical Test File Patterns**:

- **Single Environment**: All tests use cloud-only environment detection
- **AWS Secrets Integration**: URLs dynamically retrieved from AWS Secrets Manager
- **JWT Authentication**: All tests use Auth0 JWT tokens for cloud API access
- **Consistent Results**: Same cloud APIs used across all test runs

### 3. Comment Handler Parameter Extraction

**❌ MISTAKE**: Mismatched parameter extraction between path parameters and query parameters
**✅ CORRECT**: Use consistent parameter extraction patterns for comment CRUD operations

**Breaking Parameter Mismatch**:

```javascript
// ❌ Handler expects query parameter but receives path parameter
// API Gateway config: /comments/{comment_id}
// Handler code:
const comment_id = event.queryStringParameters?.comment_id; // Wrong source!
```

**Correct Parameter Extraction**:

```javascript
// ✅ Match parameter source to API Gateway configuration
// API Gateway config: /comments/{comment_id}
// Handler code:
const comment_id = event.pathParameters?.comment_id; // Correct source
```

**Parameter Source Rules**:

- **Path Parameters**: Use `event.pathParameters?.param_name` for route variables like `{comment_id}`
- **Query Parameters**: Use `event.queryStringParameters?.param_name` for URL query strings like `?user_id=123`
- **Request Body**: Use `JSON.parse(event.body)` for POST/PUT payload data
- **Consistent Patterns**: All CRUD handlers for same resource should use same parameter extraction pattern

### 4. Test Infrastructure Configuration Management

**❌ MISTAKE**: Conflicting environment variables causing test environment confusion
**✅ CORRECT**: Establish clear environment variable precedence and hierarchy

**Breaking Configuration Conflict**:

```javascript
// ❌ Conflicting environment variables
// .env file: APP_MODE=express
// app/tests/.env file: APP_BASE_URL=http://localhost:3000
// test-wrapper script: Sets APP_MODE=lambda
// Result: Environment detection confusion and hardcoded localhost usage
```

**Correct Configuration Hierarchy**:

```javascript
// ✅ Clean environment variable precedence
// .env file: APP_MODE=lambda (default cloud testing)
// app/tests/.env file: Only test-specific variables, no conflicting base URLs
// test-wrapper script: Passes APP_MODE=lambda explicitly
// environment-detector.js: Uses AWS Secrets Manager for dynamic resolution
```

**Configuration Management Rules**:

- **Test Mode Default**: Use `APP_MODE=lambda` as default for testing to ensure cloud infrastructure validation
- **Remove Hardcoded URLs**: Remove `APP_BASE_URL=http://localhost:3000` from test configuration files
- **Environment Variable Precedence**: Test wrapper > .env files > defaults
- **AWS Profile Integration**: Auto-detect Lambda mode when `AWS_PROFILE=mrb-api` is set

## 🚨 IAM Policy Management Rules

**❌ CRITICAL MISTAKE**: Attempting to modify AWS IAM policies or permissions without explicit user approval
**✅ STRICT RULE**:

- **NEVER attempt to modify IAM policies directly via AWS CLI or API calls**
- **NEVER run commands like**: `aws iam put-user-policy`, `aws iam attach-user-policy`, `terraform apply` for IAM changes
- **ALWAYS ask for explicit permission first** with clear justification

### When IAM Changes Are Actually Needed

**Required Justification Pattern**:

1. **Clear error message**: Show the exact AWS error indicating missing permissions
2. **Specific permission needed**: Identify the exact IAM action required (e.g., `lambda:UpdateFunctionConfiguration`)
3. **Target user/role**: Specify exactly which IAM user/role needs the permission (e.g., `mrb-api` user)
4. **Business justification**: Explain why this permission is needed for the current task
5. **Security impact**: Acknowledge what access this grants

**Example Proper Request**:

> "❌ ERROR: `User: arn:aws:iam::123:user/mrb-api is not authorized to perform: lambda:UpdateFunctionConfiguration`
>
> 🎯 NEED: Add `lambda:UpdateFunctionConfiguration` permission to `mrb-api` user
>
> 📝 REASON: Required to disable startup health checks for Lambda initialization timeout fix
>
> 🔒 IMPACT: Grants ability to modify Lambda function configuration (timeout, memory, environment variables)
>
> 📍 FILE: Updated policy draft in `docs/iam-policy-mrb-api-additional.json`
>
> ❓ **May I apply this IAM policy change?**"

### What TO Do Instead

1. **Document the needed change** in the appropriate policy file (usually in `docs/`)
2. **Provide clear justification** for why the permission is needed
3. **Ask explicitly** for permission to apply the change
4. **Wait for approval** before making any IAM modifications
5. **Use the correct AWS profile** (`terraform-mrb` for IAM changes, not `mrb-api`)

### IAM Policy Files to Update

- `docs/iam-policy-mrb-api-additional.json` - For mrb-api user permissions
- `infra/*.tf` - For Terraform-managed IAM resources  
- Document changes clearly with comments explaining why each permission is needed

**Operation Type Guide**:

```bash
# Infrastructure changes (terraform apply/destroy/plan)
npm run aws:terraform
cd infra; terraform plan

# Application deployment (ECR, Lambda, testing)
npm run aws:mrb-api
npm run deploy:lambda
npm run test:lambda
```

### 9. Development Server Management

**❌ MISTAKE**: Starting multiple Vite development servers without checking if one is already running
**✅ CORRECT**: Always check if development server is already running before starting a new one

```bash
# ❌ WRONG - blindly starting new server
cd ui; npm run dev

# ✅ CORRECT - check first, then start if needed
# Check if localhost:5173 is already serving the UI
# Vite auto-restarts on file changes, so existing server is usually sufficient
```

**Key Rules**:

- Vite development server auto-restarts on UI file changes
- Check `http://localhost:5173` availability before starting new servers
- Multiple Vite instances cause port conflicts (5173 → 5174 → 5175...)
- One development server per project is sufficient

## 🔧 Development Patterns

### 4. Docker Caching Assumptions

**❌ MISTAKE**: Assuming Docker automatically rebuilds when code changes
**✅ CORRECT**: Docker reuses cached images on restart unless explicitly told to rebuild

- Container restart ≠ Image rebuild
- Need `docker-compose build` or image deletion for actual rebuilds
- **NEW**: Unified restart system automatically handles this decision

**❌ MISTAKE**: Not verifying that new code is actually running after container operations
**✅ CORRECT**: Always implement verification systems to prove new code deployed

- **NEW**: Unified restart system includes automatic verification with build badge checking
- **Pattern**: Generate unique hash → Deploy → Verify specific hash is active

### AWS Credentials in Local Development

**❌ MISTAKE**: S3 uploads failing in local mode due to missing AWS credentials
**✅ CORRECT**: Docker containers now properly mount AWS credentials from host

```yaml
# ✅ NEW: AWS credentials properly mounted
volumes:
  - ${USERPROFILE}/.aws:/root/.aws:ro  # Windows host
environment:
  - AWS_PROFILE=${AWS_PROFILE}
  - HOME=/root
```

**Key Benefits**:

- **S3 image uploads work in local mode**: No more credential errors
- **Profile-aware**: Uses your active AWS profile in containers
- **Secure**: Read-only mount of credentials directory

## 🔧 Development Patterns

### Unified Restart System Patterns

**✅ BEST PRACTICE**: Always use the unified restart system

```javascript
// The unified restart system replaces all these patterns:

// ❌ OLD: Manual decision making
if (codeChanged) {
  execSync('npm run rebuild:force');
} else {
  execSync('npm run restart');
}

// ✅ NEW: Intelligent automated decision
execSync('npm run restart'); // Handles everything automatically
```

**Unified Restart Logic**:

1. **Check app status** and get current build badge
2. **Generate new badge** with unique hash
3. **Update test environment** to match current deployment profile
4. **Compare badges** to detect code changes
5. **Choose strategy**:
   - Same badges → Simple restart (Docker cached code is fine)
   - Different badges → Full rebuild + verification (code changes detected)
6. **Verify deployment** by confirming new badge is active

**Key Benefits**:

- **Zero guesswork**: System decides optimal restart strategy
- **Robust verification**: Proves new code is actually running
- **Test environment sync**: Automatically updates test .env files to match deployment mode
- **Graceful escalation**: Falls back to full rebuild when simple restart fails
- **Cross-platform**: Works identically on Windows/Mac/Linux

### Shared Test Utilities Pattern

**❌ MISTAKE**: Duplicating environment detection logic across test files
**✅ CORRECT**: Use shared utilities for consistent behavior

```javascript
// ❌ OLD: Duplicated in every test file
function getBaseUrl() {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return 'https://api-gateway-url.com/dev';
  }
  return 'http://localhost:3000';
}

// ✅ NEW: Shared utility
import { getBaseUrl, logEnvironmentInfo } from './utils/environment-detector.js';

async function runTests() {
  logEnvironmentInfo(); // Consistent environment logging
  const baseUrl = getBaseUrl(); // Consistent URL detection
  // ... test logic
}
```

**CRITICAL**: Module-level constant caching can break environment variable timing

```javascript
// ❌ DANGEROUS: Caches BASE_URL before dotenv loads
const BASE_URL = getBaseUrl(); // Cached at module load time!

export default function runTests() {
  // Uses stale cached value, ignores environment changes
  const response = await fetch(`${BASE_URL}/api`);
}

// ✅ CORRECT: Dynamic function calls ensure fresh environment access
function getBaseUrlDynamic() {
  return getBaseUrl(); // Fresh call every time
}

export default function runTests() {
  // Gets current environment value each time
  const response = await fetch(`${getBaseUrlDynamic()}/api`);
}
```

**Shared Environment Detector Benefits**:

- **Consistent URL detection** across all test files
- **Automatic mode detection** (Express vs Lambda)
- **Standardized logging** for debugging
- **Backward compatibility** with legacy environment variables
- **Single source of truth** for environment logic
- **Dynamic environment access** prevents caching issues

### Build Verification Best Practices

1. **Generate Unique Markers**: Use timestamps + hashes for each build attempt
2. **Trigger On-Demand Loading**: Always call the endpoint that loads/initializes what you're testing
3. **Wait for Processing**: Add appropriate delays for async operations
4. **Verify Results**: Check logs/responses for actual evidence of new code
5. **Use Hash-Specific Verification**: Confirm the exact expected hash is loaded, not just general functionality
6. **Handle Multiline JSON**: Use proper regex patterns for multiline build marker output
7. **Escalate When Needed**: Have fallback options (nuclear rebuild) when normal methods fail

### Docker Container Patterns

```javascript
// ✅ GOOD: Unified restart system
async function deployChanges() {
  // Just use the unified restart - it handles everything
  execSync('npm run restart');
}

// ❌ OLD: Complex manual verification
async function verifyBuild(expectedHash) {
  // 1. Trigger the endpoint that loads the marker
  await triggerBuildMarkerInitialization();
  
  // 2. Wait for processing
  await delay(1000);
  
  // 3. Check logs for actual evidence
  const logs = getLogs();
  return logs.includes(expectedHash);
}

// ✅ NEW: Built into unified restart system
// Verification happens automatically with hash-specific checking

// ❌ BAD: Checking without triggering
async function verifyBuild(expectedHash) {
  const logs = getLogs(); // Never triggered loading!
  return logs.includes(expectedHash);
}
```

**On-Demand Build Marker Loading**:

```javascript
// ✅ GOOD: Proper on-demand loading with cache bypass
async function loadCurrentBuildMarker() {
  console.log('🔧 Loading current build marker on demand...');
  try {
    // Use timestamp to force fresh import (bypass module cache)
    const buildMarker = await import(`./build-marker.js?t=${Date.now()}`);
    console.log('🏗️ Build marker loaded:', buildMarker.BUILD_INFO);
    return buildMarker.BUILD_INFO;
  } catch (e) {
    console.log('⚠️ Build marker not loaded:', e.message);
    return null;
  }
}

// ❌ BAD: One-time loading only
async function initializeBuildMarker() {
  if (buildMarkerInitialized) return; // Only loads once!
  // ... loading logic
  buildMarkerInitialized = true;
}
```

### Cross-Platform Command Patterns

```javascript
// ✅ GOOD: Node.js cross-platform HTTP request
execSync('node -e "const http = require(\'http\'); /* request code */"');

// ❌ BAD: PowerShell-specific in npm script  
execSync('powershell -Command "Invoke-WebRequest..."');

// ❌ BAD: Assuming curl exists everywhere
execSync('curl http://localhost:3000/endpoint');
```

### Test Infrastructure PowerShell Elimination

**❌ MISTAKE**: Using PowerShell commands in Node.js test scripts
**✅ CORRECT**: Use Node.js fetch API for all HTTP requests in test scripts

**Critical Pattern for Lambda Testing**:

```javascript
// ❌ BAD: PowerShell in test script
execSync('powershell -Command "Invoke-RestMethod -Uri $url -Headers @{Authorization=\\"Bearer $token\\"}"');

// ✅ GOOD: Node.js fetch API
const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Key Rules for Test Scripts**:

- **Never use PowerShell commands**: Even in Node.js files, avoid PowerShell dependencies
- **Use Node.js fetch**: For all HTTP requests in test infrastructure
- **Proper JWT authentication**: Generate real Auth0 tokens for authenticated API testing
- **Environment agnostic**: Test scripts should work on any platform without PowerShell

## 🏗️ Architecture Understanding

### Request Flow by Mode

**Local Mode (`APP_MODE=express`):**

```text
HTTP Request → Local Server → Lambda Handler Function → Response
```

**Atlas Mode (`APP_MODE=express`):**

```text
HTTP Request → Local Server → Lambda Handler Function → Atlas DB → Response
(Exception: /health* → Direct health handler)
```

**Lambda Mode (`APP_MODE=lambda`):**

```text
HTTP Request → AWS Lambda → Lambda Handler Function → Response
```

### Key Insight: Local Server as Lambda Adapter

The local server (`local_server.js`) acts as an HTTP-to-Lambda adapter:

- Converts HTTP requests to Lambda event format
- Calls Lambda handler as regular function
- Converts Lambda response back to HTTP
- **Exception**: Health endpoints bypass this for performance

## 🧪 Testing & Verification Patterns

### Build Marker Verification Steps

1. **Generate** unique build marker with timestamp + hash
2. **Deploy** code changes (restart/rebuild)
3. **Trigger** the Lambda endpoint that initializes markers (`POST /initializeBuildMarker`)
4. **Wait** for initialization to complete
5. **Verify** marker appears in Docker logs with correct hash
6. **Escalate** to nuclear rebuild if verification fails

### Common Verification Failures

- **Looking without triggering**: Checking logs without calling initialization endpoint
- **Wrong endpoint**: Using health endpoints that bypass Lambda handler
- **Timing issues**: Not waiting for async initialization to complete
- **Cache confusion**: Not understanding when Docker serves cached vs fresh code

## 📝 Documentation Principles

### Always Update These Files When Adding Features

1. **README.md** - User-facing command documentation
2. **CHANGELOG.md** - Feature announcements and breaking changes  
3. **docs/developer/npm_commands.md** - Comprehensive command reference
4. **app/docs/swagger.yaml** - API endpoint documentation (if adding endpoints)

### Critical Rule: Always Update Swagger When APIs Change

**❌ MISTAKE**: Adding/modifying API endpoints without updating Swagger documentation
**✅ CORRECT**: IMMEDIATELY update `app/docs/swagger.yaml` when any API changes are made

- New endpoints must have complete Swagger definitions
- Modified endpoints must have updated parameters/responses
- Include examples and proper status codes
- Add appropriate tags for organization

### Documentation Quality Standards

- Include **why** something exists, not just **what** it does
- Provide **examples** of common usage patterns
- Document **troubleshooting** for common issues
- Explain **when to use** different options

## 🛠️ Standard Development Commands

### Key NPM Commands for Consistent Development

Always use these standardized commands to maintain consistency:

```bash
# Application management - NEW UNIFIED SYSTEM
npm run restart           # 🚀 Unified smart restart - handles everything intelligently
npm run restart:simple    # Basic container stop/start (bypass intelligence)
npm run rebuild:force     # Nuclear option for stubborn Docker caching

# Development workflow
npm run profile:show      # Check current development profile
npm run health:detailed   # Comprehensive system status
npm test                  # Run all tests

# Container management  
npm run profile:start     # Start infrastructure for current profile
npm run profile:stop      # Stop all infrastructure
npm run logs             # View container logs
```

### Unified Restart System - ALWAYS Use This

**❌ MISTAKE**: Using old complex restart/rebuild commands
**✅ CORRECT**: Always use the new unified restart system

```bash
# ❌ OLD - Complex, multiple commands
npm run restart           # Basic restart
npm run rebuild           # Smart rebuild
npm run rebuild:force     # Nuclear rebuild  
npm run rebuild:verify    # Verification only

# ✅ NEW - Single intelligent command
npm run restart           # 🎯 ONE command does everything!
```

**How Unified Restart Works**:

1. **🔍 Detects** if app is running and gets current build badge
2. **📝 Generates** new build badge for verification  
3. **🧠 Decides** strategy:
   - **Badges same**: Simple container restart (fast)
   - **Badges different**: Full rebuild + verification (thorough)
4. **✅ Verifies** new code is actually running

**Key Benefits**:

- **No guessing** which command to use
- **Automatic Docker cache detection**
- **Full verification** that new code is deployed
- **Intelligent escalation** from fast restart to full rebuild when needed

### Unified Testing Architecture

**❌ MISTAKE**: Running different tests for different modes
**✅ CORRECT**: Use unified test architecture that works across all deployment modes

```bash
# Core business logic tests (same across all modes)
cd app/tests && npm run test:functional

# Mode-specific comprehensive testing
cd app/tests && npm run test:express     # Local development
cd app/tests && npm run test:atlas      # Atlas database
cd app/tests && npm run test:lambda     # AWS Lambda

# Individual test suites
cd app/tests && npm run test:recipes     # Recipe CRUD operations
cd app/tests && npm run test:favorites   # Favorites system
cd app/tests && npm run test:comments    # Comments system
cd app/tests && npm run test:images      # Image management
cd app/tests && npm run test:shopping    # Shopping lists
```

**Test Architecture Design**:

- **Shared Environment Detection**: All tests use `app/tests/utils/environment-detector.js`
- **Consistent URL Detection**: Automatic Express vs Lambda mode detection
- **Unified Business Logic**: Same core tests run across all deployment modes
- **Mode-Specific Integration**: Infrastructure tests adapt to deployment environment

### Post-Restart Verification Pattern

After any container restart, follow this pattern:

1. **Wait for startup**: Allow 10-15 seconds for container initialization
2. **Trigger specific API**: Call the endpoint you're testing (not random endpoints)
3. **Get appropriate log offset**: Read logs from startup (typically last 20-30 lines)
4. **Analyze behavior**: Look for initialization messages, errors, and expected responses

```bash
# Example verification pattern
npm run profile:start
# Wait 15 seconds
curl http://localhost:3000/your-specific-endpoint
docker logs momsrecipebox-app-atlas --tail 25
```

**Container startup typically produces 15-20 log lines** including:

- Secret retrieval from AWS
- Database connection
- Health check initialization  
- Server ready message

## 🎯 Key Reminders

1. **Verify your assumptions**: If something should work, write verification to prove it works
2. **Understand the architecture**: Know which mode you're in and how requests flow
3. **Test cross-platform**: Node.js solutions over shell-specific commands
4. **Think like Docker**: Cached layers vs fresh builds, images vs containers
5. **Document thoroughly**: Future developers (including yourself) will thank you
6. **Always update Swagger**: API changes require immediate documentation updates
7. **Use standard commands**: Maintain consistency with established npm scripts

## 🚀 Success Patterns

These patterns have proven reliable:

- **Smart systems**: Try efficient approach first, escalate when needed
- **Verification-driven**: Always prove the system works as expected  
- **Cross-platform first**: Use Node.js for maximum compatibility
- **Comprehensive logging**: Make debugging easy with detailed output
- **Graceful fallbacks**: Have nuclear options when subtle approaches fail

## 📋 Project Management Pattern

### Always Ask About the Jobjar

At the end of each development session, always ask:

> "Should we update the jobjar with any new tasks or ideas that came up during this work?"

The jobjar is a running list of:

- Future improvements identified during current work
- Bug fixes that aren't critical but should be tracked  
- Performance optimizations noticed but not implemented
- Documentation improvements needed
- Architecture improvements or refactoring opportunities
- New features requested or brainstormed

**Purpose**: Keep track of future work without losing focus on current objectives.

**Location**: Maintain in project documentation (e.g., `JOBJAR.md` or similar)

**When to update**:

- After completing major features
- When bugs are discovered but not immediately fixed
- When architectural improvements are identified
- After code reviews reveal opportunities
- When users suggest new features

## 🔄 Commit Preparation Workflow

### When User Says "Prepare for Commit"

Execute this comprehensive checklist **EVERY TIME**:

#### 0. Workspace Cleanup & Regression Check

**BEFORE starting documentation updates, check for uncommitted changes:**

```bash
git status
```

**Identify what needs attention:**

1. **Modified tracked files** - Review and either:
   - Include in commit if related to the work
   - Revert if they were unintended changes
   - Stash if they're work-in-progress for later

2. **Untracked files** - Categorize and handle appropriately:
   - **Temporary test/debug files** - Delete if no longer needed
   - **Useful debugging scripts** - Commit to `scripts/` with documentation
   - **Generated files** (logs, build artifacts) - Add to `.gitignore`
   - **IDE/workspace files** - Add to `.gitignore`

**Common temporary files to clean up:**

- `test-*.js` in root (debug scripts, not formal tests)
- `*-response.json`, `*-output.txt` (debugging output)
- `.claude/` or other IDE workspace directories
- Lambda test event files created for debugging

**Pattern for cleanup:**

```bash
# Review untracked files
git status

# Delete temporary files
rm test-temp-debug.js lambda-response.json

# Add useful scripts to proper location
git add scripts/useful-debug-tool.js

# Update .gitignore for generated files
echo "*.local.json" >> .gitignore
```

**Before proceeding**: Ensure `git status` shows only intentional changes that should be committed.

#### 1. Documentation Updates

**COPILOT_INSTRUCTIONS.md** - Update unless instructions are perfectly clear already:

- Add any new mistakes discovered during this session
- Document new architectural insights gained
- Update development patterns if new ones emerged
- Add linting rules for any new error types encountered

**CHANGELOG.md** - Update on EVERY commit:

- **CRITICAL**: ALWAYS APPEND new entries, NEVER overwrite existing entries from the same date
- **Same-Day Commits**: When multiple commits happen on same day, ADD new section above existing ones
- **Pattern**: `## [Unreleased] - YYYY-MM-DD` followed by `### [Priority] - [Feature Name]`
- Add entry for current date describing features added/modified/fixed
- Note any breaking changes and include relevant technical details
- **MISTAKE TO AVOID**: Replacing perfectly good changelog entries just because it's the same day

**README.md** - Update if user-facing changes:

- Add new commands or features
- Update installation/setup instructions
- Reference new documentation files created

**Server-specific READMEs** (app/README.md, ui/README.md, infra/README.md):

- Keep each standalone - only document that server's responsibilities
- Update build/run instructions if changed
- Add troubleshooting for common issues discovered

#### 2. API Documentation

**app/docs/swagger.yaml** - Update IMMEDIATELY when APIs change:

- Add complete definitions for new endpoints
- Update modified endpoint parameters/responses
- Include proper examples and status codes
- Add appropriate tags for organization

**Postman Collection** - Keep synchronized with API changes:

- Add new endpoints with proper examples
- Update existing request parameters
- Include environment variables for different profiles
- Leverage automation where feasible (Newman/CI integration)

#### 3. Documentation Organization

**docs/ Repository Filing**:

- Ensure all new markdown files are properly categorized
- Reference new docs in appropriate locations
- Update documentation index files
- Cross-reference between CHANGELOG and README when appropriate

**File Structure Verification**:

- Technical docs → `docs/technical/`
- Developer guides → `docs/developer/`  
- User guides → `docs/user/`
- Architecture docs → `docs/architecture/`

#### 4. Quality Checks

**Linting Verification**:

- Run markdown linting on all modified files
- Fix ALL linting errors immediately
- Verify proper file endings (trailing newlines)
- Check code block language specifications

**Cross-References**:

- Verify internal links work correctly
- Update any documentation indexes
- Ensure changelog entries reference relevant files

#### 5. Commit Message Generation

**Provide Structured Commit Message**:

Format: `[TYPE]: Brief description`

Types:

- `feat`: New feature
- `fix`: Bug fix  
- `docs`: Documentation changes
- `refactor`: Code restructuring
- `test`: Test additions/modifications
- `chore`: Maintenance tasks

**Example:**

```text
feat: Add smart Docker rebuild system with build verification

- Implement smart-rebuild.js with nuclear escalation option
- Add POST /initializeBuildMarker endpoint for verification
- Update npm commands for consistent rebuild workflow
- Document Docker caching patterns in COPILOT_INSTRUCTIONS.md
```

### Automation Integration

**Postman Collection Automation**:

- Integrate with Newman for automated API testing
- Use environment variables for profile switching
- Set up CI/CD pipeline hooks where feasible
- Maintain collection versioning alongside API changes

**Documentation Automation**:

- Use markdown linting in pre-commit hooks
- Automate cross-reference verification
- Generate API documentation from Swagger specs
- Validate internal link integrity

#### 6. Jobjar Management

**Final Check**:

- Always end with: "Anything to add to the jobjar?"
- If user provides items, update/create `JOBJAR.md` in project root
- Document future improvements, bugs to track, architecture opportunities

## 📝 Markdown Linting & Code Quality

### Common Linting Mistakes to Avoid

**❌ MISTAKE**: Ignoring markdown linting errors as "cosmetic"
**✅ CORRECT**: Clean code matters - fix ALL linting issues immediately

### Critical Linting Rules

1. **MD032 - Lists need blank lines**: Always add blank lines before and after lists
2. **MD022 - Headings need blank lines**: Add blank lines before and after all headings
3. **MD058 - Tables need blank lines**: Surround all tables with blank lines
4. **MD047 - Files need trailing newline**: ALWAYS add a newline at the end of files
5. **MD009 - No trailing spaces**: Remove trailing spaces after colons and text
6. **MD031 - Fenced code blocks need blank lines**: Surround code blocks with blank lines
7. **MD040 - Specify code language**: Always specify language for fenced code blocks
8. **MD025 - Single H1 per document**: Only one top-level heading per file

### Linting Fix Patterns

```markdown
❌ BAD:
**✅ CORRECT**: 
- List item without blank line

✅ GOOD:
**✅ CORRECT**:

- List item with proper blank lines
```

```markdown
❌ BAD:
### Heading
| Table | Header |

✅ GOOD:

### Heading

| Table | Header |
```

- **❌ BAD:** Code blocks without language specification
- **✅ GOOD:** Always specify language like `javascript`, `bash`, `text`, etc.

### File Ending Rule

**CRITICAL**: Every markdown file MUST end with exactly one newline character. This is not optional.

---

*This document should be updated whenever new classes of mistakes are discovered or new architectural insights are gained.*
