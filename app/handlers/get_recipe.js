const { getDbClient } = require('../db');

exports.handler = async (event) => {
    const client = await getDbClient();

    const params = event.queryStringParameters || {};

    const limit = parseInt(params.limit, 10) || 20;
    const offset = parseInt(params.offset, 10) || 0;
    const owner_id = params.owner_id || null;
    const visibility = params.visibility || null;
    const tags = params.tags ? params.tags.split(',').map(tag => tag.trim()) : null;

    console.log('List recipes with params:', { limit, offset, owner_id, visibility, tags });

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

        const values = [owner_id, visibility, tags, limit, offset];

        const res = await client.query(query, values);

        return {
            statusCode: 200,
            body: JSON.stringify({
                recipes: res.rows,
                pagination: {
                    limit,
                    offset,
                    count: res.rowCount, // total *returned* count (not full count — could add that if needed)
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
