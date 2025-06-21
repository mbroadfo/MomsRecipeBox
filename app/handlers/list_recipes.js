const { getDbClient } = require('../db');

exports.handler = async (event) => {
    const client = await getDbClient();

    const params = event.queryStringParameters || {};

    const limit = parseInt(params.limit, 10) || 20;
    const offset = parseInt(params.offset, 10) || 0;
    const owner_id = params.owner_id || null;
    const visibility = params.visibility || null;
    const tags = params.tags ? params.tags.split(',').map(tag => tag.trim()) : null;
    const expandRaw = params.expand;
    const expandFull = typeof expandRaw === 'string' && expandRaw.toLowerCase() === 'full';

    try {
        const baseQuery = `
            SELECT id, owner_id, visibility, status, title, subtitle, description, image_url, tags, created_at
            FROM recipes
            WHERE
                ($1::text IS NULL OR owner_id = $1)
                AND ($2::text IS NULL OR visibility = $2)
                AND ($3::text[] IS NULL OR tags && $3::text[])
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5;
        `;

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM recipes
            WHERE
                ($1::text IS NULL OR owner_id = $1)
                AND ($2::text IS NULL OR visibility = $2)
                AND ($3::text[] IS NULL OR tags && $3::text[]);
        `;

        const values = [owner_id, visibility, tags, limit, offset];
        const countValues = [owner_id, visibility, tags];

        const [res, countRes] = await Promise.all([
            client.query(baseQuery, values),
            client.query(countQuery, countValues)
        ]);

        const recipes = res.rows;
        const totalCount = parseInt(countRes.rows[0].total, 10);

        if (recipes.length === 0) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    recipes: [],
                    pagination: {
                        limit,
                        offset,
                        count: 0,
                        total: totalCount
                    },
                }),
            };
        }

        if (expandFull) {
            const recipeIds = recipes.map(r => r.id);

            const sectionsQuery = `
                SELECT recipe_id, section_type, content, position
                FROM recipe_sections
                WHERE recipe_id = ANY($1)
                ORDER BY recipe_id, position;
            `;
            const sectionsRes = await client.query(sectionsQuery, [recipeIds]);

            const ingredientsQuery = `
                SELECT recipe_id, name, quantity, position
                FROM recipe_ingredients
                WHERE recipe_id = ANY($1)
                ORDER BY recipe_id, position;
            `;
            const ingredientsRes = await client.query(ingredientsQuery, [recipeIds]);

            const sectionsByRecipe = {};
            for (const section of sectionsRes.rows) {
                if (!sectionsByRecipe[section.recipe_id]) sectionsByRecipe[section.recipe_id] = [];
                sectionsByRecipe[section.recipe_id].push(section);
            }

            const ingredientsByRecipe = {};
            for (const ingredient of ingredientsRes.rows) {
                if (!ingredientsByRecipe[ingredient.recipe_id]) ingredientsByRecipe[ingredient.recipe_id] = [];
                ingredientsByRecipe[ingredient.recipe_id].push(ingredient);
            }

            for (const recipe of recipes) {
                recipe.sections = sectionsByRecipe[recipe.id] || [];
                recipe.ingredients = ingredientsByRecipe[recipe.id] || [];
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                recipes,
                pagination: {
                    limit,
                    offset,
                    count: recipes.length,
                    total: totalCount
                },
            }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error', error: err.message }),
        };
    } finally {
        await client.end();
    }
};
