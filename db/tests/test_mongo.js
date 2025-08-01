import { getDb } from '../../app/app.js';

async function run() {
  try {
    console.log("Connecting to MongoDB via getDb()...");
    const db = await getDb();
    await db.command({ ping: 1 });
    console.log("✅ Successfully connected to MongoDB!");
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
  }
}

run();
