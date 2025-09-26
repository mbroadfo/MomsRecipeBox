# Quick Start Guide

Get Mom's Recipe Box running in under 5 minutes.

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

## 3. Start the Application

```bash
npm run dev:local
```

This will:
- Start MongoDB and app containers
- Launch the API server on `http://localhost:3000`
- You can add the UI with `npm run ui:dev` in another terminal

## 4. Verify Everything Works

```bash
npm run health:detailed
```

Should show all services running and healthy.

## 5. Add Test Data (Optional)

```bash
npm run test:data
```

Adds sample recipes and shopping list items for testing.

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