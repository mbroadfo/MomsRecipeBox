# NPM Commands Reference

Complete reference for all npm scripts available in Mom's Recipe Box cloud-only architecture.

## Quick Reference

```bash
# Development
npm run dev                          # Start development environment
npm run test                         # Run all tests

# Testing
npm run test:ai-providers            # Test AI provider connectivity
npm run test:lambda                  # Test Lambda function
npm run test:ai-lambda               # Test AI Lambda integration

# Data Management
npm run data:add                     # Add test recipes and shopping items
npm run data:add:recipe              # Add test recipe only
npm run data:add:shopping            # Add test shopping items only

# Database Operations
npm run backup                       # Backup Atlas to S3
npm run restore                      # Restore latest backup
npm run db:query                     # Query Atlas database

# Deployment
npm run deploy:lambda                # Deploy Lambda function
npm run deploy:ui                    # Deploy UI to CloudFront

# Infrastructure
npm run aws:mrb-api                  # Switch to deployment AWS profile
npm run aws:status                   # Check AWS profile status
npm run aws:validate                 # Validate AWS configuration
npm run iam:setup                    # Setup IAM policies
npm run iam:status                   # Check IAM status
npm run maintenance                  # Find orphaned S3 images

# Build Tools
npm run build:jwt-authorizer         # Build JWT authorizer package
```

## Development Commands

### Quick Start
| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run dev` | Start development environment | Daily development |
| `npm run test` | Run complete test suite | Verify functionality |
| `npm run data:add` | Add sample data | Fresh development setup |

| Command | Description | Notes |
|---------|-------------|-------|
| `npm run dev:local` | Start local development stack | Sets local mode + starts containers |
| `npm run dev:atlas` | Start development with Atlas | Sets atlas mode + starts containers |
| `npm run dev:lambda` | Start Lambda development | Sets lambda mode + starts local Lambda |
| `npm run fullstack:local` | Start API + UI together | Runs both tiers concurrently |
| `npm run fullstack:atlas` | Start full stack with Atlas | API with Atlas + UI development |

### Container Management

| Command | Description | Notes |
|---------|-------------|-------|
| `npm run start:local` | Start local containers | Docker Compose with local profile |
| `npm run start:atlas` | Start Atlas containers | Docker Compose with atlas profile |
| `npm run stop` | Stop all containers | Graceful shutdown |
| `npm run stop:all` | Stop and remove volumes | Complete cleanup |
| `npm run restart` | Unified restart system | Intelligent restart for all deployment modes |

---

## UI Development Commands

### Development Servers

| Command | Description | Environment |
|---------|-------------|-------------|
| `npm run ui:dev` | Start UI development server | Local API |
| `npm run ui:dev:local` | UI with local API | Local MongoDB + Express |
| `npm run ui:dev:atlas` | UI with Atlas API | Atlas MongoDB + Express |
| `npm run ui:dev:lambda` | UI with Lambda API | Atlas + Lambda |

### Build Commands

| Command | Description | Target |
|---------|-------------|---------|
| `npm run ui:build` | Build for production | Default production build |
| `npm run ui:build:local` | Build for local development | Local API endpoints |
| `npm run ui:build:atlas` | Build for Atlas development | Atlas + Express |
| `npm run ui:build:lambda` | Build for Lambda | Lambda API endpoints |
| `npm run ui:build:production` | Build for production deployment | Production environment |

### Preview Commands

| Command | Description | Purpose |
|---------|-------------|---------|
| `npm run ui:preview` | Preview production build | Test built application |
| `npm run ui:preview:local` | Preview local build | Test local configuration |
| `npm run ui:preview:atlas` | Preview Atlas build | Test Atlas configuration |
| `npm run ui:preview:lambda` | Preview Lambda build | Test Lambda integration |

---

## Database Commands

### MongoDB Mode Switching

| Command | Description | Replaces PowerShell |
|---------|-------------|-------------------|
| `npm run mode:local` | Switch to local MongoDB | `Toggle-MongoDbConnection.ps1 local` |
| `npm run mode:atlas` | Switch to Atlas MongoDB | `Toggle-MongoDbConnection.ps1 atlas` |
| `npm run mode:current` | Show current mode | `Toggle-MongoDbConnection.ps1 -ShowCurrent` |
| `npm run mode:toggle` | Toggle between modes | Interactive mode switching |
| `npm run mode:cleanup` | Cleanup orphaned containers | Container maintenance |

### Database Backup & Restore

| Command | Description | Features |
|---------|-------------|----------|
| `npm run backup:local` | Backup local MongoDB | Local filesystem backup |
| `npm run backup:atlas` | Backup Atlas to S3 | Remote backup with S3 storage |
| `npm run backup:full` | Full backup with metadata | Complete system backup |
| `npm run backup:archive` | Archive backup to S3 | Long-term storage |
| `npm run restore:from-local` | Restore from local backup | Local file restoration |
| `npm run restore:from-s3` | Restore from S3 backup | Remote restoration |
| `npm run restore:latest` | Restore latest backup | Automatic latest selection |

---

## Testing Commands

### Application Testing

| Command | Description | Scope |
|---------|-------------|-------|
| `npm run test` | Run unit tests | App-tier tests |
| `npm run test:all` | Test all environments | Local + Atlas + Lambda |
| `npm run test:local` | Test local stack | Local MongoDB + Express |
| `npm run test:atlas` | Test Atlas configuration | Atlas MongoDB + Express |

### Lambda Testing

| Command | Description | Replaces PowerShell |
|---------|-------------|-------------------|
| `npm run test:lambda` | Test Lambda connectivity | `run_tests.ps1` |
| `npm run test:lambda:safe` | Safe connectivity test | Non-invasive testing |
| `npm run test:lambda:invoke` | Invoke Lambda with payload | Full Lambda testing |

### Test Data Management

| Command | Description | Replaces PowerShell |
|---------|-------------|-------------------|
| `npm run test:data` | Add comprehensive test data | `add_test_shopping_items.ps1` |
| `npm run test:data:recipe` | Add test recipes only | Recipe data creation |
| `npm run test:data:shopping` | Add shopping list items only | Shopping list testing |

---

## Deployment Commands

### Lambda Deployment

| Command | Description | Features |
|---------|-------------|----------|
| `npm run deploy:lambda` | Deploy Lambda function | Build + push + update |
| `npm run deploy:lambda:prod` | Deploy production Lambda | Production image tag |
| `npm run deploy:dry-run` | Preview deployment | Show what would be deployed |

### UI Deployment

| Command | Description | Target |
|---------|-------------|---------|
| `npm run deploy:ui` | Deploy UI to CloudFront | Development environment |
| `npm run deploy:ui:dev` | Deploy to dev environment | Development configuration |
| `npm run deploy:ui:prod` | Deploy to production | Production environment |
| `npm run deploy:ui:dry-run` | Preview UI deployment | Show deployment plan |
| `npm run deploy:ui:skip-build` | Deploy without building | Use existing build |

### Full Stack Deployment

| Command | Description | Components |
|---------|-------------|------------|
| `npm run deploy:full:dev` | Deploy everything to dev | Lambda + UI development |
| `npm run deploy:full:prod` | Deploy everything to prod | Complete production deployment |

---

## Container & Build Commands

### Docker Operations

| Command | Description | Output |
|---------|-------------|--------|
| `npm run build` | Build app container | Local Docker image |
| `npm run build:lambda` | Build Lambda container | Lambda-optimized image |
| `npm run build:container` | Enhanced container build | Cross-platform build |
| `npm run build:push` | Build and push to ECR | Update Lambda automatically |
| `npm run build:dry-run` | Preview container build | Show build plan |

---

## AWS & Infrastructure Commands

### AWS Profile Management

| Command | Description | Replaces PowerShell |
|---------|-------------|-------------------|
| `npm run aws:mrb-api` | Switch to deployment profile | `set-aws-profile-mrbapi.ps1` |
| `npm run aws:terraform` | Switch to infrastructure profile | Profile management |
| `npm run aws:toggle` | Toggle between AWS profiles | `toggle-aws-profile.ps1` |
| `npm run aws:status` | Show current AWS profile | Profile verification |
| `npm run aws:validate` | Validate AWS credentials | Credential testing |

### Infrastructure Setup

| Command | Description | Purpose |
|---------|-------------|---------|
| `npm run iam:setup` | Setup IAM policies | Initial infrastructure |
| `npm run iam:status` | Check IAM policy status | Policy verification |

### Database Tunneling

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run tunnel:start` | Start database tunnel | Remote database access |
| `npm run tunnel:stop` | Stop database tunnel | Close connections |  
| `npm run tunnel:status` | Check tunnel status | Connection verification |

---

## Maintenance Commands

### System Maintenance

| Command | Description | Replaces PowerShell |
|---------|-------------|-------------------|
| `npm run maintenance:find-orphans` | Find orphaned S3 images | `Find-OrphanImages.ps1` |
| `npm run maintenance:find-orphans:show-commands` | Show cleanup commands | Image cleanup preparation |

### Health & Monitoring

| Command | Description | Output |
|---------|-------------|--------|
| `npm run health` | Basic health check | API connectivity |
| `npm run health:detailed` | Detailed system status | Full system health |

### Environment Validation

| Command | Description | Checks |
|---------|-------------|-------|
| `npm run validate` | Validate environment setup | Configuration verification |
| `npm run validate:env` | Validate .env configuration | Environment file checks |
| `npm run validate:docker` | Validate Docker configuration | Docker Compose validation |

### System Setup

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run setup` | Initial environment setup | New developer onboarding |
| `npm run setup:local` | Setup for local development | Local environment |
| `npm run setup:atlas` | Setup for Atlas development | Atlas configuration |
| `npm run setup:lambda` | Setup for Lambda development | Lambda environment |

---

## Database Analysis Commands

### Data Quality

| Command | Description | Purpose |
|---------|-------------|---------|
| `npm run db:analyze` | Analyze database quality | Data health assessment |
| `npm run db:fields` | Analyze database fields | Schema analysis |
| `npm run db:clean` | Preview database cleanup | Show cleanup plan |
| `npm run db:clean-apply` | Apply database cleanup | Execute cleanup |
| `npm run db:clean-full` | Full cleanup with test removal | Complete cleanup |

---

## Logging & Monitoring

### Log Management

| Command | Description | Scope |
|---------|-------------|-------|
| `npm run logs` | View all container logs | Full system logs |
| `npm run logs:app` | View application logs | App container only |
| `npm run logs:db` | View database logs | MongoDB container logs |

---

## Usage Examples

### Daily Development Workflow

```bash
# Start local development
npm run dev:local

# Add test data
npm run test:data

# Run tests
npm run test

# Deploy changes
npm run deploy:lambda
npm run deploy:ui
```

### Switching Environments

```bash
# Switch to Atlas for testing
npm run mode:atlas
npm run dev:atlas

# Back to local development
npm run mode:local
npm run dev:local
```

### Production Deployment

```bash
# Switch to production AWS profile
npm run aws:mrb-api

# Deploy to production
npm run deploy:full:prod
```

### Maintenance Tasks

```bash
# Check system health
npm run health:detailed

# Find orphaned images
npm run maintenance:find-orphans

# Backup Atlas database
npm run backup:atlas
```

---

## Troubleshooting

### Common Issues

**Docker not starting?**

```bash
npm run validate:docker
npm run stop:all
npm run start:local
```

**Code changes not reflected in containers?**

```bash
npm run restart          # Unified restart system - automatically detects and fixes
```

**Docker caching issues?**

```bash
# The unified restart system automatically detects and fixes Docker caching
npm run restart          # Generates build badges to verify deployment
                        # Escalates through restart → rebuild → force rebuild as needed
```

**AWS credentials issues?**

```bash
npm run aws:status
npm run aws:validate
npm run aws:mrb-api
```

**Database connection problems?**

```bash
npm run mode:current
npm run mode:cleanup
npm run restart
```

**Lambda deployment failing?**

```bash
npm run deploy:dry-run
npm run aws:mrb-api
npm run build:dry-run
```

### Getting Help

All Node.js scripts support `--help`:

```bash
node scripts/switch-mode.js --help
node scripts/deploy-lambda.js --help
node scripts/find-orphan-images.js --help
```

---

*This reference replaces all PowerShell scripts with cross-platform npm commands. All commands work on Windows, macOS, and Linux.*
