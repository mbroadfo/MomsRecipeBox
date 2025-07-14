const mysql = require('mysql2/promise');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const readSQL = (fileName) => fs.readFileSync(path.join(__dirname, fileName), 'utf8');

exports.handler = async (event) => {
  // Small Delay before Invocation
  await new Promise(r => setTimeout(r, 500));
}

exports.handler = async () => {
  console.log('DB_HOST:', process.env.DB_HOST);
  const dns = require('dns');
  dns.lookup(process.env.DB_HOST, (err, address) => {
    if (err) console.error('DNS lookup failed:', err);
    else console.log(`Resolved ${process.env.DB_HOST} to ${address}`);
  });

  const secretsManager = new AWS.SecretsManager();
  const secret = await secretsManager.getSecretValue({ SecretId: 'moms-recipe-box-secrets' }).promise();
  const creds = JSON.parse(secret.SecretString);
  console.log('Available credential keys:', Object.keys(creds));

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: creds.db_username,
    password: creds.db_password,
    database: creds.db_name,
    multipleStatements: true,
  });

  try {
    console.log('Connected to database');

    // Rebuild schema
    await connection.query(readSQL('init.sql'));
    console.log('Schema initialized');

    // Health check one recipe
    const [rows] = await connection.query(readSQL('test_creamy_mushroom_soup.sql'));
    if (!rows || rows.length === 0) throw new Error('Health check failed');
    console.log('Health check passed');

    // Seed recipes w/ defaults for missing fields
    const { seedRecipes } = require('./seed-recipes.cjs');
    await seedRecipes({
      host: process.env.DB_HOST,
      port: 3306,
      user: creds.db_username,
      password: creds.db_password,
      database: creds.db_name,
    });
    console.log('Recipes seeded');

    // Check status
    return { status: 'OK' };
  } catch (err) {
    console.error('Error during DB initialization', err);
    throw err;
  } finally {
    await connection.end();
    console.log('Disconnected from database');
  }
};
