// Auth0 utility functions for Management API
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || `https://${AUTH0_DOMAIN}/api/v2/`;

async function getManagementToken() {
  const url = `https://${AUTH0_DOMAIN}/oauth/token`;
  const body = {
    grant_type: 'client_credentials',
    client_id: AUTH0_CLIENT_ID,
    client_secret: AUTH0_CLIENT_SECRET,
    audience: AUTH0_AUDIENCE
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Failed to get Auth0 token');
  const data = await res.json();
  return data.access_token;
}

export async function listAuth0Users() {
  const token = await getManagementToken();
  const url = `https://${AUTH0_DOMAIN}/api/v2/users`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return await res.json();
}

// Add more utility functions as needed
