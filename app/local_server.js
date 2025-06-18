require('dotenv').config({ path: '.env.ps1' });
const express = require('express');
const app = express();

const { handler: createRecipe } = require('./handlers/create_recipe');
const { handler: listRecipes } = require('./handlers/list_recipes');

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
  const response = await listRecipes({
    httpMethod: 'GET',
    path: '/recipes',
    queryStringParameters: req.query,
  });
  res.status(response.statusCode).json(JSON.parse(response.body));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Local server running at http://localhost:${PORT}`);
});
