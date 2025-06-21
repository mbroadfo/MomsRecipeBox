const { getDbClient } = require('../db');

exports.handler = async (event) => {
    const client = await getDbClient();

    const recipeId = event.pathParameters?.id;
    if (!recipeId || isNaN(recipeId)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid or missing recipe ID' }),
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid JSON format' }),
        };
    }

    const {
        visibility,
        status,
        title,
        subtitle,
        description,
        image_url,
        tags = [],
        sections = [],
        ingredients = [],
    } = body;

    try {
        await client.query('BEGIN');

        await client.query(`
            UPDATE recipes
            SET visibility = $1, status = $2, title = $3, subtitle = $4,
                description = $5, image_url = $6, tags = $7
            WHERE id = $8
        `, [visibility, status, title, subtitle, description, image_url, tags, recipeId]);

        await client.query('DELETE FROM recipe_sections WHERE recipe_id = $1', [recipeId]);
        for (const section of sections) {
            const { section_type, content, position } = section;
            await client.query(`
                INSERT INTO recipe_sections (recipe_id, section_type, content, position)
                VALUES ($1, $2, $3, $4)
            `, [recipeId, section_type, content, position]);
        }

        await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
        for (const ingredient of ingredients) {
            const { name, quantity, position } = ingredient;
            await client.query(`
                INSERT INTO recipe_ingredients (recipe_id, name, quantity, position)
                VALUES ($1, $2, $3, $4)
            `, [recipeId, name, quantity, position]);
        }

        await client.query('COMMIT');

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Recipe updated', recipe_id: recipeId }),
        };
    } catch (err) {
        await client.query('ROLLBACK');
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error', error: err.message }),
        };
    } finally {
        await client.end();
    }
};
