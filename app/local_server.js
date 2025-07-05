const path = require('path');
require('dotenv').config({ path: '.env.ps1' });
const express = require('express');
const serverless = require('serverless-http');
const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const swaggerDocument = yaml.load(path.join(__dirname, 'docs', 'swagger.yaml'));
const app = express();

const cors = require('cors');

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

app.use(cors(corsOptions));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

let createRecipe, listRecipes, getRecipe, updateRecipe, deleteRecipe;
let postComment, updateComment, deleteComment, postLike;

try {
  ({ handler: createRecipe } = require('./handlers/create_recipe'));
  ({ handler: listRecipes } = require('./handlers/list_recipes'));
  ({ handler: getRecipe } = require('./handlers/get_recipe'));
  ({ handler: updateRecipe } = require('./handlers/update_recipe'));
  ({ handler: deleteRecipe } = require('./handlers/delete_recipe'));
  ({ handler: postComment } = require('./handlers/post_comment'));
  ({ handler: updateComment } = require('./handlers/update_comment'));
  ({ handler: deleteComment } = require('./handlers/delete_comment'));
  ({ handler: postLike } = require('./handlers/post_like'));
} catch (err) {
  console.error("❌ Error loading handler:", err);
  process.exit(1);
}

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
  const response = await listRecipes({
    httpMethod: 'GET',
    path: '/recipes',
    queryStringParameters: req.query,
  });
  res.status(response.statusCode).json(JSON.parse(response.body));
});

app.get('/recipe', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing recipe id' });

  const response = await getRecipe({
    httpMethod: 'GET',
    path: '/recipe',
    queryStringParameters: req.query,
    pathParameters: { id },
  });
  res.status(response.statusCode).json(JSON.parse(response.body));
});

app.put('/recipe', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing recipe id' });

  const response = await updateRecipe({
    httpMethod: 'PUT',
    path: '/recipe',
    queryStringParameters: req.query,
    pathParameters: { id },
    body: JSON.stringify(req.body),
  });
  res.status(response.statusCode).json(JSON.parse(response.body));
});

app.delete('/recipe', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing recipe id' });

  const response = await deleteRecipe({
    httpMethod: 'DELETE',
    path: '/recipe',
    queryStringParameters: req.query,
    pathParameters: { id },
  });
  res.status(response.statusCode).json(JSON.parse(response.body));
});

app.post('/recipe/comment', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing recipe id' });

  const response = await postComment({
    httpMethod: 'POST',
    path: '/recipe/comment',
    queryStringParameters: req.query,
    pathParameters: { id },
    body: JSON.stringify(req.body),
  });
  res.status(response.statusCode).json(JSON.parse(response.body));
});

app.put('/recipe/comment', async (req, res) => {
  const { comment_id } = req.query;
  if (!comment_id) return res.status(400).json({ message: 'Missing comment_id' });

  const response = await updateComment({
    httpMethod: 'PUT',
    path: '/recipe/comment',
    queryStringParameters: req.query,
    pathParameters: { comment_id },
    body: JSON.stringify(req.body),
  });
  res.status(response.statusCode).json(JSON.parse(response.body));
});

app.delete('/recipe/comment', async (req, res) => {
  const { comment_id } = req.query;
  if (!comment_id) return res.status(400).json({ message: 'Missing comment_id' });

  const response = await deleteComment({
    httpMethod: 'DELETE',
    path: '/recipe/comment',
    queryStringParameters: req.query,
    pathParameters: { comment_id },
  });
  res.status(response.statusCode).json(JSON.parse(response.body));
});

app.post('/recipe/like', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Missing recipe id' });

  const response = await postLike({
    httpMethod: 'POST',
    path: '/recipe/like',
    queryStringParameters: req.query,
    pathParameters: { id },
    body: JSON.stringify(req.body),
  });
  res.status(response.statusCode).json(JSON.parse(response.body));
});

const PORT = 3000;

if (app._router && Array.isArray(app._router.stack)) {
  app._router.stack.forEach(layer => {
    const route = layer.route;
    if (route && Array.isArray(route.stack)) {
      route.stack.forEach(routeLayer => {
        const method = routeLayer?.method?.toUpperCase?.();
        if (method && route.path) {
          console.log('Registered route:', method, route.path);
        }
      });
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Local server running at http://localhost:${PORT}`);
});

//module.exports.handler = serverless(app);
