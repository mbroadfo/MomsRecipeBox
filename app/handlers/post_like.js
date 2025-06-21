const { getDbClient } = require('../db');

exports.handler = async (event) => {
    const recipeId = event.pathParameters?.id;
    let userId;

    try {
        const body = JSON.parse(event.body);
        userId = body.user_id;
    } catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    if (!recipeId || isNaN(recipeId) || !userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing or invalid recipe_id or user_id' }),
        };
    }

    const client = await getDbClient();

    try {
        const existsQuery = `
            SELECT 1 FROM likes WHERE recipe_id = $1 AND user_id = $2
        `;
        const existsRes = await client.query(existsQuery, [recipeId, userId]);

        let status;

        if (existsRes.rowCount > 0) {
            await client.query(
                `DELETE FROM likes WHERE recipe_id = $1 AND user_id = $2`,
                [recipeId, userId]
            );
            status = 'unliked';
        } else {
            await client.query(
                `INSERT INTO likes (recipe_id, user_id) VALUES ($1, $2)`,
                [recipeId, userId]
            );
            status = 'liked';
        }

        const countRes = await client.query(
            `SELECT COUNT(*) AS count FROM likes WHERE recipe_id = $1`,
            [recipeId]
        );

        const likeCount = parseInt(countRes.rows[0].count, 10);

        return {
            statusCode: 200,
            body: JSON.stringify({ status, like_count: likeCount }),
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
