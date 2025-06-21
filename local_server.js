require('dotenv').config({ path: '.env.ps1' });
const express = require('express');
const app = express();

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./docs/swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const { handler: createRecipe } = require('./app/handlers/create_recipe');
const { handler: listRecipes } = require('./app/handlers/list_recipes');
const { handler: getRecipe } = require('./app/handlers/get_recipe');
const { handler: updateRecipe } = require('./app/handlers/update_recipe');
const { handler: deleteRecipe } = require('./app/handlers/delete_recipe');
const { handler: postComment } = require('./app/handlers/post_comment');
const { handler: updateComment } = require('./app/handlers/update_comment');
const { handler: deleteComment } = require('./app/handlers/delete_comment');
const { handler: postLike } = require('./app/handlers/post_like');

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
  try {
    const response = await listRecipes({
      httpMethod: 'GET',
      path: '/recipes',
      queryStringParameters: req.query,
    });
    res.status(response.statusCode).json(JSON.parse(response.body));
  } catch (err) {
    console.error('Error handling GET /recipes:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/recipe', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing recipe id' });

  try {
    const response = await getRecipe({
      httpMethod: 'GET',
      path: '/recipe',
      queryStringParameters: req.query,
      pathParameters: { id },
    });
    res.status(response.statusCode).json(JSON.parse(response.body));
  } catch (err) {
    console.error('Error handling GET /recipe:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/recipe', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing recipe id' });

  try {
    const response = await updateRecipe({
      httpMethod: 'PUT',
      path: '/recipe',
      queryStringParameters: req.query,
      pathParameters: { id },
      body: JSON.stringify(req.body),
    });
    res.status(response.statusCode).json(JSON.parse(response.body));
  } catch (err) {
    console.error('Error handling PUT /recipe:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/recipe', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing recipe id' });

  try {
    const response = await deleteRecipe({
      httpMethod: 'DELETE',
      path: '/recipe',
      queryStringParameters: req.query,
      pathParameters: { id },
    });
    res.status(response.statusCode).json(JSON.parse(response.body));
  } catch (err) {
    console.error('Error handling DELETE /recipe:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/recipe/comment', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing recipe id' });

  try {
    const response = await postComment({
      httpMethod: 'POST',
      path: '/recipe/comment',
      queryStringParameters: req.query,
      pathParameters: { id },
      body: JSON.stringify(req.body),
    });
    res.status(response.statusCode).json(JSON.parse(response.body));
  } catch (err) {
    console.error('Error handling POST /recipe/comment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/recipe/comment', async (req, res) => {
  const { comment_id } = req.query;
  if (!comment_id) return res.status(400).json({ message: 'Missing comment_id' });

  try {
    const response = await updateComment({
      httpMethod: 'PUT',
      path: '/recipe/comment',
      queryStringParameters: req.query,
      pathParameters: { comment_id },
      body: JSON.stringify(req.body),
    });
    res.status(response.statusCode).json(JSON.parse(response.body));
  } catch (err) {
    console.error('Error handling PUT /recipe/comment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/recipe/comment', async (req, res) => {
  const { comment_id } = req.query;
  if (!comment_id) return res.status(400).json({ message: 'Missing comment_id' });

  try {
    const response = await deleteComment({
      httpMethod: 'DELETE',
      path: '/recipe/comment',
      queryStringParameters: req.query,
      pathParameters: { comment_id },
    });
    res.status(response.statusCode).json(JSON.parse(response.body));
  } catch (err) {
    console.error('Error handling DELETE /recipe/comment:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/recipe/like', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing recipe id' });

  try {
    const response = await postLike({
      httpMethod: 'POST',
      path: '/recipe/like',
      queryStringParameters: req.query,
      pathParameters: { id },
      body: JSON.stringify(req.body),
    });
    res.status(response.statusCode).json(JSON.parse(response.body));
  } catch (err) {
    console.error('Error handling POST /recipe/like:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const PORT = 3000;
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Local server running at http://localhost:${PORT}`);
});
