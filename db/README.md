# MomsRecipeBox - DB Tier (MongoDB)

This directory contains database initialization scripts and recipe seed data for local development.

## Data Model (Recent Update)

- Recipes collection now includes a denormalized integer field: `likes_count` (defaults to 0 on creation) used for fast favorite counts.
- New `favorites` collection introduced (one document per user/recipe pair) powering scalable like toggling.
  - Suggested indexes (created lazily by handler):
    - `{ recipeId: 1, userId: 1 }` unique
    - `{ userId: 1, createdAt: -1 }`
    - `{ recipeId: 1 }`

## Files & Structure

- `init_mrb_db.js` — Seeds MongoDB with recipes from `recipes/` JSON files.
- `recipes/` — Individual recipe documents for seeding.
- (Future) Migration scripts can adjust older documents missing `likes_count` (handler backfills on read if absent).

## Environment Variables

Set in `.env` (and consumed by Docker / app):

```bash
MONGODB_URI=<full-connection-string OR constructed in docker-compose>
MONGODB_DB_NAME=<db-name>
MONGODB_ROOT_USER=<root-user>
MONGODB_ROOT_PASSWORD=<root-password>
```

For local Docker Compose, `docker-compose.yml` builds URI from individual parts.

## Seeding the Database

```powershell
node init_mrb_db.js
```

The script will:

- Connect using `MONGODB_URI`.
- Load all JSON files in `recipes/` and insert if not already present.
- (Optional enhancement) Could upsert to avoid duplicates.

## Favorites Backfill (If Migrating)

Legacy recipes that had an embedded `likes` array should be migrated:

```js
// Example one-off script snippet
const bulk = [];
const cursor = db.collection('recipes').find({ likes: { $exists: true } });
while (await cursor.hasNext()) {
  const r = await cursor.next();
  const count = Array.isArray(r.likes) ? r.likes.length : 0;
  bulk.push({ updateOne: { filter: { _id: r._id }, update: { $set: { likes_count: count }, $unset: { likes: '' } } } });
}
if (bulk.length) await db.collection('recipes').bulkWrite(bulk);
```

The active application code tolerates missing `likes_count` by recomputing from `favorites`.

## Connectivity Test

(If you add a simple connectivity script):

```powershell
node test_mongo.js
```

## Notes

- Passwords in plain text acceptable for local dev only; use secrets management for production.
- Ensure indexes for `favorites` are created (handler does this lazily).

---

For questions or contributions, coordinate with the API tier to keep schema expectations aligned.
