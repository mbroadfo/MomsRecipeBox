# MomsRecipeBox

A secure, multi-family recipe sharing platform with a modular architecture: infrastructure## 🔧 Development & DevOps

### GitHub Actions

- **Code Quality Validatio## 🛡️ Database Backup & Re## 🛡️ Database Backup & Restore

Your family recipes and user data are protected with a comprehensive ## 🛠 Contributing

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

## ðŸ—‚ï¸ Repository Structure

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

The application supports three flexible deployment modes:

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
