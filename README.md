# MomsRecipeBox

A secure, multi-family recipe sharing platform with **simplified cloud-only architecture**: AWS Lambda backend, Atlas MongoDB, and modern React frontend with comprehensive admin monitoring.

## 🚀 Simplified Cloud-Only Architecture

**Why Cloud-Only?** We've eliminated the complexity of multiple deployment modes, Docker containers, and profile management to create a streamlined, reliable development experience with true dev/prod parity.

### Frontend (React + TypeScript)

- Modern React 19 application with strict TypeScript implementation
- Responsive recipe viewing, editing, and management interface
- AI-powered recipe creation and extraction capabilities
- Comprehensive admin dashboard with real-time system monitoring
- Shopping list integration and ingredient management
- **User Profile Management**: Complete user onboarding and profile system with Auth0 integration

### Backend (AWS Lambda + Atlas MongoDB)

- Serverless RESTful API with AWS Lambda functions
- Atlas MongoDB cloud database with AWS Secrets Manager integration
- Comprehensive backup and restore system
- Auth0 JWT integration for secure user authentication
- Multi-tenant family sharing capabilities
- **User Profile System**: Complete user lifecycle management with automatic Auth0 integration

### Infrastructure (AWS Cloud)

- **AWS Lambda**: Serverless compute for all API endpoints
- **API Gateway**: RESTful API routing with CORS handling
- **S3**: Image storage with CloudFront CDN distribution
- **Atlas MongoDB**: Cloud database with AWS Secrets Manager for credentials
- **AWS Secrets Manager**: Secure credential and configuration management
- **Auth0**: JWT-based authentication and authorization

## Key Features

### Recipe Management

- **Modern Editor**: In-place editing with drag-and-drop reordering
- **AI Assistant**: Natural language recipe creation, URL extraction, and ingredient-based suggestions
- **Visibility Controls**: Private, Family, and Public sharing options
- **Rich Media**: Image upload with automatic optimization and cache management
- **Interactive Ingredients**: Checkbox selection with shopping list integration
- **Tag System**: Flexible categorization and search capabilities

### Family Sharing

- **Multi-User Support**: Individual accounts with family group sharing
- **User Management**: Admin invitation system with role-based access
- **Comments System**: Recipe discussions and feedback
- **Favorites**: Personal recipe collections with optimistic UI updates

### Admin & Monitoring

- **System Status**: Real-time monitoring of all infrastructure components
- **User Analytics**: Comprehensive engagement metrics and growth tracking
- **AI Provider Management**: Configuration and monitoring of AI services
- **Database Management**: Backup monitoring and health checks

## Development & Setup

### Prerequisites

- Node.js 18+ and npm
- AWS account with configured AWS CLI profile (`mrb-api`)
- Auth0 account for authentication

### 🎯 Quick Start (Simplified!)

1. **Clone and Install**:

   ```bash
   git clone https://github.com/mbroadfo/MomsRecipeBox.git
   cd MomsRecipeBox
   npm install
   ```

2. **Configure AWS Profile**:

   ```bash
   npm run aws:mrb-api      # Set AWS profile to mrb-api
   npm run aws:validate     # Verify AWS credentials
   ```

3. **Start Development**:

   ```bash
   npm run dev              # Start frontend development server
   ```

4. **Run Tests**:

   ```bash
   npm run test             # Run complete test suite
   ```

5. **Deploy to Cloud**:

   ```bash
   npm run deploy           # Deploy Lambda + UI to AWS
   ```

### 📋 Simplified Commands

Our cloud-only architecture uses just **3 core commands**:

```bash
npm run dev              # Development: Start UI dev server
npm run test             # Testing: Run all tests against cloud API
npm run deploy           # Deployment: Deploy Lambda + UI to AWS
```

**Additional helpful commands:**

```bash
# Development
npm run ui:dev           # Start UI development server
npm run ui:build         # Build UI for production
npm run ui:preview       # Preview production UI build

# Testing (individual test suites)
npm run test:recipes     # Test recipe CRUD operations
npm run test:shopping    # Test shopping list features
npm run test:favorites   # Test favorites functionality
npm run test:comments    # Test comments system
npm run test:images      # Test image upload/management
npm run test:ai-providers # Test AI assistant features

# Data Management
npm run data:add         # Add test data to database
npm run backup           # Backup MongoDB to S3
npm run restore          # Restore MongoDB from backup

# AWS Management
npm run aws:mrb-api      # Set AWS profile to mrb-api
npm run aws:status       # Show current AWS profile
npm run aws:validate     # Validate AWS credentials

# Infrastructure
npm run iam:setup        # Setup IAM policies
npm run iam:status       # Check IAM policy status
```

## Security & Deployment

### 🔒 Cloud-Native Security

- **AWS Secrets Manager**: All credentials and sensitive configuration stored securely
- **No Local Secrets**: Zero secrets stored in `.env` files or committed to version control
- **Runtime Security**: All secrets retrieved fresh from AWS at runtime
- **JWT Authentication**: Auth0 JWT tokens for all API authentication
- **CORS Protection**: Proper CORS handling for cross-origin requests

### 📦 Serverless Deployment

- **AWS Lambda**: Auto-scaling serverless compute for all API endpoints
- **API Gateway**: Managed REST API with built-in throttling and monitoring
- **S3 + CloudFront**: Global CDN for UI and image assets
- **Atlas MongoDB**: Fully managed cloud database with automatic scaling

### 🔄 Backup & Restore

- **Automated S3 Backup**: Scheduled database backups with configurable retention
- **Cross-Platform Scripts**: Node.js backup scripts work on all platforms
- **One-Command Restore**: Simple restore from any backup point
- **Database Integrity**: Automatic validation and verification

## Testing & Development

### 🧪 Simplified Testing Architecture

MomsRecipeBox uses a **cloud-only testing architecture** that ensures consistent test coverage with **100% pass rate**:

```bash
# Core test commands (simplified!)
npm run test             # Run complete test suite with AWS profile setup
npm run test:all         # Run all individual test suites

# Individual test suites (all run against cloud API)
npm run test:recipes     # Recipe CRUD operations
npm run test:shopping    # Shopping list features
npm run test:favorites   # Favorites functionality
npm run test:comments    # Comments system
npm run test:images      # Image upload/management
# Individual test suites (all run against cloud API)
npm run test:ai-providers # AI service connectivity  
npm run test:lambda       # Lambda function health
npm run test:ai-lambda    # AI Lambda integration
```

### ✅ Current Test Status: **100% SUCCESS**

All test suites are passing with our cloud-only architecture:

- **✅ Recipes**: Full CRUD operations with AWS Lambda + Atlas
- **✅ Shopping Lists**: Add, update, delete, check/clear all
- **✅ Favorites**: Toggle functionality with optimistic UI
- **✅ Comments**: Create, read, update, delete operations
- **✅ Images**: Upload, retrieve, update, delete with S3 storage
- **✅ AI Assistant**: Chat, recipe parsing, URL extraction

### 🔧 Architecture Benefits

- **True Dev/Prod Parity**: Development tests run against same cloud infrastructure as production
- **Simplified Environment**: No Docker containers, local databases, or profile switching
- **AWS Secrets Manager**: All tests use real AWS credentials and configuration
- **Consistent Results**: Same cloud APIs used in development, testing, and production
- **Fast Feedback**: Direct cloud API testing with cached JWT tokens

### Development Workflow

1. **Make Changes**: Modify handlers in `/app/handlers` or UI in `/ui/src`
2. **Test Locally**: `npm run dev` for UI development with hot reloading
3. **Validate Changes**: `npm run test` to ensure all functionality works
4. **Deploy**: `npm run deploy` to push changes to AWS Lambda + S3

### Code Quality

- **Strict TypeScript**: Zero `any` types throughout the codebase
- **Comprehensive Testing**: 100% passing test suite with cloud integration
- **Automated Validation**: ESLint and automated code formatting
- **Type-Safe APIs**: Full TypeScript integration from frontend to backend
- **AWS Best Practices**: Proper IAM policies and Secrets Manager integration

## API Documentation

### Core Recipe Endpoints

- `GET /recipes` - List recipes with filtering and pagination
- `GET /recipes/:id` - Get detailed recipe information
- `POST /recipes` - Create new recipe (requires JWT)
- `PUT /recipes/:id` - Update existing recipe (requires JWT)
- `DELETE /recipes/:id` - Delete recipe (requires JWT)
- `POST /recipes/:id/like` - Toggle recipe like status (requires JWT)

### Shopping List Endpoints

- `GET /shopping-list` - Get user's shopping list (requires JWT)
- `POST /shopping-list/items` - Add items to shopping list (requires JWT)
- `PUT /shopping-list/items/:id` - Update shopping list item (requires JWT)
- `DELETE /shopping-list/items/:id` - Remove item from shopping list (requires JWT)
- `POST /shopping-list/check-all` - Mark all items as checked (requires JWT)
- `POST /shopping-list/clear` - Clear all items from shopping list (requires JWT)

### Comment Endpoints

- `GET /recipes/:id/comments` - Get comments for recipe
- `POST /recipes/:id/comments` - Add comment to recipe (requires JWT)
- `PUT /recipes/:recipeId/comments/:commentId` - Update comment (requires JWT)
- `DELETE /recipes/:recipeId/comments/:commentId` - Delete comment (requires JWT)

### Image Management

- `GET /recipes/:id/image` - Get recipe image
- `POST /recipes/:id/image` - Upload/update recipe image (requires JWT)
- `DELETE /recipes/:id/image` - Delete recipe image (requires JWT)

### AI Assistant

- `POST /ai/chat` - AI recipe assistant chat (requires JWT)
- `POST /ai/extract` - Extract recipe from URL (requires JWT)

### Admin Endpoints

- `GET /admin/users` - User management (requires admin JWT)
- `POST /admin/users/invite` - Invite new users (requires admin JWT)
- `GET /admin/system-status` - System monitoring (requires admin JWT)
- `GET /admin/user-analytics` - Usage analytics (requires admin JWT)

**Authentication**: All endpoints marked "(requires JWT)" use Auth0 JWT tokens in the `Authorization: Bearer <token>` header.

## 🚀 Getting Started

Ready to dive in? Our cloud-only architecture makes it simple:

1. **Setup AWS**: Configure AWS CLI with `mrb-api` profile
2. **Clone & Install**: `git clone` and `npm install`
3. **Start Development**: `npm run dev`
4. **Run Tests**: `npm run test` (100% passing!)
5. **Deploy**: `npm run deploy`

**That's it!** No Docker, no profiles, no complexity - just pure cloud development.

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Test Your Changes**: `npm run test` (ensure 100% pass rate)
4. **Commit** your changes: `git commit -m 'Add amazing feature'`
5. **Push** to the branch: `git push origin feature/amazing-feature`
6. **Open** a Pull Request

### Development Guidelines

- **Cloud-First**: All development uses AWS Lambda + Atlas MongoDB
- **TypeScript Strict**: Follow TypeScript strict mode throughout
- **Test Coverage**: Maintain 100% test suite success rate
- **AWS Best Practices**: Use Secrets Manager, proper IAM policies
- **No Local Dependencies**: All infrastructure is cloud-based
- **Script Management**: Use npm commands instead of direct script execution

### Recent Architecture Improvements (Phase 6)

✅ **Major Script Cleanup & Backup System Overhaul** (November 2024):

- **63% Script Reduction**: Eliminated 43 → 16 essential scripts (removed all Docker/local development infrastructure)
- **Production-Ready Backup/Restore**: Fixed critical backup system with compression, S3 integration, and Windows compatibility
- **Cloud-Only Architecture**: 100% migration to AWS Lambda + Atlas MongoDB (removed all Docker containers and local development)
- **Enhanced NPM Scripts**: Added `backup:local`, `backup:atlas`, `backup:full`, `restore:from-s3`, `restore:latest`
- **Cross-Platform Compatibility**: All scripts work on Windows/Linux/macOS with proper CLI handling
- **Security Improvements**: AWS Secrets Manager integration with consistent `MONGODB_ATLAS_URI` key usage

## Support & Documentation

- **Quick Issues**: Open GitHub issues for bug reports and feature requests
- **UI Development**: See `ui/README.md` for React frontend details
- **AWS Setup**: Ensure AWS CLI configured with `mrb-api` profile
- **Auth0 Config**: JWT authentication setup in AWS Secrets Manager

---

**🎯 Simplified. Streamlined. Successful.**

*Mom's Recipe Box: From complex multi-mode deployment to elegant cloud-only architecture.*
