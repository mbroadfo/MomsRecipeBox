# MongoDB Database Comparison Tool

This document explains how to use the `Compare-MongoDB.ps1` script to verify synchronization between your local MongoDB database and MongoDB Atlas.

## Overview

The `Compare-MongoDB.ps1` script is designed to:

1. Connect to both your local MongoDB instance and MongoDB Atlas
2. Compare collections and document counts between them
3. Provide detailed reporting about the sync status
4. Demonstrate the use of environment variables for accessing both databases

## Prerequisites

- MongoDB Shell (mongosh) installed and in your PATH
- Access to both local MongoDB and MongoDB Atlas
- Proper credentials configured in your `.env` file or provided as parameters

## Connection Configuration

### MongoDB Atlas Connection Options

Add one of the following to your `.env` file:

1. **Complete connection URI**:

   ```env
   MONGODB_ATLAS_URI=
   ```

2. **Individual connection components**:

   ```env
   MONGODB_ATLAS_HOST=cluster.mongodb.net
   MONGODB_ATLAS_USER=username
   MONGODB_ATLAS_PASSWORD=password
   ```

3. **Using the connection toggle configuration**:  
   If you've already set up the connection toggle feature with:

   ```env
   MONGODB_MODE=atlas
   MONGODB_URI=mongodb+srv://...
   ```

   The script will automatically use these values.

### Local MongoDB Connection

For local MongoDB, the script uses:

```env
MONGODB_ROOT_USER=your_local_user
MONGODB_ROOT_PASSWORD=your_local_password
```
These should already be in your `.env` file for local development.

## Usage

### Basic Usage

Run the script from the project root directory:

```powershell
.\scripts\Compare-MongoDB.ps1
```

This will use the connection information from your `.env` file.

### Advanced Usage

You can specify connection strings directly:

```powershell
.\scripts\Compare-MongoDB.ps1 -LocalUri "mongodb://username:password@localhost:27017/moms_recipe_box" -AtlasUri "
```

### Additional Parameters

- `-DatabaseName`: Specify a different database name (default: moms_recipe_box)
- `-DetailedOutput`: Show additional output information

## How It Works

1. **Connection Setup**: The script first loads environment variables and constructs connection strings
2. **Connectivity Testing**: Tests connections to both databases
3. **Schema Comparison**: Compares collections between databases
4. **Data Comparison**: Compares document counts for each collection
5. **Reporting**: Generates a detailed report of differences

## Example Output

```console
===================================================
  MongoDB Comparison Test: Local vs Atlas
===================================================

Testing Local connection...
✅ Successfully connected to Local database (MongoDB v6.0.5)
   - Collections: 7
   - Database Size: 2.34 MB

Testing Atlas connection...
✅ Successfully connected to Atlas database (MongoDB v6.0.11)
   - Collections: 7
   - Database Size: 2.34 MB

Comparing databases...

Collection Comparison:
=====================
✅ Both databases have the same collections

Document Count Comparison:
=========================

Collection     LocalCount AtlasCount Match Difference
----------     ---------- ---------- ----- ----------
comments              15         15 ✅            0
favorites              7          7 ✅            0
recipes               23         23 ✅            0
shopping_items        12         12 ✅            0
system.indexes         0          0 ✅            0
users                  3          3 ✅            0
validations            2          2 ✅            0

Overall Assessment:
==================
✅ DATABASES ARE IN SYNC
   Both databases have identical collections and document counts

Test completed successfully!
```

## Troubleshooting

### MongoDB Tools Not Found

If you receive an error about MongoDB tools not being found:

1. Ensure MongoDB Shell (mongosh) is installed
2. Add the MongoDB bin directory to your system PATH
3. Alternatively, install MongoDB Database Tools package

### Connection Errors

If you encounter connection errors:

1. Verify that your MongoDB instances are running
2. Check your credentials in the `.env` file
3. For Atlas, verify your IP address is whitelisted in the Atlas console

### Database Differences

If databases are not in sync, you may want to:

1. Check which collections or documents are different
2. Run a backup/restore process to synchronize them
3. Use MongoDB Atlas Data Explorer to investigate specific differences

## Further Improvements

Future enhancements could include:

- Deep document comparison for selected collections
- Automatic synchronization options
- Reporting exported to CSV or JSON formats
- Additional customization options for comparison criteria