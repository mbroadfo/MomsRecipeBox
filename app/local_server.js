// File: app/local_server.js
import { handler } from './lambda.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const PORT = process.env.PORT || 3000;

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Centralized response handler function
function handleResponse(res, result) {
  // Only log minimal info about the response
  const isImage = result.headers && result.headers['Content-Type'] && result.headers['Content-Type'].startsWith('image/');
  const bodyLength = result.body ? 
    (Buffer.isBuffer(result.body) ? result.body.length : 
      (typeof result.body === 'string' ? result.body.length : 'unknown')) : 0;
  
  if (isImage) {
    console.log(`Response: ${result.statusCode} Image (${bodyLength} bytes)`);
  } else {
    console.log(`Response: ${result.statusCode} ${bodyLength} bytes`);
  }
  
  // Handle base64 encoded responses (for binary data like images)
  if (result.isBase64Encoded && typeof result.body === 'string') {
    const buffer = Buffer.from(result.body, 'base64');
    
    // Ensure Content-Disposition is set for inline viewing
    const headers = { ...result.headers };
    if (!headers['Content-Disposition']) {
      headers['Content-Disposition'] = 'inline';
    }
    
    // Set proper headers for binary data
    res.writeHead(result.statusCode, {
      ...headers,
      'Content-Type': headers['Content-Type'] || 'application/octet-stream',
      'Content-Length': buffer.length
    });
    
    // Write the binary buffer directly to the response
    res.end(buffer);
  } 
  // Handle raw binary responses (non-base64)
  else if (!result.isBase64Encoded && Buffer.isBuffer(result.body)) {
    // Ensure Content-Disposition is set for inline viewing
    const headers = { ...result.headers };
    if (!headers['Content-Disposition']) {
      headers['Content-Disposition'] = 'inline';
    }
    
    res.writeHead(result.statusCode, {
      ...headers,
      'Content-Type': headers['Content-Type'] || 'application/octet-stream',
      'Content-Length': result.body.length
    });
    
    res.end(result.body);
  } 
  // Handle regular string/JSON responses
  else {
    res.writeHead(result.statusCode || 200, result.headers || { 'Content-Type': 'application/json' });
    res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
  }
}


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

  // Remove query string for path matching
  const cleanPath = req.url.split('?')[0];
  console.log(`📥 ${req.method} ${cleanPath}`);
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
  // /recipes/{id}/image - fix capture group
  const recipeImageMatch = cleanPath.match(/^\/recipes\/([\w-]+)\/image$/);
  if (recipeImageMatch) {
    pathParameters.id = recipeImageMatch[1];
  }
  // /recipes/{id}/copy-image - for copying from temp to permanent
  const recipeCopyImageMatch = cleanPath.match(/^\/recipes\/([\w-]+)\/copy-image$/);
  if (recipeCopyImageMatch) {
    pathParameters.id = recipeCopyImageMatch[1];
  }
  // /shopping-list/item/{itemId} - for shopping list item operations
  const shoppingListItemMatch = cleanPath.match(/^\/shopping-list\/item\/([\w-]+)$/);
  if (shoppingListItemMatch) {
    pathParameters.itemId = shoppingListItemMatch[1];
  }
  // /admin/users/{id} - for admin user operations
  const adminUserMatch = cleanPath.match(/^\/admin\/users\/([\w|@.-]+)$/);
  if (adminUserMatch) {
    pathParameters.id = decodeURIComponent(adminUserMatch[1]);
  }

  // Add support for AI endpoints
  // This will proxy /ai/* requests to the lambda handler

  // Handle the request differently based on content type
  if (
    req.headers['content-type'] &&
    req.headers['content-type'].startsWith('multipart/form-data')
  ) {
    // For multipart, pass the raw req object to the handler
    const event = {
      httpMethod: req.method,
      path: req.url,
      headers: req.headers,
      body: req, // Pass the raw request object
      pathParameters,
    };
    const context = {};
    
    try {
      const result = await handler(event, context);
      handleResponse(res, result);
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  } else {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        console.debug(`📥 Event received: ${req.method} ${req.url}`);

        // Remove query string for path matching
        const urlParts = req.url.split('?');
        const cleanPath = urlParts[0];
        
        // Parse query parameters
        let queryStringParameters = {};
        if (urlParts.length > 1) {
          const queryString = urlParts[1];
          queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            if (key && value) {
              queryStringParameters[key] = decodeURIComponent(value);
            }
          });
          // Don't log query parameters
        }
        
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
        // /recipes/{id}/image - fix capture group
        const recipeImageMatch = cleanPath.match(/^\/recipes\/([\w-]+)\/image$/);
        if (recipeImageMatch) {
          pathParameters.id = recipeImageMatch[1];
        }
        // /recipes/{id}/copy-image - for copying from temp to permanent
        const recipeCopyImageMatch = cleanPath.match(/^\/recipes\/([\w-]+)\/copy-image$/);
        if (recipeCopyImageMatch) {
          pathParameters.id = recipeCopyImageMatch[1];
        }
        // /shopping-list/item/{itemId} - for shopping list item operations
        const shoppingListItemMatch = cleanPath.match(/^\/shopping-list\/item\/([\w-]+)$/);
        if (shoppingListItemMatch) {
          pathParameters.itemId = shoppingListItemMatch[1];
        }
        // /admin/users/{id} - for admin user operations
        const adminUserMatch = cleanPath.match(/^\/admin\/users\/([\w|@.-]+)$/);
        if (adminUserMatch) {
          pathParameters.id = decodeURIComponent(adminUserMatch[1]);
        }

        // Patch: Set content-length header for multipart/form-data if missing
        if (
          req.headers['content-type'] &&
          req.headers['content-type'].startsWith('multipart/form-data') &&
          !req.headers['content-length']
        ) {
          req.headers['content-length'] = Buffer.byteLength(body);
        }
        const event = {
          httpMethod: req.method,
          path: req.url,
          headers: req.headers,
          body: body || null,
          pathParameters,
          queryStringParameters,
        };

        const context = {};

        const result = await handler(event, context);
        handleResponse(res, result);
      } catch (err) {
        console.error('Error processing request:', err);
        const errorResult = {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Internal Server Error', message: err.message })
        };
        handleResponse(res, errorResult);
      }
    });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Local server running at http://localhost:${PORT}`);
});
