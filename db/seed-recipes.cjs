const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.POSTGRES_NAME,
});

async function loadRecipes() {
  try {
    await client.connect();

    const dir = path.join(__dirname, 'recipes');
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const recipe = JSON.parse(content);

      const {
        title,
        subtitle = '',
        description = '',
        image_url = '',
        tags = [],
        ingredients = [],
        steps = [],
        notes = ''
      } = recipe;

      // Insert recipe
      const res = await client.query(
        `INSERT INTO recipes (owner_id, visibility, status, title, subtitle, description, image_url, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        ['auth0|seed-user', 'public', 'published', title, subtitle, description, image_url, tags]
      );
      const recipe_id = res.rows[0].id;

      // Insert ingredients
      for (let i = 0; i < ingredients.length; i++) {
        const { name, quantity } = ingredients[i];
        const position = ingredients[i].position ?? i + 1;
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, name, quantity, position)
           VALUES ($1, $2, $3, $4)`,
          [recipe_id, name, quantity, position || i + 1]
        );
      }

      // Insert steps as instructions
      for (let i = 0; i < steps.length; i++) {
        await client.query(
          `INSERT INTO recipe_sections (recipe_id, section_type, content, position)
           VALUES ($1, $2, $3, $4)`,
          [recipe_id, 'Instructions', steps[i], i + 1]
        );
      }

      // Add notes if present
      if (notes) {
        await client.query(
          `INSERT INTO recipe_sections (recipe_id, section_type, content, position)
           VALUES ($1, $2, $3, $4)`,
          [recipe_id, 'Notes', notes, steps.length + 1]
        );
      }

      console.log(`✅ Seeded: ${title}`);
    }

    console.log("✅ All recipes seeded successfully.");
  } catch (err) {
    console.error("❌ Failed to load recipes:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

loadRecipes();
