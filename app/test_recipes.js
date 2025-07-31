require('dotenv').config();
const { connectToDatabase } = require('./mongoClient');

async function main() {
  const { client, db } = await connectToDatabase();

  // Clean up old recipes for testing
  await db.collection('recipes').deleteMany({});

  // Add test recipe
  const result = await db.collection('recipes').insertOne({
    title: 'Chocolate Cake',
    description: 'Rich and moist chocolate cake',
    ingredients: ['flour', 'cocoa powder', 'eggs', 'sugar', 'butter']
  });
  console.log(`🍰 Added recipe with ID: ${result.insertedId}`);

  // List all recipes
  const recipes = await db.collection('recipes').find({}).toArray();
  console.log("📜 All recipes:", recipes);

  // Only close when running locally
  if (process.env.NODE_ENV !== 'lambda') {
    await client.close();
    console.log("🔌 MongoDB connection closed");
  }
}

main().catch(console.error);
