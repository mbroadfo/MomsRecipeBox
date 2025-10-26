# Changelog

All notable changes to the MomsRecipeBox project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2025-10-26

### Added - JWT Authorization Infrastructure Planning

#### 🔐 **AUTHENTICATION ARCHITECTURE**: JWT Authorization Implementation Plan

- **JWT Authorization Plan**: Created comprehensive implementation plan for API Gateway JWT authorizer with Auth0 integration
- **Authentication Analysis**: Identified and documented root cause of authentication inconsistencies across HTTP methods
- **Infrastructure Planning**: Detailed Phase 1-4 implementation strategy for proper JWT validation at API Gateway level
- **Security Strategy**: Chose API Gateway JWT authorizer over Lambda-based validation for better performance and security

#### 🛠️ **LAMBDA MODE FIXES**: Database Connectivity & Authentication Foundation

- **Database Name Corrections**: Fixed hardcoded database names from "moms_recipe_box" to "moms_recipe_box_dev" across codebase
- **Atlas Connection Resolution**: Corrected MongoDB Atlas connection string to use proper database name in Terraform configuration
- **Variable Name Fix**: Resolved `firstComment is not defined` error in test_comments.js by correcting variable reference
- **Authentication Headers**: Added proper authentication header structure to test files (dummy tokens to be replaced with real Auth0 tokens)

#### 📊 **INFRASTRUCTURE VALIDATION**: Lambda Deployment Success Confirmation

- **Recipe Creation Verification**: Confirmed Lambda function successfully creates recipes in Atlas database (Recipe ID: 68fe738963c76ca777af7184)
- **Database Connectivity**: Validated MongoDB Atlas connection works properly with corrected environment variables
- **API Gateway Routing**: Verified API Gateway routes traffic to Lambda function correctly for POST operations
- **Error Diagnosis**: Identified that authentication failures are API Gateway-level issues, not Lambda function problems

#### 📚 **DOCUMENTATION IMPROVEMENTS**: Development Guidelines & Planning

- **JWT Implementation Guide**: Created detailed technical implementation plan in `docs/JWT_AUTHORIZATION_PLAN.md`
- **Progress Tracking**: Established task-based progress tracking system for JWT authorization implementation
- **Technical Specifications**: Documented Auth0 configuration requirements and expected JWT token format
- **Cleanup Strategy**: Identified recent changes to keep, modify, or remove for proper JWT implementation

### Fixed - Lambda Mode Authentication Issues

#### 🔍 **AUTHENTICATION DIAGNOSIS**: Root Cause Analysis Complete

- **API Gateway Investigation**: Discovered API Gateway requires authentication despite Terraform showing `authorization = "NONE"`
- **Route Inconsistency**: Identified why POST works but GET/PUT/DELETE fail with "Missing Authentication Token"
- **Token Analysis**: Confirmed all HTTP methods use same dummy JWT token, ruling out token-specific issues
- **Infrastructure Validation**: Proven Lambda function and database connectivity work correctly

## [Unreleased] - 2025-10-26

### Added - AWS Lambda Mode Implementation

#### 🚀 **LAMBDA DEPLOYMENT**: Complete Serverless Implementation

- **Lambda Function**: Successfully deployed containerized Lambda function with optimized startup performance
- **API Gateway Integration**: Full API Gateway routing with proper CORS support and error handling
- **Docker Optimization**: Reduced build context from 187MB to 636KB (99.7% reduction) through intelligent file exclusion
- **Smart Error Handling**: Graceful degradation with proper HTTP status codes when database unavailable (503 responses)
- **Build Verification System**: Comprehensive test suite to validate Lambda deployment and functionality

#### 🔧 **TECHNICAL ARCHITECTURE**: Production-Ready Serverless

- **Container Deployment**: AWS Lambda using ECR container images with platform-specific dependencies (sharp module)
- **Database Integration**: Optimized MongoDB Atlas connection with deferred initialization for faster cold starts
- **Health Check Optimization**: Disabled heavy startup health checks for Lambda environment while maintaining functionality
- **Legacy Docker Compatibility**: Used `DOCKER_BUILDKIT=0` to ensure Lambda-compatible manifest format
- **Comprehensive Testing**: Added `test:lambda:comprehensive` npm script for full functionality validation

#### 📦 **BUILD SYSTEM IMPROVEMENTS**: Optimized Deployment Pipeline

- **Smart File Exclusion**: Enhanced `.dockerignore` to exclude UI, docs, infrastructure, and test files from Lambda deployment
- **Node Modules Optimization**: Prevented duplicate node_modules copying while maintaining production dependencies
- **Deployment Automation**: Streamlined deployment script with ECR authentication and function updates
- **Error Resilience**: Lambda gracefully handles database unavailability without crashing

#### 🔒 **IAM SECURITY GUIDELINES**: Development Best Practices

- **Policy Management Rules**: Updated `COPILOT_INSTRUCTIONS.md` with strict IAM modification guidelines
- **Permission Documentation**: Enhanced IAM policy documentation with required Lambda configuration permissions
- **Security-First Approach**: Established clear approval process for any IAM permission changes
- **AWS Profile Management**: Documented proper profile usage for different operation types (terraform vs application)

## [Unreleased] - 2025-10-24

### Enhanced - Modern UI Notification System

#### 🎨 **UI/UX MODERNIZATION**: Replaced Legacy Browser Popups with Professional Components

- **Toast Notification System**: Replaced all `alert()` calls with modern `showToast()` notifications featuring success, error, and info variants
- **Confirmation Modal Integration**: Replaced blocking `confirm()` dialogs with accessible `ConfirmModal` component for destructive actions
- **Consistent User Experience**: Unified notification patterns across user management, recipe management, and placeholder interactions
- **Professional Interface**: Eliminated jarring browser popups in favor of smooth, styled, non-blocking notifications

#### 🔧 **TECHNICAL IMPLEMENTATION**: Comprehensive Popup Elimination

- **UserManagementPage.tsx**: Updated user invitation success/error feedback and delete confirmation flow
- **RecipeDetailContainer.tsx**: Enhanced recipe save/update/delete operations with toast notifications and confirmation modal
- **ShoppingListPage.tsx**: Converted placeholder alerts to informative toast notifications
- **Header.tsx**: Updated profile placeholder with professional toast notification
- **Component Integration**: Leveraged existing `Toast.tsx` and `ConfirmModal.tsx` components for consistent implementation

#### ♿ **ACCESSIBILITY & MOBILE IMPROVEMENTS**: Modern Web Standards

- **ARIA Compliance**: Confirmation modals include proper accessibility labels and focus management
- **Mobile Responsive**: Toast notifications and modals work seamlessly across all device sizes
- **Keyboard Navigation**: Full keyboard accessibility for confirmation dialogs with escape key handling
- **Non-Blocking Interface**: Toast notifications don't interrupt user workflow or freeze the UI

## [Unreleased] - 2025-10-23

### Fixed - Auth0 Email Template Branding Issue

#### 🎨 **EMAIL TEMPLATE BRANDING**: Mom's Recipe Box Visual Identity

- **Application Name Detection**: Implemented reliable application detection using `application.name` variable containing 'MomsRecipeBox' or 'Recipe'
- **Corrected Template Logic**: Fixed conditional branding logic that was incorrectly showing Cruise Viewer blue theme for Mom's Recipe Box users
- **Dual-App Support**: Enhanced templates to properly detect `MomsRecipeBox-SPA` application name and display appropriate orange branding
- **Template Files Updated**: Both `welcome_email_template_fixed.html` and `change_password_link_template.html` now use working name-based detection

#### 🔧 **TECHNICAL RESOLUTION**: Debug-Driven Template Development

- **Debug Template Creation**: Built comprehensive debug template to identify actual Auth0 variable values (`application.name`, `application.clientID`, `application.callback_domain`)
- **Variable Discovery**: Confirmed `application.callback_domain` was empty, making domain-based detection impossible
- **Name-Based Logic**: Switched from unreliable client ID mapping to simple `application.name contains 'MomsRecipeBox'` detection
- **Production Testing**: Verified correct orange Mom's Recipe Box branding in live Auth0 password reset emails

#### 📧 **USER EXPERIENCE IMPROVEMENT**: Consistent Brand Identity

- **Visual Consistency**: Mom's Recipe Box users now receive properly branded emails with orange theme, cooking icons, and recipe-focused messaging
- **Brand Recognition**: Eliminated confusion from incorrect Cruise Viewer branding in Mom's Recipe Box invitation/password reset emails
- **Template Maintenance**: Simplified template logic for easier future maintenance and debugging

## [Unreleased] - 2025-10-22

### Added - Recipe Management UX Safety Improvements (Quick Win #6)

#### 🛡️ **RECIPE DELETE SAFETY**: Enhanced User Experience & Security

- **Edit Mode Delete Restriction**: Delete button now only appears in edit mode, preventing accidental deletions during casual recipe browsing
- **Owner-Only Delete Access**: Implemented ownership validation - only recipe owners can see/use delete functionality
- **Enhanced Security Model**: Added `getCurrentUserId() === working.owner_id` permission check for delete operations
- **Safer User Flow**: Users must intentionally enter edit mode before delete option becomes available

#### 🔧 **TECHNICAL IMPLEMENTATION**: Frontend Permission Controls

- **Modified RecipeDetailContainer.tsx**: Updated delete button conditional logic from `!editMode && !isNew` to `editMode && !isNew && getCurrentUserId() === working.owner_id`
- **Permission Integration**: Leveraged existing `getCurrentUserId()` helper function from `types/global.ts`
- **Consistent UX Pattern**: Delete functionality follows edit-mode-only pattern for destructive operations
- **Cross-Platform Development**: Enhanced COPILOT_INSTRUCTIONS.md with PowerShell vs bash syntax rules and development server management best practices

### Enhanced - Development Workflow Documentation

#### 📚 **COPILOT_INSTRUCTIONS UPDATES**: Cross-Platform Compatibility Rules

- **PowerShell Syntax Patterns**: Added specific guidance for Windows PowerShell command chaining (`;` vs `&&`)
- **Development Server Management**: Documented best practices for checking existing Vite servers before starting new ones
- **Port Conflict Prevention**: Added rules to prevent multiple development server instances (5173 → 5174 conflicts)
- **Terminal Command Accuracy**: Enhanced cross-platform command compatibility documentation

### Updated - Streamlined Commit Preparation Workflow

#### 🔄 **WORKFLOW REFINEMENT**: Optimized Development Process

- **Reordered Workflow Steps**: Moved commit message generation to final step for logical flow
- **Streamlined Process**: Removed redundant completion summaries for efficiency
- **Enhanced Jobjar Integration**: Simplified jobjar check to final question with root-level JOBJAR.md creation
- **Process Optimization**: Focused on essential checklist items without verbose status reporting

### Added - Comprehensive Commit Preparation Workflow

#### 🔄 **COMMIT PREPARATION AUTOMATION**: Professional Development Process

- **Automated Commit Workflow**: Complete checklist execution when user says "prepare for commit"
  - Automatic COPILOT_INSTRUCTIONS.md updates for new architectural insights
  - Mandatory CHANGELOG.md updates on every commit with structured entries
  - README.md verification for user-facing changes
  - Server-specific README maintenance (app, ui, infra standalone responsibilities)

- **API Documentation Automation**: Synchronized documentation maintenance
  - Immediate Swagger updates when APIs change (`app/docs/swagger.yaml`)
  - Postman collection synchronization with API modifications
  - Newman integration for automated API testing where feasible
  - Environment variable management for profile switching

- **Documentation Organization Standards**: Professional filing system
  - Technical docs → `docs/technical/`
  - Developer guides → `docs/developer/`
  - User guides → `docs/user/`
  - Architecture docs → `docs/architecture/`
  - Cross-referencing validation between CHANGELOG and README

- **Quality Assurance Integration**: Comprehensive validation checks
  - Markdown linting enforcement on all documentation
  - Internal link integrity verification
  - Documentation index maintenance
  - Jobjar project management pattern integration

- **Structured Commit Messages**: Professional commit format generation
  - Standardized commit types (feat, fix, docs, refactor, test, chore)
  - Detailed commit descriptions with component breakdown
  - Automated generation based on session changes

## [Unreleased] - 2025-10-23

### Added - Smart Docker Rebuild System & Build Verification

#### 🔄 **SMART REBUILD SYSTEM**: Intelligent Docker Cache Management

- **Smart Rebuild (`npm run rebuild`)**: Intelligent rebuild system that tries efficient container restart first
  - Generates unique build verification markers for deployment validation
  - Automatically detects Docker layer caching issues preventing code updates
  - Escalates to nuclear rebuild when cached layers serve stale code
  - Cross-platform Node.js implementation for PowerShell compatibility

- **Nuclear Rebuild (`npm run rebuild:force`)**: Complete Docker rebuild from scratch
  - Removes all cached Docker images and build cache
  - Forces complete container recreation to bypass stubborn caching issues
  - Includes verification system to confirm new code deployment

- **Build Verification System**: Deployment validation via unique markers
  - Creates hash-based build markers with timestamps for each rebuild attempt
  - Dedicated Lambda endpoint `/initializeBuildMarker` for verification triggers
  - Comprehensive logging and diagnostics for troubleshooting Docker caching
  - PowerShell-compatible HTTP requests using Node.js instead of shell commands

#### 🐳 **DOCKER CACHING SOLUTION**: Development Reliability Improvements

- **Automatic Cache Detection**: System identifies when Docker serves cached layers instead of new code
- **Deployment Verification**: Confirms new code is actually running via build marker validation
- **Documentation**: Updated Swagger API documentation with new system endpoints
- **Troubleshooting**: Enhanced error messages and diagnostics for Docker-related deployment issues

### Added - Project Organization & Environment Configuration Overhaul (2025-10-20)

#### 📋 **DOCUMENTATION REORGANIZATION**: Professional Structure Implementation

- **Comprehensive File Organization**: Moved 146+ markdown files from root directory into structured docs/ hierarchy
- **Organized Documentation Sections**:
  - `docs/user/` - End-user guides and tutorials
  - `docs/developer/` - Development setup and API documentation  
  - `docs/technical/` - Infrastructure and system documentation
  - `docs/guides/` - Step-by-step procedural guides
  - `docs-archive/` - Historical and deprecated documentation
- **Root Directory Cleanup**: Maintained only essential files (README.md, CHANGELOG.md) in project root
- **Archive Management**: Preserved historical documentation in organized archive structure

#### 🗂️ **ROOT DIRECTORY CLEANUP**: Minimalist Project Structure

- **Essential Files Only**: Reduced root directory from 22+ files to 13 essential project files
- **Script Organization**: Moved utility scripts to dedicated `scripts/` directory:
  - `StartDbTunnel.ps1` → `scripts/StartDbTunnel.ps1`
  - `db-test.js` → `scripts/db-test.js`
  - `query_atlas.js` → `scripts/query_atlas.js`
- **Cleanup Operations**: Removed redundant and temporary files:
  - `app_logs.txt` (outdated application logs)
  - `cleanup_preview.txt` (temporary preview file)
  - `recipe_ids_from_db.txt` (data dump file)
  - `fix-git-history.sh`, `fix-secret-leak.ps1` (completed one-time scripts)

#### ⚙️ **ENVIRONMENT CONFIGURATION MODERNIZATION**: Streamlined Developer Experience

- **Complete .env.example Rewrite**: Transformed from 100+ comprehensive lines to 80 focused lines
- **Profile-Based Configuration**: Clear guidance for 4 deployment profiles (local/atlas/lambda/cloud)
- **Required vs Optional Sections**: Logical organization with clear priority indicators
- **Actual Usage Focus**: Based configuration on real environment variables used in codebase rather than exhaustive examples
- **Developer Onboarding**: Added comprehensive setup examples and profile usage instructions

#### 🔧 **GIT CONFIGURATION IMPROVEMENTS**: Enhanced Repository Management

- **Fixed .gitignore Patterns**: Updated `.env.*` to specific patterns to allow `.env.example` commits
- **Committable Templates**: Ensured `.env.example` is properly tracked while protecting actual environment files
- **Specific Environment Protection**: Targeted protection for `.env.local`, `.env.development`, etc.

### Technical Implementation

#### 🎯 **Configuration Analysis**

- **Environment Variable Audit**: Analyzed actual `process.env` usage across entire codebase
- **Profile System Integration**: Aligned `.env.example` with `deployment-profiles.json` architecture  
- **Dependency Mapping**: Identified essential vs optional configuration requirements
- **Cross-Platform Compatibility**: Ensured configuration works across development environments

#### 📁 **File Organization Strategy**

- **Systematic Categorization**: Applied consistent categorization logic across all documentation
- **Hierarchical Structure**: Implemented logical nesting (user → developer → technical complexity)
- **Archive Preservation**: Maintained historical context while organizing current documentation
- **Essential File Identification**: Kept only core project files in root directory

#### 🔍 **Quality Assurance**

- **Comprehensive Review**: Analyzed each file for proper categorization and necessity
- **Documentation Validation**: Ensured all moved files retained proper links and references
- **Configuration Testing**: Validated environment variable usage patterns
- **Developer Experience Testing**: Confirmed simplified setup process

### Added - TypeScript & Code Quality Enhancements

#### 🚀 **TYPESCRIPT MIGRATION**: Complete Type Safety Implementation

- **Zero Any Types**: Eliminated all `any` types across the entire frontend codebase
- **Comprehensive Interfaces**: Created detailed type definitions for Recipe, RawRecipe, WorkingRecipe, and AdminAPI responses
- **Type-Safe Authentication**: Enhanced Auth0 integration with proper User type imports and authentication context typing
- **Window Global Extensions**: Created proper interface declarations for window globals with getCurrentUserId() helper function
- **Enhanced Error Handling**: Implemented type-safe error handling patterns throughout React components and hooks

#### 🔧 **CODE QUALITY IMPROVEMENTS**: Developer Experience & Maintainability

- **ESLint Configuration**: Comprehensive linting setup with proper ignore patterns for documentation files
- **Markdown Linting**: Added markdownlint configuration to maintain documentation quality
- **Interface Design**: Created service-specific stats interfaces (S3Stats, MongoDBStats, APIGatewayStats, etc.)
- **Type Guards**: Implemented safe property access patterns for dynamic API response data
- **Import Standardization**: Consistent import patterns and module structure across all components

#### 🛠️ **TECHNICAL IMPLEMENTATION**: Infrastructure & Tooling

- **Component Type Safety**: Updated all React components with proper prop typing and state management
- **Hook Enhancements**: Improved useRecipe, useWorkingRecipe, and admin hooks with comprehensive type definitions
- **API Response Typing**: Created UserAnalytics interface matching actual backend response structure
- **Build Process**: Enhanced development workflow with zero compilation errors and improved IDE support

### Added - User Management & Invitation System

#### 🎯 **USER INVITATION FEATURE**: Complete User Management Interface

- **Invite User Button**: Added prominent green "Invite New User" button in user management header
- **Invitation Modal**: Implemented comprehensive modal with form validation for new user invitations
- **User Management API**: Enhanced admin API endpoints with `/api/admin/*` prefix for proper routing
- **Form Validation**: Added required field validation for email, first name, and last name
- **Loading States**: Implemented proper loading indicators during user invitation process

### Fixed - Admin Navigation & Authentication Flow

#### 🔧 **ROUTING & API SEPARATION**: Resolved Frontend/Backend Route Conflicts

- **API Route Separation**: Fixed routing conflict between frontend routes (`/admin/*`) and API endpoints (`/api/admin/*`)
- **Vite Proxy Configuration**: Updated proxy to properly route API calls to backend while preserving frontend routing
- **SPA Route Handling**: Fixed Ctrl+F5 refresh issues that caused "Missing Authorization header" errors
- **Button Styling**: Resolved CSS override issues causing white-on-white button visibility problems
- **Authentication Flow**: Enhanced initialization timing to prevent premature API calls

#### 🎨 **UI/UX IMPROVEMENTS**: Enhanced Visual Design and User Experience

- **Button Visibility**: Fixed CSS inheritance issues with proper `!important` declarations for button styling
- **Color Scheme**: Implemented green theme for admin actions with proper hover states and transitions
- **Loading Indicators**: Added context-aware loading messages ("Initializing authentication..." vs "Loading users...")
- **Error Handling**: Enhanced error displays with retry authentication options
- **Modal Design**: Modern modal design with backdrop, shadows, and responsive layout

#### 🧹 **CODE CLEANUP**: Production-Ready Debug Removal

- **Console Logging**: Removed all development debug logging from production build
- **Environment Configuration**: Disabled development environment startup logs
- **Authentication Debugging**: Cleaned up Auth0 state logging while preserving error reporting
- **API Debug Output**: Removed verbose API request/response logging

#### 🔧 **ADMIN ACCESS IMPROVEMENTS**: Enhanced Navigation and Authentication Flow

- **Admin Panel Visibility**: Fixed admin panel link in user dropdown to only show for users with admin privileges
- **Race Condition Resolution**: Resolved race condition where AdminProtectedRoute checked admin status before AdminContext initialization
- **Routing Configuration**: Fixed React Router warning and improved admin route handling
- **Authentication Timing**: Enhanced authentication flow to properly wait for token initialization before access decisions
- **Error Boundaries**: Added comprehensive error handling for authentication failures with retry mechanisms

#### 🛠️ **Technical Implementation Details**

- **Header Component**: Added conditional rendering of admin panel link based on `isUserAdmin()` role check
- **AdminProtectedRoute**: Enhanced with proper timing controls to wait for both Auth0 and AdminContext initialization
- **Route Structure**: Improved routing configuration to prevent conflicts between admin and regular app routes
- **Debug Logging**: Added comprehensive debug logging for authentication flow troubleshooting
- **Error Recovery**: Implemented AdminErrorBoundary with retry authentication functionality

#### 🎯 **Navigation Flow Improvements**

- **Role-Based UI**: Admin panel link now properly hidden from non-admin users in navigation dropdown
- **Smooth Access**: Admin users can now successfully navigate to admin dashboard without redirects or race conditions
- **Loading States**: Improved loading indicators during authentication and admin access initialization
- **Error Handling**: Enhanced error messages and recovery options for authentication failures

#### 🔐 **Authentication Flow Enhancements**

- **Initialization Timing**: AdminProtectedRoute now waits for complete authentication initialization before making access decisions
- **Token Validation**: Added proper token availability checks before allowing admin access
- **Context Synchronization**: Improved synchronization between Auth0 context and AdminContext for consistent state
- **Debug Visibility**: Enhanced console logging for authentication troubleshooting and flow verification

#### 🧪 **Verification & Testing**

- **Admin Navigation**: ✅ Admin panel link visible only to admin users
- **Access Control**: ✅ Admin users can successfully access admin dashboard
- **Non-Admin Protection**: ✅ Non-admin users properly redirected from admin routes
- **Authentication Flow**: ✅ Smooth authentication without race conditions or timing issues
- **Error Recovery**: ✅ Authentication retry mechanisms working properly

### Fixed - Auth0 Authentication & Shared Tenant Support

#### 🔐 **CRITICAL AUTHENTICATION FIXES**: Resolved Auth0 Integration Issues

- **Infinite Loading Fix**: Resolved infinite loading state in admin authentication system
- **JWT Token Authentication**: Fixed all API calls to properly include and validate JWT tokens
- **Shared Auth0 Tenant Support**: Implemented dual namespace support for shared Auth0 tenant between Mom's Recipe Box and Cruise Viewer applications
- **Audience Parameter Restoration**: Corrected Auth0 audience configuration for proper backend API authentication
- **Admin Role Detection**: Enhanced role checking to support both `https://momsrecipebox.app/roles` and `https://cruise-viewer.app/roles` custom claims

#### 🛠️ **Technical Implementation Details**

- **Frontend Authentication Context**: Updated `AdminContext.tsx` with proper audience parameter and dual namespace support
- **Backend JWT Validation**: Enhanced `jwt_validator.js` to accept roles from both Auth0 namespaces
- **Admin Role Checking**: Updated `checkUserIsAdmin` function in `auth/types.ts` to support both namespace claims
- **API Client Updates**: All admin API methods now properly pass authentication tokens
- **Token Management**: Enhanced useAdminAuth hook with comprehensive token debugging and error handling

#### 🎯 **Authentication Flow Improvements**

- **Token Debugging**: Added detailed console logging for authentication troubleshooting
- **Error Handling**: Improved error messages and recovery for authentication failures
- **Logout Functionality**: Proper logout implementation with Auth0 SDK
- **Cross-Application Support**: Admin roles now recognized from both Mom's Recipe Box and Cruise Viewer for shared tenant scenarios

#### 🔐 **Security Enhancements**

- **Audience Validation**: Proper JWT audience verification (`https://momsrecipebox-admin-api`)
- **Namespace Isolation**: Support for multiple application namespaces while maintaining security
- **Token Lifecycle**: Proper token management and refresh handling
- **Role-Based Access**: Granular permission checking with proper custom claims validation

#### 🧪 **Verification & Testing**

- **Admin Dashboard**: ✅ Successfully loads and authenticates users
- **User Management**: ✅ Admin functionality fully operational with authenticated API calls
- **Role Detection**: ✅ Both namespace claims properly recognized for admin access
- **Shared Tenant**: ✅ Multi-application Auth0 tenant support confirmed working
- **API Authentication**: ✅ All admin endpoints properly secured with JWT validation

### Added - Container-Native Secret Retrieval System

#### 🔒 **MAJOR SECURITY ENHANCEMENT**: Eliminated Profile File Secret Exposure

- **Container-Native Secret Retrieval**: Containers now fetch secrets directly from AWS Secrets Manager at startup
- **Zero Secret Files**: Profile files (`current-profile.env`) now contain only configuration placeholders, no actual secrets
- **Runtime Security**: Secrets exist only in memory during container execution, never persisted to disk
- **AWS CLI Integration**: Added AWS CLI and `jq` to Docker containers for secure secret retrieval
- **Host Script Compatibility**: Enhanced `db-test.js` to retrieve secrets from AWS when running on host machine

#### 🛠️ **Technical Implementation**

- **Enhanced Dockerfile**: Added `yum install -y aws-cli jq` for runtime secret management capabilities
- **Secure Entrypoint**: Docker Compose entrypoint script retrieves all secrets before application startup
- **AWS Credential Mounting**: Host AWS credentials directory mounted read-only into containers
- **Profile Manager Simplification**: Removed secret fetching from `profile-manager.js`, now generates config-only files
- **Application Code Cleanup**: Removed credential fallback code from `app.js` and `database-health.js`

#### 🎯 **Security Benefits**

- **No Secrets in Version Control**: All profile files safe for git commits
- **Container Restart Security**: Fresh secret retrieval on every container startup

#### 🔐 **Auth0 Integration with Container-Native Security**

- **Extended Security Model**: Applied container-native secret retrieval pattern to Auth0 Management API
- **AWS Secret Integration**: Auth0 credentials (`AUTH0_DOMAIN`, `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET`) now retrieved from AWS Secrets Manager
- **Configuration-Based Auth0**: All Auth0 functions updated to use `getAuth0Config()` with AWS fallback instead of hardcoded environment variables
- **Token Caching**: Implemented Management API token caching with expiration tracking to minimize AWS API calls
- **Comprehensive Testing**: Added `test-auth0-setup.js` for validating Auth0 connectivity and secret retrieval
- **Consistent Security**: Auth0 utilities now match MongoDB security patterns for credential management
- **Enhanced Audit Trail**: All secret access through AWS CloudTrail via Secrets Manager
- **Principle of Least Exposure**: Secrets only accessible during active container runtime

#### 🧪 **Verification & Testing**

- **Container Integration**: ✅ Containers successfully retrieve secrets and connect to MongoDB Atlas
- **Host Script Compatibility**: ✅ `npm run db:test` works with AWS secret retrieval
- **Application Health**: ✅ All health endpoints operational with secure secret management
- **Profile File Security**: ✅ `current-profile.env` contains only placeholders like `${MONGODB_ATLAS_URI}`

### Fixed - Google Gemini API Integration

#### 🤖 AI Provider Restoration

- **Google Gemini API**: Updated to use current `gemini-2.5-flash` model (was `gemini-1.5-flash`)
- **API Endpoint**: Updated from `/v1/` to `/v1beta/` as required by current Google Gemini API
- **Atlas Docker**: Fixed Lambda entrypoint issue preventing Express server startup in Atlas mode
- **Database Connection**: Resolved MongoDB URI override preventing Atlas connection in docker-compose
- **Provider Testing**: All 5 AI providers (Google, OpenAI, Groq, Anthropic, DeepSeek) now operational

#### 🛠️ Technical Improvements

- **Docker Entrypoint**: Added `entrypoint: [""]` override for Lambda base image compatibility
- **Environment Variables**: Fixed `MONGODB_URI` configuration in docker-compose.atlas.yml
- **API Documentation**: Updated technical documentation to reflect current model versions

## [Previous] - 2025-10-16

### Fixed - Recipe Detail Image Display

#### 🖼️ Image Display Resolution

- **Recipe Detail Images**: Fixed recipe detail screens showing default images instead of actual recipe photos
- **Direct S3 URLs**: Updated ImagePane component to use direct S3 URLs with proper region (us-west-2)
- **Correct Bucket**: Updated to use correct `mrb-recipe-images-dev` bucket name
- **Smart Fallback**: Implemented extension fallback chain (.png → .jpg → .jpeg → .webp)
- **Region Handling**: Added support for existing S3 URLs missing region specification
- **Consistency**: Updated RecipeCard component to use same S3 URL format
- **Performance**: Removed complex retry logic in favor of simple, reliable fallback mechanism

### Added - Four-Profile Deployment System

#### 🎯 Major Feature: Unified Profile Management

- **Four-Profile Architecture**: Replaced scattered mode configuration with unified profile system
  - `local`: Local MongoDB + Local Express + UI Proxy (full local development)
  - `atlas`: Atlas MongoDB + Local Express + UI Proxy (shared cloud database)  
  - `lambda`: Atlas MongoDB + AWS Lambda + UI Direct (serverless testing)
  - `cloud`: Atlas MongoDB + AWS Lambda + CloudFront (full production)

- **Profile Management Script**: New `scripts/profile-manager.js` with comprehensive profile management
- **NPM Scripts**: Added `profile:*` commands for clean profile switching
- **Dynamic Environment Generation**: `config/current-profile.env` (git-ignored)
- **Profile Definitions**: `config/deployment-profiles.json` with all four profiles

#### 🔧 Configuration Management

- **Single Source of Truth**: Eliminated conflicting .env files across directories
- **Environment Variable Substitution**: Automatic resolution of static to dynamic variables
- **Cross-Platform**: Node.js script replaces platform-specific solutions

#### 📚 Documentation Updates

- Updated README.md with new Deployment Profiles section
- Updated QUICK_START_GUIDE.md with profile selection workflow
- Added comprehensive architecture documentation in `docs/`

### Fixed

- **Mode Configuration Conflicts**: Resolved conflicting environment variables
- **Inconsistent Mode Names**: Standardized mode values across all components  
- **Scattered Configuration**: Consolidated environment management

### Changed

- Environment file structure with static/dynamic separation
- Profile switching now configures all components consistently

## [Phase 4.2] - 2025-09-29

### 🔧 CRITICAL FIXES: NPM MODERNIZATION & BACKUP RESTORATION

**Objective**: Fix critical issues from PowerShell to NPM modernization and ensure reliable backup/restore functionality.

### Fixed

- **MongoDB Restore Script Fixes**:
  - ✅ Fixed JMESPath syntax error in S3 backup listing query
  - ✅ Updated backup detection from zip files to folder-based backups  
  - ✅ Fixed S3 download to use `aws s3 sync` for folder backups instead of `aws s3 cp`
  - ✅ Added proper MongoDB authentication parameters for container restore
  - ✅ Fixed backup path handling for nested directory structures
  - ✅ Updated configuration to read MongoDB credentials from .env file

- **Environment Configuration**:
  - ✅ Fixed MongoDB URI to use container name `mongo:27017` instead of `localhost:27017`
  - ✅ Added missing MongoDB credentials to .env template
  - ✅ Ensured proper environment variable loading for all scripts

- **NPM Command Improvements**:
  - ✅ Enhanced `dev:*` commands with automatic container cleanup
  - ✅ Fixed mode switching to prevent container conflicts
  - ✅ Added comprehensive safety checks to prevent mixed-mode containers

### Tested & Verified

- ✅ **Complete local development setup**: `npm run dev:local`
- ✅ **S3 backup restoration**: `npm run restore:from-s3`
- ✅ **Data integrity**: 36 recipes, 79 favorites, 118 total documents restored
- ✅ **Container orchestration**: Clean mode switching without conflicts
- ✅ **Health monitoring**: All systems healthy after rebuild

### Breaking Changes

- Backup restore now requires proper .env configuration with MongoDB credentials
- Container names must be used for internal Docker network communication

---

## [Phase 4.1 STARTED] - 2025-09-24

### ðŸš€ PHASE 4: UI DEVOPS INTEGRATION BEGINS - ENVIRONMENT SETUP COMPLETE ðŸš€

**Objective**: Integrate React UI into comprehensive DevOps pipeline with environment-aware configuration and multi-tier deployment capabilities.

### Added

- **Environment Configuration System**:

  - `ui/src/config/environment.ts` - Environment-aware API configuration

  - Support for `local`, `atlas`, `lambda`, and `production` environments

  - Automatic API endpoint switching based on deployment mode

  - Development logging and debugging capabilities

- **Enhanced API Client**:

  - `ui/src/lib/api-client.ts` - Environment-aware HTTP client

  - Automatic timeout and retry configuration per environment

  - Comprehensive error handling and logging

  - Typed API endpoints for recipes, images, and admin functions

- **Multi-Environment Build System**:

  - Environment-specific build scripts: `build:local`, `build:atlas`, `build:lambda`, `build:production`

  - Environment-specific development servers: `dev:local`, `dev:atlas`, `dev:lambda`

  - Cross-platform environment variable handling with `cross-env`

  - Production-optimized builds with source maps and minification

- **Enhanced NPM Scripts**:

  - 12+ new UI-focused commands in root package.json

  - Full-stack development mode: `fullstack:local`, `fullstack:atlas`

  - Integrated UI preview capabilities across all environments

  - Support for concurrent API and UI development

- **Environment Files**:

  - `.env.local` - Local development (localhost:3000)

  - `.env.atlas` - Atlas development (localhost:3000 with Atlas DB)

  - `.env.lambda` - Lambda cloud development (API Gateway)

  - `.env.production` - Production deployment (S3 + CloudFront)

### Technical Implementation

- **Vite Configuration**: Environment-aware proxy settings and build optimization

- **TypeScript Support**: Full type safety across environment configuration

- **Development Logging**: Environment-specific console logging for debugging

- **Build Artifacts**: Optimized bundle splitting (vendor, query, main chunks)

### Validated Features

âœ… **Local Environment**: UI builds and runs with localhost API endpoints

âœ… **Atlas Environment**: UI builds and runs with Atlas MongoDB configuration

âœ… **Lambda Environment**: UI builds in production mode for Lambda integration

âœ… **Cross-Platform**: Windows PowerShell compatibility with cross-env

âœ… **Development Server**: Vite dev server running on port 5173 with environment detection

### Next: Phase 4.2 S3 + CloudFront Infrastructure Setup

- Terraform S3 bucket configuration for static hosting

- CloudFront CDN distribution setup

- SSL certificate automation

- Custom domain integration (optional)

---

## [Phase 3 COMPLETE] - 2025-09-24

### ðŸŽ‰ PHASE 3 POWERSHELL MODERNIZATION COMPLETE - 100% SUCCESS ðŸŽ‰

**The complete elimination of critical PowerShell dependencies has been achieved!**

Mom's Recipe Box now operates as a fully modern, cross-platform development environment with professional-grade automation and enhanced developer experience. All 5 critical PowerShell script categories have been successfully migrated to Node.js alternatives.

### Final Migration Summary

- âœ… **Phase 3.1**: MongoDB Mode Switching (December 2024)

- âœ… **Phase 3.2**: Container Build Pipeline (February 2025)

- âœ… **Phase 3.3**: Database Backup/Restore System (February 2025)

- âœ… **Phase 3.4**: AWS Profile Management (September 2025)

- âœ… **Phase 3.5**: Development Environment Setup (September 2025)

### Total Achievements

- **8 PowerShell scripts replaced** with 6 enhanced Node.js alternatives

- **2,400+ lines of cross-platform code** with comprehensive error handling

- **25+ npm scripts added** for unified development workflow

- **100% cross-platform compatibility** (Windows, macOS, Linux)

- **Enhanced security, performance, and maintainability** across all components

### Ready for Phase 4: Advanced Features & UI Integration ðŸš€

## [Phase 3.4] - 2025-09-24

### Added âœ… PHASE 3 AWS PROFILE MANAGEMENT COMPLETE - 80% PHASE 3 MILESTONE

- **Cross-platform AWS Profile Manager** - `scripts/aws-profile.js` replaces PowerShell scripts `toggle-aws-profile.ps1` and `set-aws-profile-mrbapi.ps1`

- **npm Script Integration** - 5 new commands: `aws:mrb-api`, `aws:terraform`, `aws:toggle`, `aws:status`, `aws:validate`

- **Enhanced Profile Switching** - Smart toggle between mrb-api and terraform-mrb profiles with validation

- **Advanced Validation** - Pre-switch profile validation prevents failed profile switches

- **Rich Console Output** - Color-coded status messages and detailed AWS identity information

- **Cross-platform Compatibility** - Works on Windows, macOS, and Linux without PowerShell dependency

### Enhanced

- **Error Handling** - Comprehensive error messages with troubleshooting guidance for AWS CLI issues

- **User Experience** - Smart profile detection, detailed identity display, and formatted output

- **Integration** - Seamless integration with existing development workflow and npm script ecosystem

- **Security** - Uses existing AWS CLI credential chain without additional credential storage

### Technical Implementation

- **Zero Dependencies** - Uses Node.js built-ins only, no additional package dependencies required

- **AWS CLI Integration** - Direct integration with existing AWS CLI configurations and profiles

- **Environment Variables** - Secure cross-platform environment variable handling

- **Profile Isolation** - Maintains AWS CLI profile security model and isolation

### Migration Progress

- âœ… **MongoDB Mode Switcher** (1/5) - Phase 3.1 Complete

- âœ… **Container Build Pipeline** (2/5) - Phase 3.2 Complete

- âœ… **Database Backup/Restore** (3/5) - Phase 3.3 Complete

- âœ… **AWS Profile Management** (4/5) - Phase 3.4 Complete

- ðŸ”„ **Development Environment Setup** (5/5) - Phase 3.5 In Progress

**Phase 3 Status: 80% Complete** - 4 of 5 critical PowerShell script categories successfully migrated to cross-platform Node.js alternatives.

## [Phase 3.1] - 2024-12-19

### Added âœ… PHASE 3 MONGODB SWITCHER MIGRATION COMPLETE

- **Cross-platform MongoDB Mode Switcher** - `scripts/switch-mode.js` replaces PowerShell-only `Toggle-MongoDbConnection.ps1`

- **npm Script Integration** - 6 new commands: `mode:local`, `mode:atlas`, `mode:current`, `mode:toggle`, `mode:switch`, `mode:cleanup`

- **Enhanced Container Management** - Uses `docker-compose down` instead of `stop` to keep Docker Desktop clean

- **AWS Secrets Manager Integration** - Automatic Atlas credential retrieval for cloud database connections

- **Improved Error Handling** - Comprehensive error messages and recovery guidance

- **Cross-platform Compatibility** - Works on Windows, macOS, and Linux without PowerShell dependency

### Enhanced

- **Documentation** - Added comprehensive MongoDB mode switching guide (`docs/technical/mongodb_mode_switching.md`)

- **README** - Updated with MongoDB mode management section and deployment modes documentation

- **Container Lifecycle** - Improved cleanup to remove stopped containers completely

- **User Experience** - Added ASCII banner, colored output, and progress indicators

### Technical Implementation

- **Parallel Operation** - New Node.js script operates alongside existing PowerShell script

- **Feature Parity** - 100% compatibility with existing MongoDB switching functionality

- **Docker Compose Profiles** - Leverages `local` and `atlas` profiles for clean environment isolation

- **Environment Management** - Automatic `.env` file updates for seamless mode transitions

### Migration Progress

- âœ… **MongoDB Mode Switcher** (1/5 critical PowerShell scripts) - **COMPLETE**

- âœ… **Container Build Pipeline** (2/5) - **COMPLETE** - `scripts/build-container.js` replaces `PushAppTierContainer.ps1`

- â³ **Database Backup Scripts** (3/5) - Next target: Backup/restore PowerShell automation

- â³ **AWS Profile Management** (4/5) - Target: `toggle-aws-profile.ps1`

- â³ **Development Environment Setup** (5/5) - Target: Various setup scripts

### Notes

- **Backward Compatibility** - PowerShell scripts preserved and continue to function

- **Developer Choice** - Teams can use either PowerShell or npm-based commands

- **Foundation for Phase 3** - Establishes pattern for remaining PowerShell modernization

---

## [Phase 3.3] - 2024-12-19

### Added âœ… DATABASE BACKUP/RESTORE PIPELINE MIGRATION COMPLETE

- **Cross-platform Backup Manager** - `scripts/backup-mongodb.js` replaces comprehensive PowerShell backup system

- **Cross-platform Restore Manager** - `scripts/restore-mongodb.js` replaces PowerShell restore scripts

- **npm Backup Integration** - 5 new commands: `backup:local`, `backup:atlas`, `backup:full`, `backup:archive`, `backup:dry-run`

- **npm Restore Integration** - 4 new commands: `restore:from-local`, `restore:from-s3`, `restore:latest`, `restore:dry-run`

- **S3 Cloud Storage** - Modern AWS SDK v3 integration for backup uploads and downloads

- **Safety Features** - Pre-restore backup creation, dry-run modes, integrity verification

### Enhanced Database Operations

- **Local MongoDB Support** - Docker container mongodump/mongorestore operations

- **Atlas Cloud Support** - Direct Atlas connection with AWS Secrets Manager credentials

- **Compression Management** - ZIP archive creation and extraction with archiver library

- **Metadata Tracking** - JSON metadata with database statistics and audit trails

- **Collection Filtering** - Selective backup/restore of specific collections

- **Integrity Verification** - BSON validation and document count verification

### S3 Integration Features

- **Automatic Upload** - Seamless backup upload to S3 with organized folder structure

- **Backup Listing** - Query and display available S3 backups with size and date information

- **Latest Selection** - Automatic identification and restore of most recent backup

- **Download Management** - Automatic S3 download and local extraction for restore operations

- **Profile Integration** - Uses terraform-mrb AWS profile for all cloud operations

### Migration Scope

**PowerShell Scripts Replaced:**

- `scripts/Backup-MongoDBToS3.ps1` â†’ `npm run backup:full`

- `scripts/local_db/backup-mongodb.ps1` â†’ `npm run backup:local`

- `scripts/Restore-MongoDBFromS3.ps1` â†’ `npm run restore:latest`

- `scripts/local_db/restore-mongodb.ps1` â†’ Direct script execution

- Multiple auxiliary backup/restore PowerShell utilities integrated

### Technical Enhancements

- **AWS SDK v3** - Modern cloud integration replacing AWS CLI-only approaches

- **Enhanced Error Handling** - Comprehensive async error handling with recovery guidance

- **Safety Backups** - Automatic pre-restore backup creation for rollback capability

- **Progress Indicators** - Real-time colored output showing operation progress

- **Cross-Platform Paths** - Proper path handling for Windows, macOS, and Linux

### Migration Progress Update (60% Complete)

- âœ… **MongoDB Mode Switcher** (1/5 critical PowerShell scripts) - **COMPLETE**

- âœ… **Container Build Pipeline** (2/5 critical PowerShell scripts) - **COMPLETE**

- âœ… **Database Backup/Restore** (3/5 critical PowerShell scripts) - **COMPLETE**

- â³ **AWS Profile Management** (4/5) - Next target: `toggle-aws-profile.ps1`

- â³ **Development Environment Setup** (5/5) - Final target: Various setup scripts

---

### Added âœ… CONTAINER BUILD PIPELINE MIGRATION COMPLETE

- **Cross-platform Container Builder** - `scripts/build-container.js` replaces PowerShell-only `PushAppTierContainer.ps1`

- **npm Build Integration** - 3 new commands: `build:container`, `build:push`, `build:dry-run`

- **Enhanced ECR Management** - Automatic Docker login with proper error handling

- **Lambda-Compatible Builds** - Correct platform settings (`linux/amd64`, disabled attestations/SBOM)

- **Multi-Tag Strategy** - Automatic tagging with `latest`, `dev`, and `git-<sha>` tags

- **Lambda Function Updates** - Optional automatic Lambda function code updates

### Enhanced Build Features

- **Pre-flight Checks** - Validates Docker running and AWS credentials before build

- **Progress Indicators** - Real-time colored output showing build progress

- **Build Summary** - Comprehensive report with tags, duration, and Lambda status

- **Dry Run Mode** - Safe configuration preview without executing builds

- **Help System** - Detailed examples and migration guidance from PowerShell

### Technical Implementation

- **Parallel Operation** - New Node.js script operates alongside existing PowerShell script

- **Feature Parity** - 100% compatibility with PowerShell container build process

- **Cross-Platform** - Works on Windows, macOS, and Linux without PowerShell dependency

- **Error Recovery** - Comprehensive error handling with recovery suggestions

- **Git Integration** - Automatic SHA detection for container tagging

### Migration Progress Update

- âœ… **MongoDB Mode Switcher** (1/5 critical PowerShell scripts) - **COMPLETE**

- âœ… **Container Build Pipeline** (2/5 critical PowerShell scripts) - **COMPLETE**

- âœ… **Database Backup/Restore** (3/5 critical PowerShell scripts) - **COMPLETE** - `scripts/backup-mongodb.js` & `scripts/restore-mongodb.js`

- â³ **AWS Profile Management** (4/5) - Target: `toggle-aws-profile.ps1`

- â³ **Development Environment Setup** (5/5) - Target: Various setup scripts

### Developer Experience

- **Faster Execution** - Node.js startup significantly faster than PowerShell

- **IDE Integration** - Works in any terminal or IDE environment

- **CI/CD Ready** - Compatible with GitHub Actions and other automation platforms

- **Comprehensive Help** - Built-in usage examples and troubleshooting

---

### Added

- **Phase 3 Modernization - MongoDB Mode Switcher**: Critical PowerShell script migration to Node.js

  - `scripts/switch-mode.js` - Cross-platform replacement for `Toggle-MongoDbConnection.ps1`

  - Complete feature parity with PowerShell version including ASCII banner and CLI interface

  - npm scripts for MongoDB mode management: `mode:switch`, `mode:local`, `mode:atlas`, `mode:current`, `mode:toggle`

  - Docker compose profile management for local/atlas mode switching

  - AWS Secrets Manager integration for secure Atlas URI retrieval

  - Comprehensive error handling and user-friendly help system

  - Parallel operation support - both PowerShell and Node.js scripts functional

- **Phase 2 Modernization**: Cross-platform Node.js tooling for core DevOps operations

  - `scripts/test-lambda.js` - Lambda connectivity testing with safety features

  - `scripts/db-tunnel.js` - SSH tunnel management through AWS bastion

  - `scripts/deploy-lambda.js` - Modern container deployment with ECR integration

  - `scripts/aws-profile.js` - AWS profile and identity management

- Enhanced npm scripts with 25+ automation commands for deployment workflows

- MRBDevOpsOperations IAM policy with comprehensive Lambda/ECR/SSM permissions

- Database seeding functionality removed for production safety

- Real infrastructure monitoring with AWS service integration replacing "Coming Soon!" placeholders

- Comprehensive S3 orphan image analysis and cleanup tools (removed 32 orphaned images, 14.79 MB)

- Lambda tag filtering for accurate infrastructure metrics

- S3 image-only bucket analysis for mrb-recipe-images-dev

- Backup folder counting with proper structure analysis

- Infrastructure deployment status monitoring

- Admin API endpoint for recipe ID retrieval (`/admin/recipe-ids`)

- Intelligent container management with profile-based Docker operations

### Fixed

- **Phase 3 Cross-Platform Compatibility**: Eliminated PowerShell dependency for MongoDB mode switching

  - Fixed Docker compose profile management for reliable container switching

  - Enhanced error handling with user-friendly messages and recovery suggestions

  - Improved AWS Secrets Manager integration with proper credential handling

- **Critical Windows Fix**: ES modules path detection for Node.js scripts on Windows

  - Fixed `import.meta.url` vs `process.argv[1]` path format mismatch

  - Scripts now use `fileURLToPath()` and `resolve()` for cross-platform compatibility

  - All Node.js automation scripts now work correctly on Windows PowerShell

- **Critical Bug**: Recipe deletion now properly cleans up associated S3 images preventing future orphans

- Delete recipe handler completely rewritten with comprehensive S3 cleanup

- Multiple image extension support (png, jpg, jpeg, gif, webp) in S3 cleanup

- Legacy image format handling in delete operations

- Cross-environment testing and validation for Atlas/Local consistency

- Container restart logic with intelligent detection and selective stopping

### Changed

- **Phase 2 Complete**: PowerShell scripts now have Node.js cross-platform alternatives

- Enhanced package.json with comprehensive npm scripts for all deployment modes

- AWS CLI integration standardized across all Node.js tooling

- Updated Swagger documentation for delete recipe endpoint with new response format

- Test files updated to validate new delete response format including `deletedImages` count

- Admin infrastructure monitoring shows real health system integration

- System status endpoints provide actual AWS service metrics

- PowerShell scripts enhanced for better S3 analysis and AWS CLI integration

### Security

- IAM permissions refined with principle of least privilege for MRBDevOpsOperations

- Database seeding removed from production tooling for safety

- Comprehensive error handling in S3 deletion operations with detailed logging

- Proper AWS SDK integration with secure credential management

## [1.1.0] - 2025-08-28

### Added

- Full shopping list functionality with MongoDB persistence

- Shopping list UI with recipe grouping and item management

- Test script for adding sample shopping list items

- Field naming compatibility between frontend and backend

### Fixed

- Shopping list items now display correctly regardless of field naming

- Field naming inconsistencies between frontend and backend

- Debug component repositioned to avoid overlapping with content

- Shopping list documentation updated to reflect current implementation

### Changed

- Removed debug logging statements from shopping list component

- Updated documentation across all README files

- Improved error handling in shopping list handlers

- Made UI components more robust with field name fallbacks

## [2.0.0] - 2025-09-24

### Added

- **VPC Configuration Cleanup**: Removed unnecessary VPC configuration and resources for simplified infrastructure

- **Phase 2 DevOps Modernization**: Complete cross-platform Node.js DevOps tooling implementation

- **Phase 1 DevOps Modernization**: Foundation & CI/CD Pipeline enhancements

- **CI/CD Modernization Plan**: Comprehensive development operations modernization strategy

### Fixed

- Lambda deployment script corruption and configuration issues

- Vite proxy support for admin API routes

## [1.9.0] - 2025-09-21

### Added

- **Real Infrastructure Monitoring**: Live AWS service integration with orphaned S3 image analysis

- **Comprehensive S3 Cleanup**: Enhanced delete recipe handler with proper S3 image cleanup

- **Database Standardization**: Unified 'moms_recipe_box' database naming across all environments

### Fixed

- Critical S3 orphan bug in recipe deletion process

- MongoDB Atlas database name mismatch issues

- AWS IAM architecture cleanup

### Changed

- Improved infrastructure restart mechanisms

## [1.8.0] - 2025-09-17

### Added

- **Secure MongoDB Configuration**: Implemented secure configuration patterns

- **Documentation Restructure**: Eliminated redundancy across markdown files

- **Markdownlint Compliance**: Fixed formatting issues across all documentation

### Removed

- **Secrets Management Capability**: Removed for enhanced security

- **GitHub Secret Alerts**: Fixed MongoDB Atlas URI exposure

### Changed

- Improved MongoDB comparison script with better connection handling

- Cleaned up MongoDB Atlas Management guide

## [1.7.0] - 2025-09-13

### Added

- **Comprehensive Admin Analytics Dashboard**: Complete analytics system implementation

- **Individual Infrastructure Service Testing**: Enhanced testing with comprehensive documentation

- **Simplified Admin Role Structure**: Collapsed SUPER_ADMIN into ADMIN for streamlined permissions

### Enhanced

- Admin infrastructure monitoring dashboard with comprehensive service coverage

## [1.6.0] - 2025-09-10

### Added

- **Modernized Admin Dashboard**: React Query integration and lazy loading implementation

- **Enhanced AI Services Monitoring**: Comprehensive admin API with AI service oversight

- **Admin Panel Improvements**: Enhanced user interface and functionality

### Changed

- Improved AI Service Admin interface and capabilities

## [1.5.0] - 2025-09-09

### Added

- **Enterprise-Grade MongoDB Backup System**: Complete backup and restore functionality

- **Database Quality Monitoring**: Comprehensive health checks and quality assurance

- **Multi-Agent Recipe Assistant**: OpenAI & Groq integration for recipe creation

- **Gemini AI Integration**: Additional AI provider support

### Fixed

- Health checker field validation to match actual data model

## [1.4.0] - 2025-09-04

### Added

- **Complete Postman Admin API Integration**: Secure M2M authentication for API testing

- **Comprehensive Admin System**: Full system monitoring and management capabilities

### Enhanced

- Admin system functionality and monitoring capabilities

## [1.3.0] - 2025-09-03

### Added

- **Comprehensive Auth0 Admin System**: Complete M2M authentication with Management API access

- **JWT Security Validation**: Secure token validation with Auth0 signature verification

- **Role-Based User Management**: Full CRUD operations with MongoDB integration

- **Admin Testing Suite**: Complete test framework for admin functionality

- **Professional API Testing Tools**: Postman collections with comprehensive documentation

- **Production-Ready Admin Features**: Error handling, validation, and audit-ready logging

### Security

- **Granular Permissions System**: Role-based access control for all operations

- **Secure M2M Authentication**: Auth0 machine-to-machine authentication

- **Data Protection**: Comprehensive user data cleanup and self-deletion prevention

## [1.2.0] - 2025-08-31

### Added

- **AI Recipe Creation Wizard**: Complete AI-powered recipe generation with image selection

- **Universal Header System**: Consistent navigation across all pages

- **Sticky Navigation**: Enhanced user interface with persistent header and toolbar

### Fixed

- AI recipe assistant response handling and robustness improvements

- Image selection functionality in recipe creation

### Changed

- Moved left navigation to toolbar for better user experience

- Enhanced recipe categorization and empty list button handling

- Environment setup documentation with .env configuration

## [1.1.0] - 2025-08-28

### Added

- Full shopping list functionality with MongoDB persistence

- Shopping list UI with recipe grouping and item management

- Test script for adding sample shopping list items

- Field naming compatibility between frontend and backend

- **AI Categorization**: Intelligent shopping list item categorization

### Fixed

- Shopping list items now display correctly regardless of field naming

- Field naming inconsistencies between frontend and backend

- Debug component repositioning to avoid overlapping with content

- Shopping list documentation updated to reflect current implementation

### Changed

- Removed debug logging statements from shopping list component

- Updated documentation across all README files

- Improved error handling in shopping list handlers

- Made UI components more robust with field name fallbacks

## [1.0.0] - 2025-08-01

### Added

- **Initial Recipe Management System**: Complete CRUD operations for recipes

- **Image Upload and Management**: S3 integration for recipe images

- **Favorites/Likes System**: Scalable favorites system with denormalized likes count

- **Comments System**: Separate collection-based commenting functionality

- **Interactive Ingredient Management**: Draggable ingredients with grouping

- **Auth0 Authentication**: Initial authentication implementation

- **Recipe Editing**: Comprehensive edit functionality with image changes

- **Recipe Visibility Controls**: Owner-based visibility and permissions

### Infrastructure

- **MongoDB Migration**: Complete transition from PostgreSQL to MongoDB

- **Docker Containerization**: Local development with Docker containers

- **Lambda Integration**: Database initialization and API deployment

- **S3 Bucket Integration**: Image storage and retrieval system

- **Test Framework**: Comprehensive testing suite with standardized framework

- **Swagger Documentation**: Complete API documentation

### UI/UX

- **Recipe Grid Layout**: Functioning recipe list with card-based display

- **Recipe Detail Views**: Comprehensive recipe display with editing capabilities

- **Left Navigation**: Initial navigation structure

- **Responsive Design**: Mobile-friendly interface elements

## [0.9.0] - 2025-07-31

### Added

- **Database Architecture Migration**: Refactored to MongoDB in local Docker container

- **Lambda Database Initialization**: Working database setup automation

### Infrastructure

- **Terraform Cleanup**: Removed legacy RDS and Aurora infrastructure

- **Docker Force Refresh**: Enhanced Lambda deployment with container updates

## [0.8.0] - 2025-07-15

### Added

- **Aurora DSQL Evaluation**: Experimental Aurora DSQL integration (later disabled)

- **Terraform Database Cleanup**: Comprehensive cleanup of database layer

### Changed

- Turned off Aurora DSQL pending full platform support

- Updated database documentation and README files

## [0.7.0] - 2025-07-10

### Added

- **Aurora DSQL Migration**: Initial migration from PostgreSQL to Aurora DSQL

- **S3 Bucket Integration**: Added S3 bucket for file storage

### Infrastructure

- Database architecture evaluation and migration planning

## [0.6.0] - 2025-06-21

### Added

- **Complete App Tier**: Base application tier with all methods implemented

- **Swagger Integration**: End-to-end tested API documentation

- **Recipe Schema**: Initial recipe data structure (15 test recipes)

### Development

- App tier refactoring and comprehensive testing

- Local server integration and testing

## [0.5.0] - 2025-06-20

### Added

- **Local Database Container**: Working start and stop functionality for local MongoDB

- **Container Management**: Database tier containerization

- **Development Environment**: Split app and database tiers

### Infrastructure

- Local development environment with container orchestration

## [0.4.0] - 2025-06-16

### Added

- **Aurora Cost Management**: Enable/disable Aurora to control costs

- **PostgreSQL Connection Pool**: MRB-34 implementation for database connectivity

- **Path Management**: Enhanced routing and path logic

- **Mutable/Non-mutable Tags**: Docker container tagging strategy

### Fixed

- Various path-related bugs and routing issues

- API Gateway development environment configuration

## [0.3.0] - 2025-06-13

### Added

- **API Gateway Integration**: GET /recipes endpoint implementation

- **Docker Build Pipeline**: Restored Docker build functionality

- **Handler Organization**: Moved handlers to dedicated folder structure

### Infrastructure

- API Gateway routing and integration

- Docker deployment automation

## [0.2.0] - 2025-06-12

### Added

- **Aurora Serverless V2**: Switched to Aurora Serverless V2 architecture

- **POST Recipe Endpoint**: Initial recipe creation functionality

- **GitHub Actions**: CI/CD pipeline implementation

- **Recipe Management**: Get, Create, and List recipe operations

### Infrastructure

- Aurora Serverless database implementation

- CI/CD automation setup

- Terraform deployment automation

## [0.1.0] - 2025-06-09

### Added

- **Database Testing**: Complete database connectivity validation

- **Bastion Server**: Secure database access through bastion host

- **Log Retention**: Enhanced logging with configurable retention

- **Documentation**: Comprehensive README and setup guides

### Infrastructure

- **PostgreSQL Database**: RDS PostgreSQL implementation

- **Bastion Host**: Secure database access architecture

- **VPC Network**: Eliminated overlapping ingress rules

### Documentation

- Fixed README formatting issues

- Added bastion server documentation

## [0.0.1] - 2025-06-03

### Added

- **Initial Project Structure**: Basic project scaffold and configuration

- **Infrastructure Foundation**: Initial Terraform configuration for AWS resources
