

# MomsRecipeBox - DB Tier (MongoDB)

This directory contains the database initialization and connectivity scripts for the MomsRecipeBox project. The DB tier uses MongoDB for all data storage and seeding.

## Files & Structure

- `init_mrb_db.js` — Seeds the MongoDB database with an admin user and recipes from JSON files.
- `recipes/` — Contains recipe data as individual `.json` files for seeding.
- `test_mongo.js` — Simple connectivity test to verify MongoDB is accessible.

## Environment Variables

Set these in your `.env` file:

```
MONGODB_URI=<your-mongodb-connection-string>
MONGODB_DB_NAME=<your-db-name>
MONGODB_ADMIN_USER=<admin-username>
MONGODB_ADMIN_PASSWORD=<admin-password>
```

## Seeding the Database

To initialize the database, run:

```bash
node init_mrb_db.js
```

This will:
- Create the admin user (using credentials from `.env`)
- Load all recipes from the `recipes/` directory
- Insert them into the `recipes` collection

## Connectivity Test

To verify MongoDB is up and accessible:

```bash
node test_mongo.js
```

## Notes

- The admin password is stored in plaintext for local/dev. For production, update `init_mrb_db.js` to hash passwords before storing.

---

For questions or to contribute, contact the MomsRecipeBox dev team.
