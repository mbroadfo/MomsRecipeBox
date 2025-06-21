const { Pool } = require('pg');

function getDbClient() {
  return new Pool({
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_NAME,
  });
}

module.exports = { getDbClient };