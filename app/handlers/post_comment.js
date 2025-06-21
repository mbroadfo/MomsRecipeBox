// File: post_comment.js
const { getDbClient } = require('../db');

exports.handler = async (event) => {
    const recipeId = event.pathParameters?.id;
    let body;

    try {
        body = JSON.parse(event.body);
    } catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid JSON format' }),
        };
    }

    const { author_id, content } = body;

    if (!recipeId || isNaN(recipeId) || !author_id || !content) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing or invalid fields: recipeId, author_id, content' }),
        };
    }

    const client = await getDbClient();

    try {
        const insertCommentQuery = `
            INSERT INTO comments (recipe_id, author_id, content)
            VALUES ($1, $2, $3)
            RETURNING id, created_at
        `;

        const result = await client.query(insertCommentQuery, [recipeId, author_id, content]);

        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Comment added',
                comment_id: result.rows[0].id,
                created_at: result.rows[0].created_at,
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
