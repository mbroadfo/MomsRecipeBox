# Changelog

All notable changes to the MomsRecipeBox project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Phase 3.1] - 2024-12-19

### Added ✅ PHASE 3 MONGODB SWITCHER MIGRATION COMPLETE
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
- ✅ **MongoDB Mode Switcher** (1/5 critical PowerShell scripts) - **COMPLETE**
- ⏳ **Container Build Pipeline** (2/5) - Next target: `PushAppTierContainer.ps1`
- ⏳ **Database Backup Scripts** (3/5) - Target: Backup/restore PowerShell automation
- ⏳ **AWS Profile Management** (4/5) - Target: `toggle-aws-profile.ps1`
- ⏳ **Development Environment Setup** (5/5) - Target: Various setup scripts

### Notes
- **Backward Compatibility** - PowerShell scripts preserved and continue to function
- **Developer Choice** - Teams can use either PowerShell or npm-based commands
- **Foundation for Phase 3** - Establishes pattern for remaining PowerShell modernization

---

## [Unreleased]

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
