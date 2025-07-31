// app/db.js
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let dbInstance;

async function connectToDB() {
  if (!dbInstance) {
    await client.connect();
    dbInstance = client.db(process.env.MONGODB_DB_NAME);
    console.log("📦 Connected to MongoDB database:", process.env.MONGODB_DB_NAME);
  }
  return dbInstance;
}

module.exports = { connectToDB, client };
