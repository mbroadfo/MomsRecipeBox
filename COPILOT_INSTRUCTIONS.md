# GitHub Copilot Development Instructions

This document contains key learnings and common mistakes to avoid when working on MomsRecipeBox. These instructions help prevent recurring issues and improve development efficiency.

## 🚨 Critical Mistakes to Avoid

### 1. Docker Architecture Misunderstandings

**❌ MISTAKE**: Assuming health endpoints go through Lambda handler in Express mode
**✅ CORRECT**: In Express mode (`APP_MODE=express`), health endpoints (`/health*`) are handled directly by local server for performance, while other routes go through Lambda handler

**❌ MISTAKE**: Thinking Atlas mode runs in Lambda
**✅ CORRECT**:

- **Atlas mode**: Local container + Atlas database (`APP_MODE=express`)
- **Lambda mode**: AWS Lambda deployment (`APP_MODE=lambda`)

**❌ MISTAKE**: Assuming Docker container restarts automatically apply code changes
**✅ CORRECT**: Docker containers use cached images - need complete rebuild to apply code changes

**Pattern for Docker Code Changes**:

```bash
# ❌ WRONG - restart doesn't rebuild image
docker-compose restart app-local

# ✅ CORRECT - force rebuild with no cache
docker-compose down
docker image rm -f momsrecipebox-app-local  
docker-compose build --no-cache app-local
docker-compose up -d
```

**❌ MISTAKE**: Not recognizing hardcoded localhost references in Docker environments
**✅ CORRECT**: In Docker containers, use service names (mongo:27017) not localhost:27017 for inter-container communication

### 2. Build Verification Logic Errors

**❌ MISTAKE**: Creating build verification systems that don't actually trigger the code they're trying to verify
**✅ CORRECT**: Always ensure verification triggers the actual endpoint/handler being tested

- Generate NEW build marker → Restart container → TRIGGER endpoint to load marker → Verify marker loaded

**❌ MISTAKE**: Looking for build markers without triggering the initialization endpoint
**✅ CORRECT**: Call `POST /initializeBuildMarker` before checking Docker logs for marker verification

### 3. AWS Profile Management

**❌ MISTAKE**: Using wrong AWS profiles for different operations
**✅ CORRECT**: Always use the appropriate AWS profile for each operation type:

- **Terraform operations**: Use `terraform-mrb` profile (or `mrb-terraform`)
- **Application deployment/testing**: Use `mrb-api` profile
- **Never mix profiles**: Each operation type has its own IAM permissions

**Critical Commands**:

```bash
# ❌ WRONG - using wrong profile for terraform
cd infra; terraform plan

# ✅ CORRECT - ensure terraform profile first
npm run aws:terraform  # Switch to terraform-mrb profile
cd infra; terraform plan

# ❌ WRONG - using wrong profile for Lambda deployment
npm run deploy:lambda

# ✅ CORRECT - ensure API profile first  
npm run aws:mrb-api    # Switch to mrb-api profile
npm run deploy:lambda
```

**Before any AWS operation, always verify/set the correct profile!**

### 4. PowerShell vs Cross-Platform Compatibility

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

### 4. Terminal Management & AWS Profile Context

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

### 5. Development Server Management

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

**❌ MISTAKE**: Not verifying that new code is actually running after container operations
**✅ CORRECT**: Always implement verification systems to prove new code deployed

## 🔧 Development Patterns

### Build Verification Best Practices

1. **Generate Unique Markers**: Use timestamps + hashes for each build attempt
2. **Trigger Initialization**: Always call the endpoint that loads/initializes what you're testing
3. **Wait for Processing**: Add appropriate delays for async operations
4. **Verify Results**: Check logs/responses for actual evidence of new code
5. **Escalate When Needed**: Have fallback options (nuclear rebuild) when normal methods fail

### Docker Container Patterns

```javascript
// ✅ GOOD: Comprehensive rebuild verification
async function verifyBuild(expectedHash) {
  // 1. Trigger the endpoint that loads the marker
  await triggerBuildMarkerInitialization();
  
  // 2. Wait for processing
  await delay(1000);
  
  // 3. Check logs for actual evidence
  const logs = getLogs();
  return logs.includes(expectedHash);
}

// ❌ BAD: Checking without triggering
async function verifyBuild(expectedHash) {
  const logs = getLogs(); // Never triggered loading!
  return logs.includes(expectedHash);
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
# Development workflow
npm run rebuild           # Smart rebuild when changes not reflected
npm run rebuild:force     # Nuclear option for stubborn Docker caching
npm run profile:show      # Check current development profile
npm run health:detailed   # Comprehensive system status
npm test                  # Run all tests

# Container management  
npm run profile:start     # Start infrastructure for current profile
npm run profile:stop      # Stop all infrastructure
npm run logs             # View container logs
```

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

#### 1. Documentation Updates

**COPILOT_INSTRUCTIONS.md** - Update unless instructions are perfectly clear already:

- Add any new mistakes discovered during this session
- Document new architectural insights gained
- Update development patterns if new ones emerged
- Add linting rules for any new error types encountered

**CHANGELOG.md** - Update on EVERY commit:

- Add entry for current date
- Describe features added/modified/fixed
- Note any breaking changes
- Include relevant technical details

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
