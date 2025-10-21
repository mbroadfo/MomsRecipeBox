# Quick Start Guide

Get Mom's Recipe Box running in under 5 minutes using the new four-profile deployment system.

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **AWS CLI** (optional) - For cloud features

## 1. Clone & Install

```bash
git clone https://github.com/mbroadfo/MomsRecipeBox.git
cd MomsRecipeBox
npm install
```

## 2. Setup Environment

```bash
npm run setup:local
```

This creates your `.env` file with local development settings.

## 3. Choose Your Profile

The application supports four deployment profiles:

### 🏠 Local Profile (Recommended for First Run)
```bash
npm run profile:local    # Switch to local profile
npm run profile:start    # Start local infrastructure
```

### 🌍 Atlas Profile (For Cloud Database)
```bash
npm run profile:atlas    # Switch to atlas profile  
npm run profile:start    # Start backend with Atlas DB
```

### ⚡ Lambda Profile (For Testing Production API)
```bash
npm run profile:lambda   # Switch to lambda profile
# Connects directly to deployed Lambda - no local backend needed
```

### ☁️ Cloud Profile (Full Production)
```bash
npm run profile:cloud    # Switch to cloud profile
# All services are cloud-deployed
```

## 4. Check Your Profile Status

```bash
npm run profile:show     # Shows current profile and configuration
```

## 5. Start the UI (Optional)

```bash
cd ui && npm run dev     # Start React development server
```

The UI automatically connects to the correct backend based on your current profile.

## 6. Verify Everything Works

```bash
npm run health:detailed  # Check API health
```

Should show all services running and healthy.

## 7. Add Test Data or Restore Backup

### Option A: Add Test Data
```bash
npm run test:data
```

### Option B: Restore from Backup (if available)
```bash
# Restore from S3 backup
npm run restore:from-s3

# Or restore latest backup
npm run restore:latest
```

This will populate your database with either test recipes or your backed-up family recipes.

---

## What's Running?

- **API Server**: http://localhost:3000
- **MongoDB**: localhost:27017 (inside Docker)
- **Admin Panel**: http://localhost:3000/admin
- **Health Check**: http://localhost:3000/health

## Next Steps

### For Users
- See [User Guide](docs/user/getting_started.md) for how to use the application
- Check out [Shopping List Guide](docs/user/shopping_list.md)

### For Developers  
- Read [Development Guide](docs/developer/setup-development.md)
- Explore [NPM Commands Reference](NPM_COMMANDS.md) - 80+ automation commands
- Check [Database Guide](docs/developer/mongodb_guide.md)
- **Note**: GitHub Actions validates code quality - use npm scripts for deployment

### For DevOps

- See [Deployment Guide](docs/developer/deployment-guide.md)
- Review [Infrastructure Documentation](infra/README.md)

## Troubleshooting

**Docker not starting?**

```bash
npm run validate:docker
```

**Port already in use?**

```bash
npm run stop:all
npm run start:local
```

**Environment issues?**

```bash
npm run validate:env
```

**Need help?** All scripts support `--help`:

```bash
node scripts/switch-mode.js --help
```

---

## Available Environments

- **Local**: `npm run dev:local` - Full local development
- **Atlas**: `npm run dev:atlas` - Cloud database, local API  
- **Lambda**: `npm run dev:lambda` - Full cloud backend

Switch anytime with `npm run mode:atlas` or `npm run mode:local`.

**Ready to go!** The application should now be running locally.