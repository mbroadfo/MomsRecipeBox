# Project Jobjar

Future improvements, features, and tasks identified during development but not immediately implemented.

## 🎯 PHASE 4: Cloud Mode Completion & Phase 5: Production Consolidation Plan

**Context**: The project evolved through four deployment modes:
- **Phase 1**: Local (Docker + local MongoDB) ✅ Development foundation
- **Phase 2**: Atlas (Docker + MongoDB Atlas) ✅ Cloud database integration
- **Phase 3**: Lambda (Vite localhost → Lambda API + Atlas DB) ✅ Backend serverless complete
- **Phase 4**: **Cloud Mode** (CloudFront UI → Lambda API + Atlas DB) 🔨 **INFRASTRUCTURE DEPLOYED, UI NOT YET DEPLOYED**

**Cloud Mode Status:**
- ✅ S3 bucket created: `mrb-ui-hosting-dev`
- ✅ CloudFront distribution deployed: `d17a7bunmsfmub.cloudfront.net` (E15JMXLPX2IABK)
- ✅ Deployment script exists: `deploy-ui.js`
- ✅ Configuration ready: `.env.production`
- ❌ UI never built for production
- ❌ UI never uploaded to S3
- ❌ CloudFront URL never tested
- ❌ Full-stack cloud deployment never validated

**Current Status**: Lambda backend complete with full AI integration. Cloud Mode infrastructure deployed but UI not yet deployed to CloudFront. Need to complete Phase 4 (Cloud Mode), then consolidate and cleanup for production.

### ☁️ Phase 4: Cloud Mode Completion (NEXT PRIORITY)

**Goal**: Deploy UI to CloudFront and validate full-stack cloud deployment

**Tasks**:
- [ ] **Build and deploy UI to S3/CloudFront**
  - Build production UI: `npm run ui:build:production`
  - Deploy to S3: `npm run deploy:ui` (uses existing deploy-ui.js script)
  - Verify CloudFront invalidation completes
  - Test CloudFront URL: `https://d17a7bunmsfmub.cloudfront.net`

- [ ] **End-to-end cloud validation**
  - Verify Auth0 authentication works through CloudFront
  - Test all major features (recipes, AI assistant, shopping list, admin panel)
  - Validate API calls from CloudFront → API Gateway → Lambda
  - Check performance and latency
  - Test CORS configuration

- [ ] **Configure custom domain (optional)**
  - Set up Route 53 hosted zone
  - Configure SSL certificate in ACM
  - Update CloudFront with custom domain
  - Update Auth0 allowed origins

**Impact**: Complete full-stack serverless deployment, eliminate localhost dependency for testing
**Effort**: 1-2 days for deployment and validation

---

### 🧹 Phase 5: Production Consolidation & Cleanup Tasks

#### 1. Mode Consolidation & Simplification (High Priority)
**Goal**: Transition to Lambda-only production deployment, archive development modes

**Tasks**:
- [ ] **Document Lambda-only deployment strategy**
  - Create production deployment runbook
  - Document rollback procedures
  - Create disaster recovery plan

- [ ] **Identify and archive legacy mode artifacts**
  - Mark local/atlas npm commands as "development only"
  - Move development mode scripts to `scripts/dev/` directory
  - Update README to focus on Lambda production deployment
  - Create `docs/archive/development-modes.md` for historical reference

- [ ] **Simplify npm command structure**
  - Reduce ~50+ npm commands to essential production commands
  - Keep only: deploy, test, monitor, rollback commands for production
  - Move development-specific commands to separate package.json section
  - Document which commands are production vs development

- [ ] **Consolidate script languages**
  - Audit all PowerShell (.ps1) scripts
  - Convert essential scripts to Node.js for cross-platform compatibility
  - Remove or archive one-off debugging scripts
  - Standardize on JavaScript for all automation

- [ ] **Documentation consolidation**
  - Merge redundant documentation
  - Update all docs to reflect Lambda-first approach
  - Archive historical development mode documentation
  - Create single source of truth for production deployment

**Impact**: Simplified codebase, faster onboarding, reduced maintenance burden
**Effort**: 3-5 days of systematic cleanup and documentation

#### 2. Test Data Cleanup & Management (Medium Priority)
**Goal**: Implement automatic cleanup of test artifacts in Atlas database

**Current Issues**:
- Test runs leave orphaned recipes in production Atlas database
- Failed tests don't clean up their test data
- Mock user ID (`auth0|testuser`) scattered throughout test data
- Test data accumulates over time, cluttering production database

**Tasks**:
- [ ] **Implement automatic test cleanup**
  - Add cleanup hooks to test suite (afterEach/afterAll)
  - Ensure cleanup runs even on test failures (try/finally blocks)
  - Tag all test data with `_test: true` flag for easy identification
  - Create scheduled cleanup job for orphaned test data

- [ ] **Fix mock user ID references**
  - Replace hardcoded `auth0|testuser` with actual user_id field
  - Update test utilities to use real user IDs from Auth0
  - Ensure test data uses proper user associations
  - Audit all test files for mock ID references

- [ ] **Test data isolation strategy**
  - Consider using separate test database or collection
  - Implement test data prefixing (e.g., `TEST_recipe_name`)
  - Add database cleanup verification to CI/CD pipeline
  - Create manual cleanup script for emergency use

**Impact**: Clean production database, accurate test data, better test reliability
**Effort**: 2-3 days including test suite updates

#### 3. S3 Orphan Cleanup Integration (Medium Priority)
**Goal**: Keep S3 orphan image cleanup working with Atlas database

**Current Status**: Orphan cleanup process exists but needs Atlas integration verification

**Tasks**:
- [ ] **Verify orphan cleanup with Atlas**
  - Test orphan detection against Atlas database
  - Ensure S3 cleanup doesn't affect active recipes
  - Validate cleanup reports are accurate
  - Test with production-scale data

- [ ] **Automate orphan cleanup**
  - Create scheduled Lambda function for cleanup (weekly?)
  - Add monitoring and alerting for cleanup runs
  - Generate cleanup reports for review
  - Implement dry-run mode for safety

- [ ] **S3 lifecycle policies**
  - Configure S3 lifecycle rules for automatic cleanup
  - Set up versioning for image recovery
  - Implement soft-delete with retention period
  - Document image storage policies

**Impact**: Reduced S3 costs, clean storage, no orphaned images
**Effort**: 2 days for integration and automation

### 📊 Success Metrics

**Code Simplification**:
- Reduce npm commands from 50+ to ~15 essential commands
- Eliminate all .ps1 scripts (convert to .js or remove)
- Consolidate documentation to <10 key files

**Data Quality**:
- Zero test artifacts in production Atlas database
- 100% test cleanup on success AND failure
- S3 orphan rate < 1% of total images

**Production Readiness**:
- Complete deployment runbook
- Automated monitoring and alerting
- <5 minute deployment time
- <30 second rollback capability

### 🎯 Recommended Execution Order

**Phase 4: Cloud Mode Completion** (1-2 days - NEXT PRIORITY)
1. Deploy UI to CloudFront
2. End-to-end cloud validation
3. Performance and CORS testing

**Phase 5 - Week 1: Test Cleanup** (Highest ROI after Cloud Mode)
1. Implement test data cleanup hooks
2. Fix mock user ID references
3. Create manual cleanup script

**Phase 5 - Week 2: S3 Integration**
1. Verify orphan cleanup with Atlas
2. Automate with scheduled Lambda
3. Configure S3 lifecycle policies

**Phase 5 - Week 3: Mode Consolidation**
1. Archive legacy mode documentation
2. Simplify npm commands
3. Convert PowerShell scripts

**Phase 5 - Week 4: Production Prep**
1. Create deployment runbook
2. Set up monitoring/alerting
3. Final production validation

---

## New ideas

<!-- Space for new ideas as they emerge -->

## 🍃 Low Hanging Fruit / Quick Wins (1-3 days each)

### 14. Admin Mock Data Cleanup

- Remove "Coming Soon" placeholder in Recipe Moderation route (`/admin/recipes`)
- Clean up development-only mock authentication fallbacks in AdminContext.tsx
- Remove demo test files from admin/tests/ directory (demo_improvements.js, etc.)
- Replace hardcoded 'demo-user' fallbacks with proper authentication-only defaults
- Remove development console logging from admin API functions
- **Impact**: Professional admin interface, cleaner production environment
- **Effort**: Low - Remove placeholder UI and development artifacts

### 4. Cleanup Navigation and Action Bars

- Standardize navigation patterns across the UI
- Improve action bar consistency and usability
- Enhance responsive design for navigation elements
- **Impact**: Improved user experience consistency
- **Effort**: Low - UI consistency work, no new features

### 13. Admin vs Owner Permissions Review

- Analyze current admin capabilities vs recipe owners
- Define clear permission boundaries and roles
- Implement proper role-based access control
- **Impact**: Security foundation and clarity
- **Effort**: Low - Analysis and documentation task

## 🏗️ Major Projects (1-3 weeks each)

### 2. Lambda Mode ✅ **COMPLETED - Cloud Mode Infrastructure Deployed**

- ✅ **COMPLETED**: Core Lambda deployment with full feature parity
- ✅ **COMPLETED**: All 5 AI providers working in Lambda
- ✅ **COMPLETED**: API Gateway proxy pattern implementation
- ✅ **COMPLETED**: CloudFront + S3 infrastructure deployed
- 🔄 **NEXT**: Phase 4 - Deploy UI to CloudFront (see Phase 4 plan at top)
- Production optimization tasks covered in Phase 5: Production Consolidation & Cleanup Plan

### 7. Enhanced User Management

- Implement 2FA (Two-Factor Authentication)
- Add adaptive authentication based on risk assessment
- Integrate passkey support for passwordless authentication
- Enhance overall security posture
- **Impact**: Security and modern authentication
- **Effort**: High - Complex security features, Auth0 integration

### 8. Guest Access & Invitation System

- Implement guest access functionality
- Create invitation request system for non-members
- Design guest user experience and limitations
- **Impact**: User growth and accessibility
- **Effort**: High - New user workflow, authentication changes

### 11. Recipe Moderation System

- Implement recipe moderation workflow
- Add content review and approval process
- Create moderation tools for administrators
- **Impact**: Content quality and community management
- **Effort**: High - New admin workflow, content management

## 🔧 Minor Enhancements (2-5 days each)

### 5. AI Assistant Integration on Recipe Pages

- Implement AI assistant functionality on view recipe pages
- Add AI assistant to edit recipe pages
- Ensure seamless integration with existing recipe workflow
- **Impact**: Enhanced user engagement
- **Effort**: Medium - Extending existing AI functionality

### 10. Improve Add Recipe AI Assistant Quality

- Enhance AI assistant data quality validation
- Ensure AI-generated recipes meet quality standards
- Improve ingredient parsing and standardization
- **Impact**: Better AI-generated content quality
- **Effort**: Medium - Improving existing AI features

### 9. Edit Profile Implementation

- Create comprehensive profile editing interface
- Add profile image management
- Implement profile data validation and security
- **Impact**: Core user functionality
- **Effort**: Medium - Standard CRUD operations

### 1. Update Data Quality Check

- Enhance existing data quality validation systems
- Improve data integrity checks and reporting
- Add comprehensive data quality metrics and monitoring
- **Impact**: System reliability and data integrity
- **Effort**: Medium - Building on existing systems

### 3. Admin Infrastructure Updates (Gemini Suggestions)

- Review and implement Gemini's recommendations for admin infrastructure
- Evaluate suggested architectural improvements
- Update admin monitoring and management capabilities
- **Impact**: Incremental system improvements
- **Effort**: Medium - Incremental improvements to existing admin

## 🔍 Investigation/Analysis Tasks (1-2 days each)

### 12. Shopping Cart Performance Investigation

- Investigate excessive shopping cart API calls during recipe retrieval
- Optimize API call patterns and caching
- Reduce unnecessary network requests
- **Impact**: Performance improvement
- **Effort**: Investigation first, then implementation based on findings

## 📊 Updated Implementation Strategy (Post-Lambda Completion)

### 🎯 **CURRENT FOCUS: Phase 4 Cloud Mode Completion** (See detailed plan at top)

**Phase 4: Cloud Mode** (1-2 days - IMMEDIATE PRIORITY)
- Deploy UI to CloudFront
- Validate full-stack cloud deployment
- Test all features end-to-end

**Phase 5: Production Consolidation & Cleanup** (4 weeks - After Cloud Mode)
- Week 1: Test data cleanup and mock ID fixes
- Week 2: S3 orphan cleanup integration
- Week 3: Mode consolidation and script cleanup
- Week 4: Production readiness and monitoring

### Phase 6: User Experience Enhancements (2-3 weeks)

1. **#14 - Admin Mock Data Cleanup** (production hygiene)
2. **#4 - Navigation Cleanup** (user experience)
3. **#5 - AI Assistant on Recipe Pages** (user engagement)
4. **#10 - AI Assistant Quality** (user experience)
5. **#9 - Edit Profile** (core functionality)

### Phase 5: Major Features (4-6 weeks)

1. **#7 - Enhanced User Management** (2FA, passkeys)
2. **#8 - Guest Access System** (growth features)
3. **#11 - Recipe Moderation** (community management)

### Phase 6: Ongoing Optimization

1. **#12 - Shopping Cart Performance** (investigate + fix)
2. **#1 - Data Quality Updates** (continuous improvement)
3. **#3 - Admin Infrastructure** (ongoing optimization)
4. **#13 - Permissions Review** (security foundation)

---

## ✅ COMPLETED ITEMS

### 19. Lambda AI Integration & API Gateway Proxy Pattern ✅ **COMPLETED 2025-11-02**

- ✅ Implemented AWS Secrets Manager integration to load all secrets at Lambda cold start
- ✅ Created `app/utils/secrets_manager.js` utility for centralized secret management
- ✅ Updated Lambda initialization to load AI API keys (OpenAI, Anthropic, Groq, Google Gemini, DeepSeek) into process.env
- ✅ Refactored API Gateway from individual endpoint configuration (100+ resources) to proxy pattern (20 resources)
- ✅ Reduced Terraform code by 65% (1322 lines → 460 lines) with proxy-based architecture
- ✅ Eliminated need for Terraform changes when adding new API routes
- ✅ Validated all 5 AI providers working in Lambda mode with real token generation
- ✅ Confirmed AI Recipe Assistant fully functional in Lambda deployment
- ✅ Created comprehensive test scripts: `test-ai-lambda.js`, `test-ai-providers-status.js`, `test-proxy-verification.js`
- **Impact**: Complete AI functionality in Lambda mode, simplified infrastructure management, faster deployments
- **Result**: Lambda Mode now has full feature parity with Express mode including all AI providers

### 18. Lambda UI Integration Testing & Configuration ✅ **COMPLETED 2025-10-27**

- ✅ Created `.env.lambda` configuration file with correct API Gateway URL
- ✅ Updated environment configuration to use Lambda API Gateway (`https://b31emm78z4.execute-api.us-west-2.amazonaws.com/dev`)
- ✅ Fixed RecipeList component to use environment-aware API client instead of direct fetch
- ✅ Configured Auth0 token integration with API client for JWT authentication
- ✅ Updated Vite configuration to disable proxy in Lambda mode
- ✅ Added comprehensive debugging for environment detection and API URL configuration
- ✅ Validated complete UI functionality against Lambda backend with real Auth0 authentication
- **Impact**: Complete end-to-end Lambda deployment validation achieved - full-stack integration working
- **Result**: UI successfully loads recipes from Lambda API Gateway with real JWT authentication, admin access confirmed

### 17. Shopping List Infrastructure Completion ✅ **COMPLETED 2025-10-27**

- ✅ Added 5 missing API Gateway resources and methods for shopping list endpoints
- ✅ Configured JWT authentication for all shopping list operations (GET, POST, PUT, DELETE)
- ✅ Fixed URL encoding issue in test suite for auth0|testuser parameter
- ✅ Updated Terraform deployment dependencies to include shopping list integrations
- ✅ Validated complete shopping list functionality with real Auth0 JWT tokens
- **Impact**: Shopping list feature now fully operational with complete CRUD operations
- **Result**: All shopping list endpoints secured and working: GET /shopping-list, POST /shopping-list/add, POST /shopping-list/clear, PUT /shopping-list/item/{itemId}, DELETE /shopping-list/item/{itemId}

### 16. Modern UI Notifications ✅ **COMPLETED 2025-10-24**

- ✅ Replaced all alert() and confirm() popups with modern toast notifications and confirmation modals
- ✅ Updated UserManagementPage.tsx to use showToast() for success/error notifications
- ✅ Updated RecipeDetailContainer.tsx to use ConfirmModal for delete confirmation and showToast() for feedback
- ✅ Updated ShoppingListPage.tsx and Header.tsx placeholder alerts with informative toast notifications
- ✅ Improved user experience with consistent, non-blocking notification system
- **Impact**: Professional UI/UX with modern notification patterns
- **Result**: Eliminated jarring browser popups, improved accessibility and user experience

### 15. Fix User Invitation Email Flow ✅ **COMPLETED 2025-10-23**

- ✅ Fixed Auth0 change_password API call to use correct public endpoint (not M2M authenticated)
- ✅ Resolved email template branding issue using application.name detection for Mom's Recipe Box
- ✅ Updated both welcome and password reset templates with working conditional logic
- ✅ Verified end-to-end invitation flow with proper email delivery and branding
- **Impact**: Critical user onboarding experience now fully functional
- **Result**: Users receive properly branded Mom's Recipe Box invitation emails and can complete setup

### 6. Recipe Management UX Improvements ✅ **COMPLETED 2025-10-22**

- ✅ Moved delete recipe button to edit mode only
- ✅ Restricted delete functionality to recipe owners only
- ✅ Improved recipe ownership visual indicators
- **Impact**: High user safety, prevents accidental deletions
- **Result**: Users must intentionally enter edit mode before delete option becomes available, enhanced security

## 📝 Notes

- Items are prioritized by development impact and user value
- Each item should be broken down into specific tasks when implemented
- Consider dependencies between items when planning implementation order
- Regular review and reprioritization recommended
- **Phase 4 Cloud Mode** is now the highest priority - deploying UI to CloudFront to complete full-stack cloud deployment

**Major Milestones Achieved:**
- ✅ Phase 3 Complete: Lambda backend with full AI integration (5 providers)
- ✅ API Gateway proxy pattern (65% code reduction)
- ✅ Cloud Mode infrastructure deployed (CloudFront + S3)
- 🔄 Phase 4 Next: Deploy UI to CloudFront and validate full-stack cloud
- 📋 Phase 5 After: Production consolidation and cleanup

Last updated: November 2, 2025
