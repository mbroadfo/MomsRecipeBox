const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

exports.seedRecipes = async (config) => {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port || 3306,
    user: config.user,
    password: config.password,
    database: config.database,
    multipleStatements: true,
  });

  const recipesDir = path.join(__dirname, 'db', 'recipes');
  const files = fs.readdirSync(recipesDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(recipesDir, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    let recipe;

    try {
      recipe = JSON.parse(raw);
    } catch (err) {
      console.error(`❌ Failed to parse ${file}:`, err.message);
      continue;
    }

    const {
      owner_id = 'system',
      visibility = 'public',
      status = 'published',
      title,
      subtitle = null,
      description = null,
      image_url = null,
      tags = [],
      ingredients = [],
      instructions = [],
      sections = [],
    } = recipe;

    if (!title) {
      console.warn(`⚠️ Skipping ${file}: missing title`);
      continue;
    }

    try {
      await connection.beginTransaction();

      const [recipeResult] = await connection.execute(
        `INSERT INTO recipes (owner_id, visibility, status, title, subtitle, description, image_url, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [owner_id, visibility, status, title, subtitle, description, image_url, JSON.stringify(tags)]
      );
      const recipeId = recipeResult.insertId;

      for (let i = 0; i < ingredients.length; i++) {
        const { name, quantity = null } = ingredients[i];
        if (!name) continue;
        await connection.execute(
          `INSERT INTO recipe_ingredients (recipe_id, name, quantity, position)
           VALUES (?, ?, ?, ?)`,
          [recipeId, name, quantity, i + 1]
        );
      }

      for (let i = 0; i < instructions.length; i++) {
        await connection.execute(
          `INSERT INTO recipe_sections (recipe_id, section_type, content, position)
           VALUES (?, 'Instructions', ?, ?)`,
          [recipeId, instructions[i], i + 1]
        );
      }

      for (const section of sections) {
        const { section_type, content, position } = section;
        if (!section_type || !content || typeof position !== 'number') continue;
        await connection.execute(
          `INSERT INTO recipe_sections (recipe_id, section_type, content, position)
           VALUES (?, ?, ?, ?)`,
          [recipeId, section_type, content, position]
        );
      }

      await connection.commit();
      console.log(`✓ Seeded recipe: ${title}`);
    } catch (err) {
      await connection.rollback();
      console.error(`❌ Error seeding ${file}:`, err.message);
    }
  }

  await connection.end();
};
