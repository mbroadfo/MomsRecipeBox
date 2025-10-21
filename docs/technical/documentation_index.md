# Documentation Index

Complete guide to all Mom's Recipe Box documentation.

## 📚 Quick Access

| Document | Purpose | Audience |
|----------|---------|----------|
| [Quick Start Guide](QUICK_START_GUIDE.md) | Get running in 5 minutes | Everyone |
| [NPM Commands Reference](NPM_COMMANDS.md) | 80+ automation commands | Developers |
| [API Reference](docs/api/) | API endpoints and authentication | Developers |
| [User Guide](docs/user/) | How to use the application | End Users |

---

## 🚀 Getting Started

### New Users
1. **[Quick Start Guide](QUICK_START_GUIDE.md)** - Get the app running locally
2. **[User Guide](docs/user/getting_started.md)** - Learn how to use features
3. **[Shopping List Guide](docs/user/shopping_list.md)** - Grocery list management

### New Developers
1. **[Quick Start Guide](QUICK_START_GUIDE.md)** - Local development setup
2. **[Development Setup](docs/developer/setup-development.md)** - Detailed dev environment
3. **[NPM Commands](NPM_COMMANDS.md)** - All available automation
4. **[Database Guide](docs/developer/mongodb_guide.md)** - Database operations

### DevOps Engineers
1. **[Deployment Guide](docs/developer/deployment-guide.md)** - Production deployment
2. **[Infrastructure Guide](infra/README.md)** - AWS infrastructure
3. **[NPM Commands](NPM_COMMANDS.md)** - Deployment automation

---

## 📂 Documentation Structure

```
📁 docs/
├── 📁 user/                    # End-user documentation
│   ├── getting_started.md      # Basic usage guide
│   ├── shopping_list.md        # Shopping list features
│   └── ai_recipe_assistant.md  # AI recipe features
│
├── 📁 developer/               # Developer documentation  
│   ├── setup-development.md    # Development environment
│   ├── mongodb_guide.md        # Database operations
│   ├── mongodb_mode_switching.md # Environment switching
│   ├── deployment-guide.md     # Deployment processes
│   ├── testing-guide.md        # Testing procedures
│   └── troubleshooting.md      # Common issues
│
├── 📁 api/                     # API documentation
│   ├── admin_api.md            # Admin API endpoints
│   ├── endpoints.md            # All API endpoints
│   ├── authentication.md      # Auth implementation
│   └── swagger.json           # OpenAPI specification
│
└── 📁 architecture/            # System architecture
    ├── system-overview.md      # High-level architecture
    ├── database-design.md      # Database schema
    ├── infrastructure.md       # AWS infrastructure
    └── security.md            # Security implementation
```

---

## 🎯 By Use Case

### I Want To...

**Use the Application**
- [Getting Started Guide](docs/user/getting_started.md)
- [Shopping List Guide](docs/user/shopping_list.md)
- [AI Recipe Assistant](docs/user/ai_recipe_assistant.md)

**Develop Features**
- [Development Setup](docs/developer/setup-development.md)
- [NPM Commands Reference](NPM_COMMANDS.md)
- [Database Guide](docs/developer/mongodb_guide.md)
- [API Documentation](docs/api/)

**Deploy to Production**
- [Deployment Guide](docs/developer/deployment-guide.md)
- [Infrastructure Guide](infra/README.md)
- [AWS Setup Guide](infra/MRB_USER_SETUP_GUIDE.md)

**Integrate with APIs**
- [API Reference](docs/api/admin_api.md)
- [Authentication Guide](docs/api/authentication.md)
- [Swagger/OpenAPI](docs/api/swagger.json)

**Understand the System**
- [System Architecture](docs/architecture/system-overview.md)
- [Database Design](docs/architecture/database-design.md)
- [Infrastructure Overview](docs/architecture/infrastructure.md)

**Troubleshoot Issues**
- [Troubleshooting Guide](docs/developer/troubleshooting.md)
- [NPM Commands](NPM_COMMANDS.md) - All scripts support `--help`
- [Health Checks](docs/developer/mongodb_guide.md#health-monitoring)

---

## 🔧 Component-Specific Documentation

### Application Tiers
- **[App Tier](app/README.md)** - Node.js API server
- **[UI Tier](ui/README.md)** - React frontend  
- **[Database](db/README.md)** - MongoDB setup
- **[Infrastructure](infra/README.md)** - AWS resources

### Development Tools
- **[Database Tools](tools/database/README.md)** - Data analysis tools
- **[Development Scripts](tools/README.md)** - Automation utilities
- **[Backup Systems](scripts/MONGODB_BACKUP_README.md)** - Database backup

### Admin Features  
- **[Admin Panel](app/admin/README.md)** - Administrative interface
- **[Health Monitoring](app/health/README.md)** - System health checks
- **[Postman Setup](app/admin/POSTMAN_SETUP.md)** - API testing

---

## 📋 Reference Materials

### Release Information
- **[Changelog](CHANGELOG.md)** - Version history and changes
- **[Release Notes](RELEASE_NOTES.md)** - Current release information

### Project Planning
- **[Feature Plans](shopping_list_section.md)** - Upcoming features
- **[UI Enhancements](UI_ADMIN_ENHANCEMENTS.md)** - UI improvement plans
- **[AI Integration](AI_RECIPE_CREATOR_SETUP.md)** - AI feature setup

### Historical Documentation
- **[Archive](docs-archive/)** - Completed phases and planning docs
  - **[Phases](docs-archive/phases/)** - Development phase completions
  - **[Planning](docs-archive/planning/)** - Historical planning documents  
  - **[Migration](docs-archive/migration/)** - Migration guides and results

---

## 🆘 Need Help?

### Quick Help
```bash
# Show all available commands
npm run

# Get help for specific scripts  
node scripts/switch-mode.js --help
node scripts/deploy-lambda.js --help
node scripts/find-orphan-images.js --help

# Check system health
npm run health:detailed

# Validate environment
npm run validate
```

### Documentation Issues
If you can't find what you're looking for:

1. Check the [NPM Commands Reference](NPM_COMMANDS.md) - most operations are automated
2. Look in [Troubleshooting Guide](docs/developer/troubleshooting.md)
3. Review component-specific README files
4. Check the [archived documentation](docs-archive/) for historical context

---

## 📝 Contributing to Documentation

### Adding New Documentation
- **User guides** → `docs/user/`
- **Developer guides** → `docs/developer/`
- **API documentation** → `docs/api/`
- **Architecture docs** → `docs/architecture/`

### Documentation Standards
- Use clear, action-oriented headings
- Include code examples where helpful
- Link to related documentation
- Keep user docs separate from technical docs

---

*This index provides quick access to all 75+ documentation files organized by purpose and audience.*