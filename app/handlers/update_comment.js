// File: update_comment.js
const { getDbClient } = require('../db');

exports.handler = async (event) => {
    const commentId = event.pathParameters?.comment_id;
    let body;

    try {
        body = JSON.parse(event.body);
    } catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid JSON format' }),
        };
    }

    const { content } = body;

    if (!commentId || isNaN(commentId) || !content) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Missing or invalid fields: comment_id, content' }),
        };
    }

    const client = await getDbClient();

    try {
        const updateQuery = `
            UPDATE comments
            SET content = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, recipe_id, author_id, content, updated_at
        `;

        const result = await client.query(updateQuery, [content, commentId]);

        if (result.rowCount === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Comment not found' }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Comment updated',
                comment: result.rows[0],
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
