const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
  user: String(process.env.POSTGRES_USER),
  password: String(process.env.POSTGRES_PASSWORD),
  host: String(process.env.PGHOST || 'localhost'),
  port: Number(process.env.PGPORT || 5432),
  database: String(process.env.POSTGRES_NAME),
});

async function loadRecipes() {
  try {
    await client.connect();

    const files = fs.readdirSync('./db/recipes');
    for (const file of files) {
      const content = fs.readFileSync(path.join('./db/recipes', file), 'utf-8');
      const recipe = JSON.parse(content);

      await client.query(
        'INSERT INTO recipes (title, ingredients, steps, notes) VALUES ($1, $2, $3, $4)',
        [recipe.title, recipe.ingredients, recipe.steps, recipe.notes]
      );
    }

    console.log("✅ Recipes seeded successfully.");
  } catch (err) {
    console.error("❌ Failed to load recipes:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

loadRecipes();
