// File: get_recipe.js
const { getDbClient } = require('../db');

exports.handler = async (event) => {
    const recipeId = event.pathParameters?.id;
    const expand = (event.queryStringParameters?.expand || '').toLowerCase() === 'full';

    if (!recipeId || isNaN(recipeId)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid or missing recipe ID' }),
        };
    }

    const client = await getDbClient();

    try {
        const recipeRes = await client.query(`
            SELECT id, owner_id, visibility, status, title, subtitle, description, image_url, tags, created_at
            FROM recipes
            WHERE id = $1
        `, [recipeId]);

        if (recipeRes.rows.length === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Recipe not found' }),
            };
        }

        const recipe = recipeRes.rows[0];

        if (expand) {
            const [sectionsRes, ingredientsRes] = await Promise.all([
                client.query(`
                    SELECT section_type, content, position
                    FROM recipe_sections
                    WHERE recipe_id = $1
                    ORDER BY position
                `, [recipeId]),
                client.query(`
                    SELECT name, quantity, position
                    FROM recipe_ingredients
                    WHERE recipe_id = $1
                    ORDER BY position
                `, [recipeId])
            ]);

            recipe.sections = sectionsRes.rows;
            recipe.ingredients = ingredientsRes.rows;
        }

        return {
            statusCode: 200,
            body: JSON.stringify(recipe),
        };
    } catch (err) {
        console.error('Error fetching recipe:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error', error: err.message }),
        };
    } finally {
        await client.end();
    }
};
