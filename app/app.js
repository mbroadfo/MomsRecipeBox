// File: app/app.js
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';

dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let dbInstance;

export async function connectToDB() {
  if (!dbInstance) {
    await client.connect();
    dbInstance = client.db(process.env.MONGODB_DB_NAME);
    console.log(`📦 Connected to MongoDB database: ${process.env.MONGODB_DB_NAME}`);
  }
  return dbInstance;
}

// Optional: Gracefully close DB connection (for local dev)
export async function closeDB() {
  await client.close();
  dbInstance = null;
  console.log('🔌 MongoDB connection closed');
}
