# MomsRecipeBox - DB Tier

## Overview

This directory contains database initialization scripts and recipe seed data for local development with MongoDB.

## Quick Start

```bash
# Seed the database
node init_mrb_db.js
```

For a complete setup guide, see the [Getting Started Guide](../docs/guides/getting_started.md).

## Key Features

- **Seed Data**: Initial recipe data for development
- **Schema Design**: MongoDB schema definitions
- **Database Initialization**: Scripts for setting up the database
- **Migration Support**: Tools for updating data structure

## Data Model

For a complete description of the database schema and design, see the [MongoDB Guide](../docs/technical/mongodb_guide.md).

### Core Collections

- `recipes` - Recipe documents with likes_count
- `favorites` - User favorites with references to recipes
- `comments` - Comments on recipes
- `shopping_lists` - User shopping lists
- `users` - User information

## Environment Variables

Set in `.env` (and consumed by Docker / app):

```bash
MONGODB_URI=<full-connection-string>
MONGODB_DB_NAME=<db-name>
MONGODB_ROOT_USER=<root-user>
MONGODB_ROOT_PASSWORD=<root-password>
```

For more details on MongoDB configuration, see the [Environment Variables Guide](../docs/technical/environment_variables.md).

## Files & Structure

- `init_mrb_db.js` — Seeds MongoDB with recipes from `recipes/` JSON files
- `recipes/` — Individual recipe documents for seeding
- `Dockerfile` - Docker configuration for the MongoDB container

## Backup and Restore

For information about database backup and restore procedures, see the [MongoDB Guide](../docs/technical/mongodb_guide.md#backup-and-restore).

## MongoDB Atlas Support

The application supports both local MongoDB and MongoDB Atlas. For detailed setup instructions, see the [MongoDB Guide](../docs/technical/mongodb_guide.md#mongodb-atlas).

## Contributing

To contribute to the DB tier:

1. Add seed data to the `recipes/` directory
2. Update the schema documentation in the MongoDB Guide
3. Create or update migration scripts as needed

For more information, see the [Contributing Guide](../docs/development/contributing.md).
