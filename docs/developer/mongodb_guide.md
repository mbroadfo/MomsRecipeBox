# MongoDB Guide for MomsRecipeBox

This guide consolidates all MongoDB-related documentation for the MomsRecipeBox application. It covers both local development and MongoDB Atlas cloud configurations, environment variables, backup procedures, and database management.

## Table of Contents

1. [MongoDB Configuration](#mongodb-configuration)
   - [Environment Variables](#environment-variables)
   - [Connection Modes](#connection-modes)
   - [Switching Between Modes](#switching-between-modes)
2. [Local MongoDB Setup](#local-mongodb-setup)
   - [Docker Configuration](#docker-configuration)
   - [Initialization](#initialization)
   - [Local Testing](#local-testing)
3. [MongoDB Atlas Setup](#mongodb-atlas-setup)
   - [Creating an Atlas Account](#creating-an-atlas-account)
   - [Setting Up an M0 Cluster](#setting-up-an-m0-cluster)
   - [Security Configuration](#security-configuration)
   - [Connection String](#connection-string)
4. [Secure Credentials Management](#secure-credentials-management)
   - [AWS Secrets Manager](#aws-secrets-manager)
   - [Local Development Secrets](#local-development-secrets)
5. [Data Model](#data-model)
   - [Collections](#collections)
   - [Schemas](#schemas)
   - [Indexes](#indexes)
6. [Database Management Tools](#database-management-tools)
   - [Quality Analysis](#quality-analysis)
   - [Data Cleanup](#data-cleanup)
   - [Field Analysis](#field-analysis)
7. [Backup & Recovery](#backup--recovery)
   - [Backup Operations](#backup-operations)
   - [Restore Procedures](#restore-procedures)
   - [Emergency Recovery](#emergency-recovery)
8. [Troubleshooting](#troubleshooting)
   - [Common Issues](#common-issues)
   - [Diagnostics](#diagnostics)

## MongoDB Configuration

### Environment Variables

MomsRecipeBox uses a consistent naming convention for MongoDB configuration to clearly separate local development and Atlas cloud deployments.

#### Local MongoDB Variables

All local MongoDB configuration variables are prefixed with `MONGODB_LOCAL_`:

```env
# Local MongoDB Configuration
MONGODB_LOCAL_ROOT_USER=admin
MONGODB_LOCAL_ROOT_PASSWORD=supersecret
MONGODB_LOCAL_ADMIN_USER=admin
MONGODB_LOCAL_ADMIN_PASSWORD=superdupersecret
MONGODB_LOCAL_URI=mongodb://admin:supersecret@mongo:27017/moms_recipe_box_dev?authSource=admin
```

#### Shared Variables

Some variables are common across both local and Atlas modes:

```env
# Used in both local and Atlas modes
MONGODB_DB_NAME=moms_recipe_box_dev
```

#### Mode Selection

The `MONGODB_MODE` variable determines which connection mode to use:

```env
# Set to 'local' or 'atlas'
MONGODB_MODE=local
```

### Connection Modes

The application supports two database deployment options:

1. **Local MongoDB (Docker)**:
   - Self-contained in Docker Compose
   - Perfect for development and testing
   - No external dependencies

2. **MongoDB Atlas (Cloud)**:
   - Managed cloud database
   - Free M0 tier available
   - Better reliability and scaling options
   - No local database container needed

### Switching Between Modes

Use the modern npm commands to switch between local and Atlas modes:

```bash
# Switch to local MongoDB (with automatic cleanup)
npm run dev:local

# Switch to MongoDB Atlas (with automatic cleanup)
npm run dev:atlas

# Show current mode
npm run mode:show

# Manual mode switching without starting containers
npm run mode:local    # Set .env to local mode
npm run mode:atlas    # Set .env to atlas mode
```

The `dev:local` and `dev:atlas` commands automatically stop any running containers and start the correct configuration. For backward compatibility, you can still use the PowerShell script:

```powershell
# Legacy PowerShell script (still supported)
.\scripts\Toggle-MongoDbConnection.ps1 -Mode local
.\scripts\Toggle-MongoDbConnection.ps1 -Mode atlas
```

## Local MongoDB Setup

### Docker Configuration

The local MongoDB instance is configured through `docker-compose.yml`:

```yaml
# MongoDB service configuration
mongodb:
  image: mongo:latest
  container_name: mrb_mongodb
  environment:
    MONGO_INITDB_ROOT_USERNAME: ${MONGODB_LOCAL_ROOT_USER:-admin}
    MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_LOCAL_ROOT_PASSWORD:-supersecret}
    MONGO_INITDB_DATABASE: ${MONGODB_DB_NAME:-moms_recipe_box_dev}
  volumes:
    - mongodb_data:/data/db
    - ./db:/docker-entrypoint-initdb.d
  ports:
    - "27017:27017"
  networks:
    - mrbnet
```

### Initialization

During first startup, the database is initialized with:

- Root user creation
- Database creation
- Collection setup
- Initial recipe data from JSON files

The initialization script is located at `db/init_mrb_db.js`.

### Local Testing

Verify local MongoDB is running correctly:

```powershell
# Check MongoDB container status
docker ps | Select-String mongodb

# Connect to MongoDB shell
docker exec -it mrb_mongodb mongosh -u admin -p supersecret
```

## MongoDB Atlas Setup

### Creating an Atlas Account

1. Visit [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create an account
2. Create an organization (or use the default)
3. Create a project named "MomsRecipeBox"

### Setting Up an M0 Cluster

1. Create a new cluster with the free M0 tier
2. Choose a cloud provider and region close to your users
3. Keep default settings for cluster name and configuration

### Security Configuration

1. **Database User**:
   - Create a dedicated application user (e.g., "mrbapp")
   - Set a secure password
   - Assign readWrite permissions on the moms_recipe_box_dev database

2. **Network Access**:
   - Add your IP address to the access list
   - For production, add the IP addresses of your servers
   - For development, you can temporarily enable access from anywhere (0.0.0.0/0)

### Connection String

After configuration, MongoDB Atlas provides a connection string in this format:

```text

```

Replace `<PASSWORD>` with your actual database password.

## Secure Credentials Management

### AWS Secrets Manager

For production environments, MongoDB Atlas credentials are securely stored in AWS Secrets Manager:

#### Creating the Secret

1. Open the AWS Console and navigate to Secrets Manager
2. Click "Store a new secret"
3. Select "Other type of secret"
4. Add the following key-value pairs:

| Key                        | Value                        |
|----------------------------|------------------------------|
| `MONGODB_ATLAS_PUBLIC_KEY` | `your-public-key`            |
| `MONGODB_ATLAS_PRIVATE_KEY`| `your-private-key`           |
| `MONGODB_ATLAS_ORG_ID`     | `your-org-id`                |
| `MONGODB_ATLAS_PROJECT_ID` | `your-project-id`            |
| `MONGODB_ATLAS_PASSWORD`   | `your-secure-db-password`    |
| `MONGODB_URI`              | `mongodb+srv://...`          |

1. Name the secret `moms-recipe-secrets-dev` (for development environment)
1. Complete the creation wizard with default settings

#### Retrieving Secrets

The application retrieves the connection string from AWS Secrets Manager at runtime:

```powershell
# Get MongoDB Atlas URI from AWS Secrets Manager
$mongoUri = .\scripts\Get-MongoAtlasUri.ps1

# Pass the URI as an environment variable
$env:MONGODB_ATLAS_URI = $mongoUri
```

### Local Development Secrets

For local development, you can use the `Create-TfVarsFile.ps1` script:

```powershell
.\scripts\Create-TfVarsFile.ps1
```

This script will:

- Prompt for your MongoDB Atlas credentials
- Create the necessary configuration files
- Detect your IP address for the access list

## Data Model

### Collections

The database uses the following collections:

| Collection        | Purpose                                         |
|-------------------|--------------------------------------------------|
| `recipes`         | Store recipe documents with ingredients, instructions |
| `favorites`       | Track user favorites (one document per user-recipe pair) |
| `comments`        | Store comments on recipes |
| `shopping_lists`  | User shopping lists with items from recipes |
| `users`           | User profiles and preferences |

### Schemas

#### Recipe Schema

```javascript
{
  _id: ObjectId,
  title: String,          // Required
  subtitle: String,       // Optional
  description: String,    // Optional
  ingredients: [          // Required
    {
      name: String,       // Ingredient name
      amount: String,     // Optional amount
      unit: String        // Optional unit
    }
  ],
  instructions: [String], // Required, steps to prepare
  tags: [String],         // Optional categorization
  created_at: Date,       // Creation timestamp
  updated_at: Date,       // Last update timestamp
  owner_id: String,       // User ID of creator
  image_url: String,      // Optional image reference
  likes_count: Number,    // Count of favorites/likes
  visibility: String      // public, private, family
}
```

#### Favorites Schema

```javascript
{
  _id: ObjectId,
  userId: String,        // User who favorited
  recipeId: String,      // Recipe reference
  createdAt: Date        // When favorited
}
```

#### Shopping List Schema

```javascript
{
  _id: ObjectId,
  userId: String,        // User who owns list
  items: [               // Shopping list items
    {
      _id: ObjectId,     // Item identifier
      ingredient: String, // Ingredient name
      recipeId: String,  // Source recipe
      recipeTitle: String, // Recipe title
      checked: Boolean   // Purchase status
    }
  ],
  updatedAt: Date        // Last modification
}
```

### Indexes

The following indexes are maintained for performance:

```javascript
// Recipes
db.recipes.createIndex({ "title": 1 });
db.recipes.createIndex({ "owner_id": 1 });
db.recipes.createIndex({ "visibility": 1 });
db.recipes.createIndex({ "tags": 1 });

// Favorites
db.favorites.createIndex({ "recipeId": 1, "userId": 1 }, { unique: true });
db.favorites.createIndex({ "userId": 1, "createdAt": -1 });
db.favorites.createIndex({ "recipeId": 1 });

// Shopping Lists
db.shopping_lists.createIndex({ "userId": 1 }, { unique: true });
```

## Database Management Tools

The application includes comprehensive database management tools located in `tools/database/`:

### Quality Analysis

Performs comprehensive analysis of recipe data quality:

```powershell
# Analyze database quality
npm run db:analyze
# or
node tools/database/quality-analyzer.js
```

This tool identifies:

- Missing required fields
- Data structure issues
- Content quality problems
- Standardization opportunities

### Data Cleanup

Automatically fixes structural and standardization issues:

```powershell
# Preview changes
npm run db:clean

# Apply fixes
npm run db:clean-apply

# Apply fixes + remove tests
npm run db:clean-full
```

Features include:

- Field standardization
- Legacy field conversion
- Content cleanup
- Test data removal

### Field Analysis

Quickly analyzes field usage patterns:

```powershell
# Analyze field usage
npm run db:fields
# or
node tools/database/field-analyzer.js
```

This provides:

- Field distribution statistics
- Usage patterns
- Consistency checking
- Example values

## Backup & Recovery

The application includes a comprehensive backup and recovery system:

### Backup Operations

#### Local Backup

```powershell
# Create a basic backup
.\scripts\MongoDB-Backup.ps1 -Operation backup -BackupPath ".\backups\mongodb_atlas"
```

#### S3 Backup

```powershell
# Backup to S3
.\scripts\MongoDB-Backup.ps1 -Operation backup -UseS3 -S3Bucket "mrb-mongodb-backups-dev"

# Keep local copy when using S3
.\scripts\MongoDB-Backup.ps1 -Operation backup -UseS3 -KeepLocalBackup
```

#### Scheduled Backups

```powershell
# Schedule daily backup
.\scripts\MongoDB-Backup.ps1 -Operation schedule -TaskName "DailyMongoDBBackup" -RunTime "3:00am" -Frequency "Daily"
```

### Restore Procedures

#### List Available S3 Backups

```powershell
# List S3 backups
.\scripts\MongoDB-Backup.ps1 -Operation restore -UseS3 -S3Bucket "mrb-mongodb-backups-dev" -ListBackups
```

#### Restore from S3

```powershell
# Restore from S3
.\scripts\MongoDB-Backup.ps1 -Operation restore -UseS3 -S3Bucket "mrb-mongodb-backups-dev" -BackupKey "backups/mongodb_backup_2023-10-01.zip"

# Force restore without confirmation
.\scripts\MongoDB-Backup.ps1 -Operation restore -UseS3 -S3Bucket "mrb-mongodb-backups-dev" -Force
```

### Emergency Recovery

In case of data loss or corruption:

1. **Stop the application**:

   ```powershell
   docker compose down
   ```

2. **Find the most recent good backup**:

   ```powershell
   .\scripts\MongoDB-Backup.ps1 -Operation restore -ListBackups -S3Bucket "mrb-mongodb-backups-dev"
   ```

3. **Restore from backup**:

   ```powershell
   .\scripts\MongoDB-Backup.ps1 -Operation restore -S3Bucket "mrb-mongodb-backups-dev" -BackupKey "backups/mongodb_backup_2023-10-01.zip" -Force
   ```

4. **Restart the application**:

   ```powershell
   docker compose up -d
   ```

## Troubleshooting

### Common Issues

#### MongoDB Tools Not Found

- **Error**: "MongoDB Database Tools are not installed or not in PATH"
- **Solution**: Install MongoDB Database Tools from the MongoDB website and add the bin directory to your PATH
- **Alternative**: Specify full path to mongodump using environment variables

#### Connection Errors

- **Error**: "Failed to connect to MongoDB"
- **Solution**: Verify MongoDB is running with `docker ps` and check credentials in `.env` file

#### Atlas Access Denied

- **Error**: "Access denied to MongoDB Atlas"
- **Solution**: Check IP whitelist in Atlas security settings and verify credentials

#### Database Corruption

- **Check**: Run database verification command in MongoDB shell
- **Solution**: Restore from most recent backup using restore procedures above

### Diagnostics

For troubleshooting database connectivity:

```powershell
# Test local MongoDB connection
.\scripts\Test-MongoDBConnection.ps1 -Mode local

# Test Atlas MongoDB connection
.\scripts\Test-MongoDBConnection.ps1 -Mode atlas
```

For detailed database status:

```powershell
# Get comprehensive database status
.\scripts\Get-MongoDBStatus.ps1
```

---

## Related Documentation

- [Database Schema Documentation](../../db/README.md)
- [Database Tools Documentation](../../tools/README.md)
- [API Documentation](../../app/README.md)
