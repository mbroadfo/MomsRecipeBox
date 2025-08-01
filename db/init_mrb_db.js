import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;
const recipesDir = path.resolve("./recipes");

async function seedDatabase() {
  console.log("⚡ Connecting to MongoDB...");
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`📦 Connected to database: ${dbName}`);

    // Ensure admin user exists
    const usersCollection = db.collection("users");
    const existingAdmin = await usersCollection.findOne({ username: "admin" });
    if (!existingAdmin) {
      await usersCollection.insertOne({
        username: "admin",
        password: "changeme", // TODO: hash in production
        role: "admin",
        created_at: new Date(),
      });
      console.log("👤 Created admin user");
    } else {
      console.log("👤 Admin user already exists");
    }

    // Load and insert recipes from JSON files
    const recipesCollection = db.collection("recipes");
    const files = fs.readdirSync(recipesDir).filter(f => f.endsWith(".json"));

    for (const file of files) {
      const filePath = path.join(recipesDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      data.created_at = new Date();
      data.updated_at = new Date();

      await recipesCollection.insertOne(data);
      console.log(`🍰 Added recipe from file: ${file}`);
    }

    console.log("✅ Database initialized successfully!");
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  } finally {
    await client.close();
  }
}

seedDatabase();
