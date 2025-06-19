const { getDbClient } = require('../db');

exports.handler = async (event) => {
    console.log('listRecipes handler invoked with event:', event);
    const client = await getDbClient();
    const params = event.queryStringParameters || {};

    const limit = parseInt(params.limit) || 20;
    const offset = parseInt(params.offset) || 0;
    const owner_id = params.owner_id || null;
    const visibility = params.visibility || null;
    const tags = params.tags ? params.tags.split(',') : null;

    console.log('Query params:', { owner_id, visibility, tags, limit, offset });

    try {
        const query = `
            SELECT id, owner_id, visibility, status, title, subtitle, description, image_url, tags, created_at
            FROM recipes
            WHERE
                ($1::text IS NULL OR owner_id = $1)
                AND ($2::text IS NULL OR visibility = $2)
                AND ($3::text[] IS NULL OR tags && $3::text[])
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5;
        `;

        const res = await client.query(query, [owner_id, visibility, tags, limit, offset]);
        console.log('Query returned:', res.rowCount, 'rows');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                recipes: res.rows,
                pagination: {
                    limit,
                    offset,
                    count: res.rowCount,
                },
            }),
        };
    } catch (err) {
        console.error('Error listing recipes:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error', error: err.message }),
        };
    } finally {
        await client.end();
    }
};
