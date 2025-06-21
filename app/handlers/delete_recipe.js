// File: delete_recipe.js
const { getDbClient } = require('../db');

exports.handler = async (event) => {
    const recipeId = event.pathParameters?.id || event.queryStringParameters?.id;

    if (!recipeId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing recipe ID' }),
        };
    }

    const client = await getDbClient();

    try {
        await client.query('BEGIN');

        // Optional: delete related comments and likes if you want cascading cleanup
        await client.query('DELETE FROM comments WHERE recipe_id = $1', [recipeId]);
        await client.query('DELETE FROM likes WHERE recipe_id = $1', [recipeId]);
        await client.query('DELETE FROM recipe_sections WHERE recipe_id = $1', [recipeId]);
        await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);

        const res = await client.query('DELETE FROM recipes WHERE id = $1 RETURNING id', [recipeId]);

        if (res.rowCount === 0) {
            await client.query('ROLLBACK');
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Recipe not found' }),
            };
        }

        await client.query('COMMIT');
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Recipe deleted', recipe_id: recipeId }),
        };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting recipe:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error', error: err.message }),
        };
    } finally {
        await client.end();
    }
};
