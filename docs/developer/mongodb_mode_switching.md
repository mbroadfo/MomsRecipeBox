# MongoDB Mode Switching Guide

## Overview

The MongoDB Mode Switcher (`scripts/switch-mode.js`) is a cross-platform Node.js script that replaces the previous PowerShell-only `Toggle-MongoDbConnection.ps1`. It provides seamless switching between local Docker MongoDB and MongoDB Atlas cloud database.

## Features

- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Automatic Container Management**: Handles Docker compose profiles
- **Environment Management**: Updates `.env` file automatically
- **AWS Integration**: Retrieves Atlas credentials from AWS Secrets Manager
- **Clean Containers**: Removes stopped containers to keep Docker Desktop clean
- **Status Display**: Shows current mode and container status
- **Comprehensive Help**: Built-in help and error recovery

## Quick Start

```bash
# Switch to local MongoDB
npm run mode:local

# Switch to Atlas MongoDB  
npm run mode:atlas

# Check current mode
npm run mode:current

# Toggle between modes
npm run mode:toggle

# Clean up all containers
npm run mode:cleanup
```

## Command Reference

### Basic Mode Switching

```bash
# Direct script usage
node scripts/switch-mode.js local
node scripts/switch-mode.js atlas
node scripts/switch-mode.js --show-current

# npm shortcuts (recommended)
npm run mode:local        # Switch to local mode
npm run mode:atlas        # Switch to atlas mode
npm run mode:current      # Show current status
npm run mode:toggle       # Toggle between modes
npm run mode:cleanup      # Clean up containers
```

### Advanced Options

```bash
# Update .env without restarting containers
node scripts/switch-mode.js local --no-restart

# Get help
node scripts/switch-mode.js --help
```

## How It Works

### Local Mode (`local`)

1. **Stops Atlas containers** - Uses `docker-compose --profile atlas down`
2. **Updates environment** - Sets `MONGODB_MODE=local` in `.env`
3. **Starts local containers** - Runs `docker-compose --profile local up -d`
4. **Verifies status** - Checks that MongoDB and app containers are healthy

**Containers started:**

- `momsrecipebox-mongo` - Local MongoDB database
- `momsrecipebox-mongo-express` - Database admin interface
- `momsrecipebox-app-local` - Application server

**Access points:**

- Application: <http://localhost:3000>
- MongoDB Express: <http://localhost:8081>

### Atlas Mode (`atlas`)

1. **Retrieves credentials** - Gets MongoDB URI from AWS Secrets Manager
2. **Stops local containers** - Uses `docker-compose --profile local down`
3. **Updates environment** - Sets `MONGODB_MODE=atlas` in `.env`
4. **Starts Atlas container** - Runs `docker-compose --profile atlas up -d`
5. **Verifies connection** - Tests Atlas database connectivity

**Containers started:**

- `momsrecipebox-app-atlas` - Application server connected to Atlas

**Access points:**

- Application: <http://localhost:3000>
- Database: MongoDB Atlas (cloud)

## Configuration

### Environment Variables

The script manages these `.env` variables automatically:

```env
MONGODB_MODE=local          # or 'atlas'
MONGODB_DB_NAME=moms_recipe_box_dev
LOCAL_HOST_PORT=3000
APP_MODE=express
```

### AWS Secrets Manager

For Atlas mode, the script retrieves the MongoDB connection string from AWS Secrets Manager:

- **Secret Name**: `moms-recipe-secrets-dev`
- **Region**: `us-west-2`
- **Expected Key**: `MONGODB_URI`

### Docker Compose Profiles

The script uses Docker Compose profiles to manage different container sets:

- **`local` profile**: Local MongoDB + app containers
- **`atlas` profile**: Atlas-connected app container

## Troubleshooting

### Common Issues

#### "Docker is not running"

```bash
# Make sure Docker Desktop is started
docker info
```

#### "AWS credentials not configured"

```bash
# Check AWS configuration
npm run aws:status

# Or set AWS profile
npm run aws:terraform
```

#### "Atlas configuration not found"

The script will show helpful guidance for configuring MongoDB Atlas credentials in AWS Secrets Manager.

#### "Containers not stopping cleanly"

```bash
# Force cleanup all containers
npm run mode:cleanup

# Then restart desired mode
npm run mode:local
```

### Debug Information

Get detailed container status:

```bash
# Check all containers
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check current mode
npm run mode:current

# View container logs
docker-compose logs -f app-local    # for local mode
docker-compose logs -f app-atlas    # for atlas mode
```

## Comparison with PowerShell Version

| Feature | PowerShell Script | Node.js Script |
|---------|------------------|----------------|
| **Platform Support** | Windows only | Windows, macOS, Linux |
| **Container Cleanup** | `docker-compose stop` | `docker-compose down` |
| **Progress Feedback** | Basic | Enhanced with colors |
| **Error Handling** | Limited | Comprehensive |
| **Help System** | Basic | Built-in with examples |
| **npm Integration** | None | Full integration |
| **AWS Integration** | Manual | Automatic |

## Migration Notes

### For Existing Users

The PowerShell script (`scripts/Toggle-MongoDbConnection.ps1`) is preserved and continues to work. You can:

1. **Continue using PowerShell** - No changes required
2. **Migrate to npm scripts** - Use `npm run mode:local` instead
3. **Use both** - Scripts are compatible and can be used interchangeably

### Benefits of Migration

- **Cross-platform development** - Work on any OS
- **Cleaner Docker management** - No lingering stopped containers  
- **Better error messages** - More helpful troubleshooting
- **IDE integration** - Works in any terminal/IDE
- **Faster execution** - Node.js startup is faster than PowerShell

## Advanced Usage

### Integration with CI/CD

```yaml
# GitHub Actions example
- name: Setup Local MongoDB
  run: npm run mode:local

- name: Run tests
  run: npm test

- name: Cleanup
  run: npm run mode:cleanup
```

### Scripting

```bash
#!/bin/bash
# Development workflow script

echo "Setting up local environment..."
npm run mode:local

echo "Running tests..."
npm test

echo "Switching to Atlas for integration tests..."
npm run mode:atlas
npm run test:integration

echo "Cleaning up..."
npm run mode:cleanup
```

This tool represents a significant step in the modernization of MomsRecipeBox development workflows, providing cross-platform compatibility while maintaining all existing functionality.

