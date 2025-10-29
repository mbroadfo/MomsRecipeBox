# MomsRecipeBox

A secure, multi-family recipe sharing platform with a modular architecture: infrastructure (Terraform), backend API (Node.js + MongoDB), and modern React frontend with comprehensive admin monitoring.

## 🏗️ Architecture Overview

### Frontend (React + TypeScript)

- Modern React 19 application with strict TypeScript implementation
- Responsive recipe viewing, editing, and management interface
- AI-powered recipe creation and extraction capabilities
- Comprehensive admin dashboard with real-time system monitoring
- Shopping list integration and ingredient management

### Backend (Node.js + MongoDB)

- RESTful API with Lambda-compatible handlers
- MongoDB database with flexible deployment options (local/Atlas)
- Comprehensive backup and restore system
- Auth0 integration for secure user authentication
- Multi-tenant family sharing capabilities

### Infrastructure (Terraform)

- AWS cloud deployment with S3, Lambda, and API Gateway
- Container-native security with AWS Secrets Manager integration
- Multiple deployment profiles (local, Atlas, Lambda)
- Automated backup and monitoring systems

## 🚀 Key Features

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

## 🔧 Development & Setup

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local) or MongoDB Atlas account
- AWS account (for cloud deployment)
- Auth0 account for authentication

### Quick Start

1. **Clone and Install**:

   ```bash
   git clone https://github.com/mbroadfo/MomsRecipeBox.git
   cd MomsRecipeBox
   npm install
   ```

2. **Configure Environment**:

   ```bash
   npm run profile:list     # View available profiles
   npm run profile:set local # Set to local development
   ```

3. **Start Development**:

   ```bash
   npm run dev              # Start backend API
   cd ui && npm run dev     # Start frontend (new terminal)
   ```

4. **Access Application**:
   - Frontend: <http://localhost:5173>
   - Backend API: <http://localhost:3000>

### Deployment Profiles

The application supports multiple deployment configurations:

```bash
npm run profile:show     # Show current profile details
npm run profile:list     # List all available profiles
npm run profile:set <profile>  # Switch to specific profile
npm run profile:validate # Validate current profile config
npm run profile:start    # Start infrastructure for current profile
npm run profile:stop     # Stop all infrastructure
```

Available profiles:

- **local**: Local MongoDB with file-based storage
- **atlas**: MongoDB Atlas cloud database
- **lambda**: Full AWS cloud deployment

### Unified Restart System

The project includes an intelligent restart system that automatically detects changes and rebuilds only when necessary:

```bash
npm run restart          # Single unified restart command for all deployment modes
```

**How it works:**

- Generates unique build badges to verify code deployment
- Compares current application state against running containers
- Automatically escalates from restart → rebuild → force rebuild as needed
- Works seamlessly across Local, Atlas, and AWS deployment modes
- Provides clear feedback on actions taken and reasoning
- Escalates to complete rebuild when cached layers prevent code updates
- Verifies new code is actually running via dedicated health check endpoint

**When to use:**

- Use `npm run restart` after making any code changes to ensure deployment
- The system automatically determines the most efficient restart strategy
- Perfect for daily development workflow with intelligent change detection

## 🛡️ Security & Backup

### Container-Native Security

- Profile files contain only configuration placeholders like `${MONGODB_ATLAS_URI}`
- No actual secrets stored in files or committed to version control
- All secrets retrieved fresh from AWS Secrets Manager at container startup
- Runtime secret management with memory-only storage

### Backup System

- Automated S3 backup scheduling with configurable retention
- Cross-platform Node.js scripts replace PowerShell dependencies
- Database integrity verification and validation
- One-command restore from any backup point

### Authentication

- Auth0 integration with secure user management
- JWT-based API authentication for all Lambda mode operations
- Role-based access control (user, admin)
- Family group sharing with privacy controls
- **Status**: JWT authorization implementation in progress (see `docs/JWT_AUTHORIZATION_PLAN.md`)

### Current Lambda Mode Status

**✅ Infrastructure Working:**

- Lambda function deployment and containerization
- MongoDB Atlas connectivity with proper database configuration
- API Gateway routing and CORS handling
- Recipe creation and database operations confirmed working

**🚧 Authentication In Progress:**

- API Gateway JWT authorizer implementation planned
- Auth0 JWT validation infrastructure being configured
- Test suite enhancement for proper JWT token handling
- Full CRUD operations with authentication pending completion

For detailed implementation progress, see [`docs/JWT_AUTHORIZATION_PLAN.md`](docs/JWT_AUTHORIZATION_PLAN.md).

## 🧪 Testing & Development

### Unified Testing Architecture

MomsRecipeBox uses a unified testing architecture that ensures consistent test coverage across all deployment modes (local, atlas, lambda):

```bash
# Core functional tests (run same tests across all modes)
cd app/tests && npm run test:functional

# Mode-specific test commands
cd app/tests && npm run test:express     # Express mode (local development)
cd app/tests && npm run test:atlas      # Atlas mode (cloud database)
cd app/tests && npm run test:lambda     # Lambda mode (AWS deployment)

# Integration tests (infrastructure-specific)
cd app/tests && npm run test:integration:local
cd app/tests && npm run test:integration:atlas
cd app/tests && npm run test:integration:lambda

# Individual test suites
cd app/tests && npm run test:recipes     # Recipe CRUD operations
cd app/tests && npm run test:favorites   # Favorites functionality
cd app/tests && npm run test:comments    # Comments system
cd app/tests && npm run test:images      # Image upload/management
cd app/tests && npm run test:shopping    # Shopping list features
```

### Test Architecture Design

- **Functional Tests**: Core business logic tests that run identically across all modes
- **Integration Tests**: Infrastructure-specific tests for each deployment mode
- **Environment Detection**: Automatic base URL detection based on execution context
- **Shared Utilities**: Common environment detection and authentication across all test files

The `test:functional` command ensures the same core business logic is validated regardless of whether you're running locally, against Atlas, or in Lambda mode.

**Expected Results:**

- ✅ Health Check: 200 (working)
- ✅ CORS Preflight: 200 (working)
- ✅ Build Marker: 200 (deployment verification)
- ✅ AI Providers: 200 (non-database routes)
- ✅ 404 Handler: 404 (correct error handling)
- ✅ Database Routes: 503 (expected when DB not connected)
- ✅ API Gateway: 503 (proper routing with graceful degradation)

**Key Metrics Tracked:**

- Package size optimization (187MB → 636KB reduction)
- Lambda startup performance
- API Gateway integration status
- Error handling verification

### Development Workflow

1. **Backend Changes**: Modify handlers in `/app/handlers`
2. **Frontend Changes**: Update components in `/ui/src`
3. **Database Changes**: Update models and run migrations
4. **Testing**: Add tests in `/app/tests` (name `test_*.js`)

### Code Quality

- Strict TypeScript with zero `any` types
- Comprehensive ESLint configuration
- Automated code formatting and validation
- Type-safe API interactions throughout

## 📝 API Documentation

### Core Endpoints

- `GET /api/recipes` - List recipes with filtering
- `GET /api/recipes/:id` - Get recipe details
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Admin Endpoints

- `GET /api/admin/users` - User management
- `POST /api/admin/users/invite` - Invite new users
- `GET /api/admin/system-status` - System monitoring
- `GET /api/admin/user-analytics` - Usage analytics

### AI Endpoints

- `POST /api/ai/chat` - AI recipe assistant
- `POST /api/ai/extract` - Extract recipes from URLs
- `POST /api/ai/create-recipe` - Generate recipes from conversation

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Add tests for new functionality
- Update API documentation for endpoint changes
- Maintain backward compatibility when possible

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` directory for detailed guides
- **Issues**: Open GitHub issues for bug reports and feature requests
- **UI Details**: See `ui/README.md` for frontend-specific documentation
