// create_recipe.js – container-safe version
const { getDbClient } = require('../db');

exports.handler = async (event) => {
    console.log('Received event body:', event.body);

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (err) {
        console.error('Invalid JSON input:', err);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid JSON format' }),
        };
    }

    const {
        owner_id,
        visibility,
        status = 'draft',
        title,
        subtitle,
        description,
        image_url,
        tags: rawTags,
        sections: rawSections,
        ingredients: rawIngredients,
    } = body;

    const tags = Array.isArray(rawTags) ? rawTags : [];
    const sections = Array.isArray(rawSections) ? rawSections : [];
    const ingredients = Array.isArray(rawIngredients) ? rawIngredients : [];

    if (!owner_id || !visibility || !title) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing required fields: owner_id, visibility, title' }),
        };
    }

    console.log(`Parsed ${sections.length} sections and ${ingredients.length} ingredients`);

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
        console.log(`Created recipe ID: ${recipe_id}`);

        const insertSectionQuery = `
            INSERT INTO recipe_sections (recipe_id, section_type, content, position)
            VALUES ($1, $2, $3, $4)
        `;

        for (const section of sections) {
            console.log('Inserting section:', section);
            const { section_type, content, position } = section;
            await client.query(insertSectionQuery, [recipe_id, section_type, content, position]);
        }

        const insertIngredientQuery = `
            INSERT INTO recipe_ingredients (recipe_id, name, quantity, position)
            VALUES ($1, $2, $3, $4)
        `;

        for (const ingredient of ingredients) {
            console.log('Inserting ingredient:', ingredient);
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
};
