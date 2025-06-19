require('dotenv').config({ path: '.env.ps1' });
const express = require('express');
const app = express();

const { handler: createRecipe } = require('./app/handlers/create_recipe');
const { handler: listRecipes } = require('./app/handlers/list_recipes');

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

app.use(express.json());

app.post('/recipes', async (req, res) => {
  const response = await createRecipe({
    httpMethod: 'POST',
    path: '/recipes',
    body: JSON.stringify(req.body),
  });
  res.status(response.statusCode).json(JSON.parse(response.body));
});

app.get('/recipes', async (req, res) => {
  console.log('GET /recipes invoked with query:', req.query);
  try {
    const response = await listRecipes({
      httpMethod: 'GET',
      path: '/recipes',
      queryStringParameters: req.query,
    });
    console.log('GET /recipes response:', response);
    res.status(response.statusCode).json(JSON.parse(response.body));
  } catch (err) {
    console.error('Error handling GET /recipes:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Local server running at http://localhost:${PORT}`);
});
