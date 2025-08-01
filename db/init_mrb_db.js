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

    // Ensure admin user exists using .env values
    const usersCollection = db.collection("users");
    const adminUser = process.env.MONGODB_ADMIN_USER;
    const adminPassword = process.env.MONGODB_ADMIN_PASSWORD; // TODO: hash in production
    if (!adminUser || !adminPassword) {
      throw new Error("Missing MONGODB_ADMIN_USER or MONGODB_ADMIN_PASSWORD in .env");
    }
    const existingAdmin = await usersCollection.findOne({ username: adminUser });
    if (!existingAdmin) {
      await usersCollection.insertOne({
        username: adminUser,
        password: adminPassword, // TODO: hash in production
        role: "admin",
        created_at: new Date(),
      });
      console.log(`👤 Created admin user: ${adminUser}`);
    } else {
      console.log(`👤 Admin user '${adminUser}' already exists`);
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
