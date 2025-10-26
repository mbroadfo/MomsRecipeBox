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

### Smart Rebuild System

The project includes an intelligent Docker rebuild system that solves common development caching issues:

```bash
npm run rebuild          # Smart rebuild - tries restart first, escalates if needed
npm run rebuild:force    # Nuclear rebuild - complete Docker rebuild from scratch
npm run rebuild:verify   # Generate build verification marker only
```

**How it works:**

- Generates unique build markers to verify code deployment
- Tries efficient container restart first
- Automatically detects Docker layer caching issues
- Escalates to complete rebuild when cached layers prevent code updates
- Verifies new code is actually running via dedicated Lambda endpoint

**When to use:**

- `rebuild` - General development when code changes aren't reflected
- `rebuild:force` - When you know Docker caching is the issue
- Use after making significant code changes to ensure deployment

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
- Role-based access control (user, admin)
- Family group sharing with privacy controls
- Secure API endpoints with JWT validation

## 🧪 Testing & Development

### Running Tests

```bash
npm test                     # Run all tests
npm run test:watch           # Watch mode for development
npm run test:lambda          # Test Lambda function directly
npm run test:lambda:comprehensive  # Full Lambda validation suite
cd app/tests && npm test     # Backend tests only
cd ui && npm test            # Frontend tests only
```

### Lambda Mode Testing

The comprehensive Lambda test validates all deployment aspects:

```bash
npm run test:lambda:comprehensive
```

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
