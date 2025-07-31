import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);

async function run() {
  try {
    console.log("Connecting to local MongoDB...");
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME);
    console.log(`✅ Connected to database: ${db.databaseName}`);

    // Simple test
    const result = await db.collection('test').insertOne({ name: 'Local Test', date: new Date() });
    console.log("Inserted document ID:", result.insertedId);

    const docs = await db.collection('test').find().toArray();
    console.log("Current docs:", docs);
  } finally {
    await client.close();
  }
}

run().catch(console.error);
