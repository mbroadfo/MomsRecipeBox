// File: delete_comment.js
const { getDbClient } = require('../db');

exports.handler = async (event) => {
    const commentId = event.pathParameters?.comment_id;

    if (!commentId || isNaN(commentId)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid or missing comment_id' }),
        };
    }

    const client = await getDbClient();

    try {
        const deleteQuery = `
            DELETE FROM comments
            WHERE id = $1
        `;

        const result = await client.query(deleteQuery, [commentId]);

        if (result.rowCount === 0) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Comment not found' }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Comment deleted successfully' }),
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
