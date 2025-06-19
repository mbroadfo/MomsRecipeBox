// Updated create_recipe.js using db.js
const { getDbClient } = require('../db');

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);

        const {
            owner_id,
            visibility,
            status = 'draft',
            title,
            subtitle,
            description,
            image_url,
            tags = [],
            sections = [],
            ingredients = [],
        } = body;

        if (!owner_id || !visibility || !title) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing required fields: owner_id, visibility, title' }),
            };
        }

        const client = await getDbClient();

        try {
            await client.query('BEGIN');

            const insertRecipeQuery = `
                INSERT INTO recipes (owner_id, visibility, status, title, subtitle, description, image_url, tags)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, created_at
            `;

            const recipeResult = await client.query(insertRecipeQuery, [
                owner_id,
                visibility,
                status,
                title,
                subtitle,
                description,
                image_url,
                tags,
            ]);

            const recipe_id = recipeResult.rows[0].id;

            const insertSectionQuery = `
                INSERT INTO recipe_sections (recipe_id, section_type, content, position)
                VALUES ($1, $2, $3, $4)
            `;

            for (const section of sections) {
                const { section_type, content, position } = section;
                await client.query(insertSectionQuery, [recipe_id, section_type, content, position]);
            }

            const insertIngredientQuery = `
                INSERT INTO recipe_ingredients (recipe_id, name, quantity, position)
                VALUES ($1, $2, $3, $4)
            `;

            for (const ingredient of ingredients) {
                const { name, quantity, position } = ingredient;
                await client.query(insertIngredientQuery, [recipe_id, name, quantity, position]);
            }

            await client.query('COMMIT');

            return {
                statusCode: 201,
                body: JSON.stringify({ message: 'Recipe created', recipe_id }),
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Transaction error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: 'Internal server error', error: error.message }),
            };
        } finally {
            await client.end();
        }
    } catch (err) {
        console.error('Handler error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error', error: err.message }),
        };
    }
};
