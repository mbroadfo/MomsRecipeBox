# Database Testing

This directory contains a minimalist approach to testing MongoDB connectivity and inspecting database contents.

## Getting Started

1. Make sure the MongoDB instance is running (local or remote)
2. Run the database test script:

```bash
npm run db:test
```

## What the Script Tests

The `db-test.js` script:

1. Connects to MongoDB using a direct connection string
2. Lists all collections in the database
3. Counts the number of recipes
4. Displays sample recipe fields and their types
5. Shows a sample of recipe titles (up to 5)

## Configuration

To change the connection string, edit the `db-test.js` file directly and modify the `uri` variable:

```javascript
// For local development
const uri = 'mongodb://admin:supersecret@localhost:27017/moms_recipe_box_dev?authSource=admin';

// For Atlas (replace with your actual connection string)
// const uri = '
```
