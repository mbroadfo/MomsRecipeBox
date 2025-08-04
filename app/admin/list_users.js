// Express route to list users with Auth0 JWT authentication
import express from 'express';
import { listAuth0Users } from './auth0_utils.js';
import { verifyJwt } from './auth0_middleware.js';

const app = express();

app.get('/admin/list-users', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
  const token = authHeader.split(' ')[1];
  try {
    const user = await verifyJwt(token);
    // Optionally check user roles/permissions here
    const users = await listAuth0Users();
    res.json({ users });
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized', details: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Admin API listening on port ${PORT}`);
});
