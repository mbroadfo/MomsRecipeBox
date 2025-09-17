# MongoDB Environment Variables Guide

## Environment Variable Naming Convention

This application uses a consistent naming convention for MongoDB configuration:

### Local MongoDB Variables

All local MongoDB configuration variables are prefixed with `MONGODB_LOCAL_` to clearly indicate they are for local development use only:

```env
# Local MongoDB Configuration
MONGODB_LOCAL_ROOT_USER=admin
MONGODB_LOCAL_ROOT_PASSWORD=supersecret
MONGODB_LOCAL_ADMIN_USER=admin
MONGODB_LOCAL_ADMIN_PASSWORD=superdupersecret
MONGODB_LOCAL_URI=mongodb://admin:supersecret@mongo:27017/moms_recipe_box?authSource=admin
```

### Mode Selection

The `MONGODB_MODE` variable determines which connection mode to use:

```env
# Set to 'local' or 'atlas'
MONGODB_MODE=local
```

### Shared Variables

Some variables are common across both local and Atlas modes:

```env
# Used in both local and Atlas modes
MONGODB_DB_NAME=moms_recipe_box
```

### MongoDB Atlas Configuration

MongoDB Atlas credentials are **not** stored in the `.env` file. Instead, they are securely retrieved from AWS Secrets Manager at runtime:

1. The application uses the `Get-MongoAtlasUri.ps1` script to fetch the connection string
2. The connection string is passed to the container as an environment variable
3. No sensitive Atlas credentials are ever stored in the `.env` file

## Switching Between Modes

Use the provided script to switch between local and Atlas modes:

```powershell
# Switch to local MongoDB
.\scripts\Toggle-MongoDbConnection.ps1 -Mode local

# Switch to MongoDB Atlas
.\scripts\Toggle-MongoDbConnection.ps1 -Mode atlas

# Show current mode
.\scripts\Toggle-MongoDbConnection.ps1 -ShowCurrent
```

## Docker Compose Configuration

The docker-compose.yml file uses environment variables with appropriate defaults:

```yaml
# Example for local MongoDB container
environment:
  MONGO_INITDB_ROOT_USERNAME: ${MONGODB_LOCAL_ROOT_USER:-admin}
  MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_LOCAL_ROOT_PASSWORD:-supersecret}
  MONGO_INITDB_DATABASE: ${MONGODB_DB_NAME:-moms_recipe_box}
```

## AWS Secrets Manager Integration

For MongoDB Atlas mode, the application retrieves the connection string from AWS Secrets Manager:

```powershell
# Get MongoDB Atlas URI from AWS Secrets Manager
$mongoUri = .\scripts\Get-MongoAtlasUri.ps1

# Pass the URI as an environment variable
$env:MONGODB_ATLAS_URI = $mongoUri
```

This approach ensures sensitive credentials are never stored in configuration files or committed to source control.
