# AI Assistant Onboarding Guide

Welcome! This document provides essential context for AI assistants (Claude Code, GitHub Copilot, etc.) starting a new session on the MomsRecipeBox project.

## 📋 Quick Project Overview

**MomsRecipeBox** is a full-stack recipe management application with AI-powered features, currently transitioning to full cloud deployment.

**Tech Stack:**
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express (containerized) / AWS Lambda (serverless)
- **Database**: MongoDB (local Docker or MongoDB Atlas)
- **Infrastructure**: AWS (Lambda, API Gateway, S3, CloudFront, Secrets Manager)
- **Authentication**: Auth0
- **AI Providers**: OpenAI, Anthropic Claude, Groq, Google Gemini, DeepSeek

## 🎯 Current Project Status (As of November 2, 2025)

### Deployment Modes Evolution

The project evolved through 4 phases:

1. **Phase 1: Local Mode** ✅ Complete
   - Docker containers + local MongoDB
   - Used for initial development

2. **Phase 2: Atlas Mode** ✅ Complete
   - Docker containers + MongoDB Atlas
   - Cloud database integration

3. **Phase 3: Lambda Mode** ✅ Complete
   - Vite localhost (UI) → AWS Lambda (API) → MongoDB Atlas
   - Backend fully serverless
   - All 5 AI providers working
   - API Gateway proxy pattern implemented

4. **Phase 4: Cloud Mode** 🔨 **CURRENT PRIORITY**
   - CloudFront (UI) → AWS Lambda (API) → MongoDB Atlas
   - Infrastructure deployed but UI never uploaded
   - CloudFront URL: `https://d17a7bunmsfmub.cloudfront.net`
   - **Next step**: Build and deploy UI to S3/CloudFront

5. **Phase 5: Consolidation** 📋 Planned (4 weeks)
   - Clean up legacy modes (local/atlas)
   - Simplify npm commands (~50+ → ~15)
   - Test data cleanup
   - S3 orphan image cleanup
   - Production readiness

### What Works Right Now

**✅ Fully Functional:**
- Lambda backend with all API endpoints working
- All 5 AI providers (OpenAI, Anthropic, Groq, Google Gemini, DeepSeek)
- Auth0 JWT authentication via API Gateway custom authorizer
- MongoDB Atlas connectivity from Lambda
- AWS Secrets Manager integration for API keys
- API Gateway proxy pattern (65% less Terraform code)
- Recipe CRUD, favorites, comments, shopping lists
- AI Recipe Assistant
- Admin panel with system status

**🔨 Partially Complete:**
- CloudFront + S3 infrastructure deployed
- Deployment script exists (`deploy-ui.js`)
- UI never built for production
- CloudFront URL never tested

## 📁 Critical Files & Locations

### Documentation (READ THESE FIRST!)

**Essential Reading:**
- `COPILOT_INSTRUCTIONS.md` - Mistakes to avoid, architectural patterns, critical rules
- `JOBJAR.md` - Current priorities, Phase 4/5 roadmap, completed work
- `CHANGELOG.md` - Recent changes and feature history
- `README.md` - User-facing documentation

**Architecture & Guides:**
- `docs/guides/PHASE_4_1_UI_ENVIRONMENT_INTEGRATION.md` - Environment configuration
- `docs/CURRENT_MODE_INVENTORY.md` - Mode configuration inventory
- `infra/README.md` - AWS infrastructure documentation

### Key Code Locations

**Backend (Node.js):**
- `app/lambda.js` - Main Lambda handler (routing)
- `app/app.js` - Database connection & health checks
- `app/utils/secrets_manager.js` - AWS Secrets Manager integration
- `app/handlers/` - API endpoint handlers
- `app/ai_providers/` - AI provider implementations
- `app/admin/` - Admin panel handlers

**Frontend (React):**
- `ui/src/` - React application source
- `ui/src/config/environment.ts` - Environment configuration
- `ui/src/lib/api-client.ts` - HTTP client with Auth0 integration

**Infrastructure (Terraform):**
- `infra/app_api.tf` - API Gateway proxy pattern + Lambda
- `infra/s3_ui_hosting.tf` - S3 + CloudFront for UI hosting
- `infra/variables.tf` - Terraform variables
- `infra/terraform.tfvars` - Environment-specific values

**Scripts & Automation:**
- `scripts/deploy-lambda.js` - Lambda deployment
- `scripts/deploy-ui.js` - UI deployment to S3/CloudFront
- `scripts/test-ai-lambda.js` - AI endpoint testing
- `scripts/app-restart.js` - Unified restart system

## 🚨 Critical Rules & Patterns

### Always Check First
1. **Read `COPILOT_INSTRUCTIONS.md`** before making architectural decisions
2. **Check `JOBJAR.md`** for current priorities and phase roadmap
3. **Verify AWS profile** before any AWS operations (`mrb-api` for app, `terraform-mrb` for infra)
4. **Test in Lambda mode** - it's now the primary deployment target

### Key Architectural Patterns

**Lambda Secrets Management:**
```javascript
// ✅ CORRECT: Load ALL secrets at cold start into process.env
import { initializeSecretsToEnv } from './utils/secrets_manager.js';

async function initializeSecrets() {
  await initializeSecretsToEnv(); // Loads AI keys, MongoDB URI, Auth0, etc.
}

// Call BEFORE initializing database or handling requests
await initializeSecrets();
```

**API Gateway Proxy Pattern:**
- Use `{proxy+}` resource to catch all routes
- Single `ANY` method handles all HTTP verbs
- No Terraform changes needed when adding routes
- JWT authorizer applied at proxy level

**AI Provider Detection:**
- Providers auto-detect via `process.env.{PROVIDER}_API_KEY`
- `AIProviderFactory.getAvailableProviders()` returns array of available providers
- Must initialize secrets BEFORE providers check availability

### Common Mistakes to Avoid

**❌ DON'T:**
- Modify IAM policies without explicit user approval
- Use PowerShell commands in cross-platform scripts
- Create individual API Gateway resources (use proxy pattern)
- Store secrets in environment variables (use AWS Secrets Manager)
- Assume Docker automatically rebuilds on code changes

**✅ DO:**
- Use unified restart system: `npm run restart`
- Use Node.js for cross-platform compatibility
- Test with real Auth0 tokens (not mocks)
- Check `COPILOT_INSTRUCTIONS.md` for patterns
- Update documentation when adding features

## 🎯 Current Priorities

**Immediate (Phase 4 - 1-2 days):**
1. Deploy UI to CloudFront and validate Cloud Mode
2. Build production UI: `npm run ui:build:production`
3. Deploy to S3: `npm run deploy:ui`
4. Test CloudFront URL: `https://d17a7bunmsfmub.cloudfront.net`
5. Validate Auth0, CORS, all features end-to-end

**After Cloud Mode (Phase 5 - 4 weeks):**
1. Test data cleanup (auto-cleanup hooks, fix `auth0|testuser` mocks)
2. S3 orphan cleanup integration with Atlas
3. Mode consolidation (archive local/atlas, simplify commands)
4. Production readiness (monitoring, runbook, documentation)

## 🛠️ Common Operations

### Testing
```bash
# Lambda endpoint testing
AWS_PROFILE=mrb-api node scripts/test-ai-lambda.js
AWS_PROFILE=mrb-api node scripts/test-ai-providers-status.js
AWS_PROFILE=mrb-api node scripts/test-proxy-verification.js

# Full test suite
npm test
```

### Deployment
```bash
# Deploy Lambda backend
npm run deploy:lambda  # Requires AWS_PROFILE=mrb-api

# Deploy UI to CloudFront (when ready)
npm run deploy:ui      # Requires AWS_PROFILE=mrb-api
```

### AWS Profile Management
```bash
# Check current profile
aws sts get-caller-identity

# Set profile for app operations
$env:AWS_PROFILE="mrb-api"  # PowerShell

# Set profile for infrastructure
$env:AWS_PROFILE="terraform-mrb"  # PowerShell
```

### Development
```bash
# Start UI dev server (currently how we work)
cd ui
npm run dev  # Opens localhost:5173

# Backend is on Lambda (no local server needed)
```

## 💡 Pro Tips

1. **Start with documentation**: Read `COPILOT_INSTRUCTIONS.md` and `JOBJAR.md` first
2. **Use unified restart**: `npm run restart` handles everything intelligently
3. **Check git status**: Look for uncommitted work before major changes
4. **Test in Lambda mode**: It's the primary deployment now
5. **Update JOBJAR**: Track completed work and new ideas
6. **Ask about phases**: Clarify which phase context you're working in

## 📞 Getting Help

**When stuck:**
1. Check `COPILOT_INSTRUCTIONS.md` for patterns and mistakes
2. Check `JOBJAR.md` for context on current work
3. Check `CHANGELOG.md` for recent changes
4. Check relevant `docs/guides/` for specific topics
5. Ask user for clarification on priorities or approach

**When completing work:**
1. Update `CHANGELOG.md` with changes
2. Update `JOBJAR.md` with completed items
3. Update `COPILOT_INSTRUCTIONS.md` if new patterns discovered
4. Follow commit preparation workflow (see COPILOT_INSTRUCTIONS.md)
5. Ask user about updating jobjar with new ideas

## 🎬 Ready to Start?

You should now have enough context to:
- Understand the project architecture
- Know where we are in the deployment journey
- Find relevant documentation
- Avoid common mistakes
- Follow established patterns

**First steps in any session:**
1. Ask user what they want to work on
2. Check if it relates to Phase 4 (Cloud Mode) or Phase 5 (Consolidation)
3. Read relevant documentation sections
4. Confirm understanding before proceeding

Good luck! The project is well-documented and has strong patterns. When in doubt, check `COPILOT_INSTRUCTIONS.md` or ask the user.
