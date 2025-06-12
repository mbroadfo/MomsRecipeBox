const { Pool } = require('pg');
const pool = new Pool();

exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.claims?.sub || 'unknown';
  const body = JSON.parse(event.body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const recipeRes = await client.query(`
      INSERT INTO recipes (owner_id, visibility, status, title, subtitle, description, image_url, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      userId,
      body.visibility,
      body.status,
      body.title,
      body.subtitle,
      body.description,
      body.image_url,
      body.tags
    ]);

    const recipeId = recipeRes.rows[0].id;

    for (const section of body.sections || []) {
      await client.query(`
        INSERT INTO recipe_sections (recipe_id, section_type, content, position)
        VALUES ($1, $2, $3, $4)
      `, [recipeId, section.section_type, section.content, section.position]);
    }

    for (const ingredient of body.ingredients || []) {
      await client.query(`
        INSERT INTO recipe_ingredients (recipe_id, name, quantity, position)
        VALUES ($1, $2, $3, $4)
      `, [recipeId, ingredient.name, ingredient.quantity, ingredient.position]);
    }

    await client.query('COMMIT');

    return {
      statusCode: 201,
      body: JSON.stringify({ message: 'Recipe created', recipe_id: recipeId })
    };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating recipe:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  } finally {
    client.release();
  }
};
