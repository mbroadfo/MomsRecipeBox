const { Client } = require('pg');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5432,
};

module.exports = async (event) => {
    const client = new Client(dbConfig);

    try {
        await client.connect();

        const result = await client.query(`
            SELECT id, title, description, visibility
            FROM recipes
            ORDER BY created_at DESC
            LIMIT 20
        `);

        await client.end();

        return {
            statusCode: 200,
            body: JSON.stringify(result.rows),
        };
    } catch (err) {
        console.error('Database error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' }),
        };
    }
};
