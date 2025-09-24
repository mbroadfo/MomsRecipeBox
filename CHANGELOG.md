# Changelog

All notable changes to the MomsRecipeBox project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

## [1.0.0] - 2025-08-01

### Features

- Initial release with recipe management functionality
- Image upload and management
- Favorites/likes system
- Comments functionality
- Interactive ingredient checkboxes
- Basic shopping list structure (backend)
