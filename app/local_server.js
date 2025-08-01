// File: app/local_server.js
import { handler } from './lambda.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const PORT = process.env.PORT || 3000;

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));


const server = http.createServer(async (req, res) => {
  // Serve Swagger YAML
  if (req.url === '/api-docs/swagger.yaml') {
    const filePath = path.join(__dirname, 'docs', 'swagger.yaml');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': 'application/x-yaml' });
        res.end(data);
      }
    });
    return;
  }

  // Serve Swagger UI at /api-docs
  if (req.url === '/api-docs') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Swagger UI</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              url: '/api-docs/swagger.yaml',
              dom_id: '#swagger-ui',
            });
          };
        </script>
      </body>
      </html>
    `);
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {


      // Remove query string for path matching
      const cleanPath = req.url.split('?')[0];
      let pathParameters = {};
      // /comments/{id}
      const commentMatch = cleanPath.match(/^\/comments\/([\w-]+)$/);
      if (commentMatch) {
        pathParameters.comment_id = commentMatch[1];
      }
      // /recipes/{id}/comments
      const recipeCommentMatch = cleanPath.match(/^\/recipes\/([\w-]+)\/comments$/);
      if (recipeCommentMatch) {
        pathParameters.id = recipeCommentMatch[1];
      }
      // /recipes/{id}/like
      const recipeLikeMatch = cleanPath.match(/^\/recipes\/([\w-]+)\/like$/);
      if (recipeLikeMatch) {
        pathParameters.id = recipeLikeMatch[1];
      }
      // /recipes/{id}
      const recipeIdMatch = cleanPath.match(/^\/recipes\/([\w-]+)$/);
      if (recipeIdMatch) {
        pathParameters.id = recipeIdMatch[1];
      }
      console.log('DEBUG local_server incoming path:', req.url, 'cleanPath:', cleanPath, 'pathParameters:', pathParameters);

      const event = {
        httpMethod: req.method,
        path: req.url,
        headers: req.headers,
        body: body || null,
        pathParameters,
      };

      const context = {};

      const result = await handler(event, context);

      res.writeHead(result.statusCode || 200, result.headers || { 'Content-Type': 'application/json' });
      res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Local server running at http://localhost:${PORT}`);
});
