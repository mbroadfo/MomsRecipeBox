# MomsRecipeBox

A secure, multi-family recipe sharing platform with a modular architecture: infrastructure (Terraform), backend API (Node.js + MongoDB), and modern React frontend with comprehensive admin monitoring.

## � Recent Improvements (October 2025)

### TypeScript & Code Quality Enhancements

- **Complete TypeScript Migration**: Eliminated all `any` types across the frontend codebase for improved type safety
- **Enhanced Interfaces**: Created comprehensive type definitions for Recipe data, Admin API responses, and component props
- **Improved Error Handling**: Implemented proper error boundaries and type-safe error handling throughout the application
- **Authentication System**: Updated Auth0 integration with proper TypeScript types and user management
- **Admin Dashboard**: Enhanced admin functionality with strongly-typed API interactions and improved data validation
- **Linting Configuration**: Comprehensive ESLint and markdown linting setup with proper ignore patterns

### Technical Debt Reduction

- **Zero Linting Errors**: Achieved 100% clean linting across all TypeScript files
- **Type Safety**: Replaced all loose typing with strict interfaces and proper type guards
- **Code Consistency**: Standardized import patterns and component structure throughout the application
- **Developer Experience**: Improved IDE support with better autocomplete and error detection

## �🔧 Development & DevOps

### GitHub Actions

- **Code Quality Validation**

## 🛡️ Database Backup & Restore

Your family recipes and user data are protected with a comprehensive

We welcome contributions to MomsRecipeBox! To contribute:

1. Add or modify handlers under `/app/handlers` (return `{ statusCode, body }`)
2. Update API documentation for new/changed endpoints
3. Add tests in `/app/tests` (name `test_*.js`)
4. Reflect data model changes in the appropriate documentation

## 🗺️ Development Roadmap & Testing Plan

### Current Testing Plan (September 2025)

1. **Local Mode Testing (Completed)**
   - ✅ Fix restore script for local MongoDB
   - ✅ Verify restore from S3 backup
   - ✅ Confirm data integrity and verification
   - ✅ Test local API with restored data

2. **Atlas Mode Testing (Next)**
   - Switch to Atlas mode: `npm run mode:atlas`
   - Restore from S3 to Atlas: `npm run restore:latest`
   - Verify database integrity
   - Test API connections with Atlas
   - Confirm data model compatibility

3. **Lambda Mode Testing (Final)**
   - Switch to Lambda mode: `npm run mode:lambda`
   - Deploy Lambda with latest code
   - Test Lambda connectivity
   - Verify API endpoints via Lambda
   - Confirm end-to-end functionality

### Completion Criteria

- All three deployment modes working correctly
- Restore process fully automated and verified
- Documentation updated to reflect latest changes
- All tests passing in each environmentd restore system. Our cross-platform Node.js scripts replace PowerShell with enhanced functionality:

```bash
# Create a backup
npm run backup:atlas

# Restore from backup (FIXED and verified working)
npm run restore:latest

# List available backups
npm run backup:list

# Emergency restore from specific backup
npm run restore:from-s3 --backup="backup_2025-01-17_09-07-12"
```

**What was fixed:**

- ✅ Container name consistency between scripts and Docker Compose
- ✅ JSON parsing for MongoDB extended JSON types
- ✅ Proper authentication for database operations
- ✅ Enhanced error handling and debugging output

**Legacy PowerShell commands (still supported):**

```powershell
# Create a backup
.\scripts\Backup-MongoDBToS3.ps1

# Restore from backup
.\scripts\Restore-MongoDBFromS3.ps1 -BackupPath "path/to/backup"
```amily recipes and user data are protected with a comprehensive backup and restore system. **Recently fixed and fully working!**

```bash
# Restore from S3 backup (✅ Now working!)
npm run restore:from-s3

# Restore latest backup automatically  
npm run restore:latest

# Create a backup to S3
npm run backup:atlas

# Test restore without making changes
npm run restore:dry-run

# Restore from local backup files
npm run restore:from-local
```

**What was fixed:**

- ✅ JMESPath syntax errors in S3 queries
- ✅ Folder-based backup handling instead of zip files  
- ✅ Proper MongoDB authentication in containers
- ✅ Environment configuration for credentials

For more details, see the [MongoDB Backup Guide](docs/technical/mongodb_guide.md#backup-and-restore).sting, security audits, and Docker config validation

- **Manual Deployment Control**: All deployments handled via npm scripts for full control

The project includes modern cross-platform tooling for development and deployment:erraform), backend API (Node.js + MongoDB), and modern React frontend with comprehensive admin monitoring.

## ðŸš€ Quick Start

For new users, visit our [Getting Started Guide](docs/guides/getting_started.md) to quickly set up and begin using MomsRecipeBox.

## âœ¨ Key Features

- **Recipe Management**: Create, read, update, and delete recipes with rich editing interface

- **AI Recipe Assistant**: Create recipes from URLs, text, or conversation with our [AI Recipe Assistant](docs/guides/ai_recipe_assistant.md)

- **Shopping List**: Add ingredients to your [Shopping List](docs/guides/shopping_list.md) with AI-powered categorization

- **Admin Dashboard**: Comprehensive monitoring of AI services and infrastructure components

- **Favorites System**: Save and organize favorite recipes

- **Image Handling**: Upload and manage recipe images with instant feedback

- **Comments**: Share notes and suggestions on recipes

- **Modern UI**: Responsive design with intuitive navigation

## 🔒 Authentication & Security

Mom's Recipe Box uses **Auth0** for authentication with **shared tenant support** and **JWT token security**:

### Core Authentication Features

- **Universal Login**: Secure Auth0 hosted authentication pages
- **Shared Auth0 Tenant**: Supports multiple applications (Mom's Recipe Box and Cruise Viewer) with namespace isolation
- **Dual Namespace Support**: Role detection from both `https://momsrecipebox.app/roles` and `https://cruise-viewer.app/roles` custom claims
- **JWT Token Security**: Secure API communication with audience-based token validation
- **Role-Based Access Control**: Admin and user roles with granular permissions
- **Account Management**: User profile management and authentication flows

### Admin System Authentication

- **Secure Admin Dashboard**: JWT token validation with proper audience verification (`https://momsrecipebox-admin-api`)
- **Cross-Application Compatibility**: Admin roles recognized from both Mom's Recipe Box and Cruise Viewer namespaces for shared Auth0 tenant scenarios
- **Machine-to-Machine API**: Secure M2M authentication for admin operations
- **Token Debugging**: Enhanced authentication flow with detailed console logging for troubleshooting

### Recent Authentication Improvements

✅ **Fixed Auth0 Authentication Issues** (Latest Update):

- Resolved infinite loading on admin authentication
- Fixed JWT token authentication for all API calls  
- Implemented dual namespace support for shared Auth0 tenant
- Corrected audience parameter configuration for backend API authentication
- Enhanced admin role detection with proper custom claims namespace matching

✅ **Enhanced Admin Navigation & Access Control** (October 2025):

- Fixed admin panel visibility in user dropdown (now only visible to admin users)
- Resolved admin page routing issues and race conditions  
- Improved authentication flow timing and initialization
- Enhanced error handling for failed authentication attempts
- **Added User Invitation System**: Green "Invite New User" button with modal interface
- **Fixed API routing conflicts**: Separated frontend routes (`/admin/*`) from API endpoints (`/api/admin/*`)
- **Improved button styling**: Resolved CSS override issues with proper color contrast
- **Enhanced loading states**: Better handling of Ctrl+F5 refreshes and authentication initialization
- **Cleaned up debug logging**: Removed development console output for production readiness

## ðŸ—‚ï¸ Repository Structure

```text
/infra        Terraform IaC (MongoDB Atlas, S3, Lambdas, etc.)
/db           Seed scripts & JSON recipe fixtures (MongoDB)
/app          Backend API (handlers, lambda-style router, tests)

/ui           React/Vite frontend (editing & viewing recipes)
/scripts      Cross-platform Node.js automation & PowerShell helpers

/docs         Project documentation
```

## ðŸ“š Documentation

Our documentation is organized into three main sections:

### User Guides

- [Getting Started Guide](docs/guides/getting_started.md) - Setting up and using MomsRecipeBox

- [AI Recipe Assistant](docs/guides/ai_recipe_assistant.md) - Creating recipes with AI

- [Shopping List](docs/guides/shopping_list.md) - Managing your shopping list

### Technical Documentation

- [MongoDB Guide](docs/technical/mongodb_guide.md) - Database configuration and management

- [AI Services](docs/technical/ai_services.md) - AI provider architecture and implementation

- [Shopping List](docs/technical/shopping_list.md) - Technical implementation details

### API Reference

- [Admin API](docs/admin_api.md) - Administrative endpoints

- Recipe API - Recipe management endpoints (coming soon)

## ðŸ§ª Testing

Backend end-to-end tests live in `app/tests` and use native `fetch` + `assert`:

```powershell
cd app/tests
npm install   # first time

node test_shopping_list.js  # Run specific tests

npm test      # runs all tests

```

For more details on testing, see [app/tests/README.md](app/tests/README.md).

## ðŸ¥ Health Monitoring & Data Quality

The application includes a comprehensive health monitoring system with embedded data quality analysis. Key features include:

- Startup health checks

- Data quality monitoring

- HTTP health endpoints

- Configurable thresholds

- Graceful degradation

For database quality tools:

```bash

# Analyze database quality

npm run db:analyze

# Clean database (apply auto-fixes)

npm run db:clean-apply

```

## ðŸ”§ Development & DevOps

The project includes modern cross-platform tooling for development and deployment:

### MongoDB Mode Management

Switch between local and Atlas MongoDB with a single command:

```bash

# Switch to local MongoDB (with Docker containers)

npm run mode:local

# Switch to Atlas MongoDB (cloud database)

npm run mode:atlas

# Toggle between modes automatically

npm run mode:toggle

# Check current mode and container status

npm run mode:current

# Clean up all Docker containers

npm run mode:cleanup
```

The mode switcher handles:

- Environment file (`.env`) updates

- Docker container management with profiles

- AWS Secrets Manager integration for Atlas

- Automatic cleanup of unused containers

### DevOps Automation

```bash

# Lambda testing and connectivity

npm run test:lambda
npm run test:lambda -- --invoke

# Database tunnel management

npm run tunnel:start
npm run tunnel:status
npm run tunnel:stop

# AWS profile management

npm run aws:status
npm run aws:switch

# Infrastructure deployment

npm run deploy:lambda
npm run deploy:lambda -- --tag production

```

**Cross-Platform Support**: All commands work on Windows, macOS, and Linux. Legacy PowerShell scripts are preserved for Windows-specific operations and backward compatibility.

## ðŸ›¡ï¸ Database Backup & Restore

Your family recipes and user data are protected with a comprehensive backup and restore system. For quick operations:

```powershell

# Create a backup

.\scripts\Backup-MongoDBToS3.ps1

# Restore from backup

.\scripts\Restore-MongoDBFromS3.ps1 -BackupPath "path/to/backup"

```

For more details, see the [MongoDB Backup Guide](docs/technical/mongodb_guide.md#backup-and-restore).

## â˜ï¸ Deployment Modes

## ☁️ Deployment Profiles

The application now uses a unified four-profile deployment system for clean, consistent environment management:

### 🏠 **Local Profile**

- **Database**: Local MongoDB Docker container
- **Backend**: Local Express app Docker container  
- **Frontend**: Vite dev server with proxy to localhost:3000
- **Best for**: Full local development with isolated data

```bash
npm run profile:local    # Switch to local profile
npm run profile:start    # Start local infrastructure
```

### 🌍 **Atlas Profile**

- **Database**: MongoDB Atlas cloud database
- **Backend**: Local Express app Docker container
- **Frontend**: Vite dev server with proxy to localhost:3000
- **Best for**: Local development with shared cloud data

```bash
npm run profile:atlas    # Switch to atlas profile
npm run profile:start    # Start local backend with Atlas DB
```

### ⚡ **Lambda Profile**

- **Database**: MongoDB Atlas cloud database
- **Backend**: AWS Lambda deployed functions
- **Frontend**: Vite dev server with direct Lambda calls
- **Best for**: Testing against deployed serverless backend

```bash
npm run profile:lambda   # Switch to lambda profile
# No local backend needed - connects directly to Lambda
```

### ☁️ **Cloud Profile**

- **Database**: MongoDB Atlas cloud database
- **Backend**: AWS Lambda deployed functions
- **Frontend**: CloudFront distributed static site
- **Best for**: Full production deployment

```bash
npm run profile:cloud    # Switch to cloud profile
# All services are cloud-deployed
```

### Profile Management Commands

```bash
npm run profile:show     # Show current profile details
npm run profile:list     # List all available profiles
npm run profile:set <profile>  # Switch to specific profile
npm run profile:validate # Validate current profile config
npm run profile:start    # Start infrastructure for current profile
npm run profile:stop     # Stop all infrastructure
```

Each profile automatically configures all environment variables, Docker services, and API endpoints consistently. No more conflicting .env files!

## 🔒 Container-Native Security

The application implements **container-native secret retrieval** for enhanced security:

### 🛡️ **Zero Secret Files**

- Profile files (`current-profile.env`) contain only configuration placeholders like `${MONGODB_ATLAS_URI}`, `${AUTH0_DOMAIN}`
- No actual secrets are ever stored in files or committed to version control
- All secrets (MongoDB, Auth0, API keys) retrieved fresh from AWS Secrets Manager at container startup

### 🔄 **Runtime Secret Management**

- Containers automatically fetch secrets when starting/restarting
- Secrets exist only in memory during runtime
- Enhanced security audit trail through AWS CloudTrail

### 🧪 **Host Script Compatibility**

- Host scripts (like `npm run db:test`) automatically retrieve secrets from AWS when needed
- Seamless development experience with enhanced security

```bash
# Container automatically retrieves secrets at startup
npm run profile:start

# Host scripts securely fetch secrets when needed  
npm run db:test
```

This approach eliminates the security risk of credential exposure in profile files while maintaining full functionality.

### ðŸ  **Local Development Mode**

- **Backend**: Express server (local)

- **Database**: MongoDB in Docker container

- **Frontend**: Local React development server

- **Best for**: Development, testing, offline work

```bash
npm run mode:local    # Switch to local mode

npm run start:local   # Start all local services

```

### ðŸŒ **Remote Database Mode**

- **Backend**: Express server (local)

- **Database**: MongoDB Atlas (cloud)

- **Frontend**: Local React development server

- **Best for**: Development with production data

```bash
npm run mode:atlas    # Switch to Atlas mode

npm run start:atlas   # Start with Atlas database

```

### â˜ï¸ **Production Mode**

- **Backend**: AWS Lambda (serverless)

- **Database**: MongoDB Atlas (cloud)

- **Frontend**: S3 + CloudFront (planned)

- **Best for**: Production deployment

```bash
npm run deploy:lambda    # Deploy to AWS Lambda

npm run test:lambda     # Test Lambda deployment

```

Each mode is completely isolated with automatic container and environment management.

## ðŸ›  Contributing

We welcome contributions to MomsRecipeBox! To contribute:

1. Add or modify handlers under `/app/handlers` (return `{ statusCode, body }`)
2. Update API documentation for new/changed endpoints
3. Add tests in `/app/tests` (name `test_*.js`)

4. Reflect data model changes in the appropriate documentation

## ðŸ“„ License

(Add project license here.)
