// app/mongoClient.js

import 'dotenv/config';
import { MongoClient } from 'mongodb';

let cachedDb = null;

async function getDb() {
  if (cachedDb) return cachedDb;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!uri || !dbName) {
    throw new Error('Missing MONGODB_URI or MONGODB_DB_NAME in environment variables');
  }

  const client = new MongoClient(uri);
  await client.connect();
  cachedDb = client.db(dbName);
  console.log(`📦 Connected to MongoDB database: ${dbName}`);
  return cachedDb;
}

export { getDb };
