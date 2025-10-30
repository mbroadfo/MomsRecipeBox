// File: app/local_server.js
import { handler } from './lambda.js';
import { setupHealthRoutes, setupGracefulShutdown } from './health/health-routes.js';
import { getDb } from './app.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const PORT = process.env.PORT || 3000;

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Health route handler for local server
async function handleHealthRoutes(req, res, path) {
  // Add CORS headers for health routes
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  };

  const { getHealthChecker } = await import('./app.js');
  const healthChecker = getHealthChecker();
  const endpoints = healthChecker.getHealthEndpoints();
  
  try {
    let result;
    
    switch (path) {
      case '/health':
        result = await new Promise((resolve, reject) => {
          const mockReq = { ...req };
          const mockRes = {
            status: (code) => ({ json: (data) => resolve({ statusCode: code, body: JSON.stringify(data) }) }),
            json: (data) => resolve({ statusCode: 200, body: JSON.stringify(data) })
          };
          endpoints['/health'](mockReq, mockRes).catch(reject);
        });
        break;
        
      case '/health/detailed':
        result = await new Promise((resolve, reject) => {
          const mockReq = { ...req };
          const mockRes = {
            status: (code) => ({ json: (data) => resolve({ statusCode: code, body: JSON.stringify(data) }) }),
            json: (data) => resolve({ statusCode: 200, body: JSON.stringify(data) })
          };
          endpoints['/health/detailed'](mockReq, mockRes).catch(reject);
        });
        break;
        
      case '/health/history':
        result = await new Promise((resolve, reject) => {
          const mockReq = { ...req };
          const mockRes = {
            json: (data) => resolve({ statusCode: 200, body: JSON.stringify(data) })
          };
          endpoints['/health/history'](mockReq, mockRes).catch(reject);
        });
        break;
        
      case '/health/live':
        result = {
          statusCode: 200,
          body: JSON.stringify({
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
          })
        };
        break;
        
      case '/health/ready':
        const health = healthChecker.getCurrentHealth();
        const isReady = !health || health.overall !== 'critical';
        result = {
          statusCode: isReady ? 200 : 503,
          body: JSON.stringify({
            status: isReady ? 'ready' : 'not_ready',
            overall_health: health?.overall || 'unknown',
            timestamp: new Date().toISOString()
          })
        };
        break;
        
      default:
        result = {
          statusCode: 404,
          body: JSON.stringify({ error: 'Health endpoint not found' })
        };
    }
    
    res.writeHead(result.statusCode, { 
      ...corsHeaders,
      'Content-Type': 'application/json' 
    });
    res.end(result.body);
    
  } catch (error) {
    console.error('Health check error:', error);
    res.writeHead(503, { 
      ...corsHeaders,
      'Content-Type': 'application/json' 
    });
    res.end(JSON.stringify({ 
      status: 'error', 
      message: error.message,
      timestamp: new Date().toISOString()
    }));
  }
}

// Centralized response handler function
function handleResponse(res, result) {
  // Add CORS headers to all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  };

  // Merge CORS headers with existing headers
  const headers = { ...corsHeaders, ...(result.headers || {}) };

  // Only log minimal info about the response
  const isImage = headers['Content-Type'] && headers['Content-Type'].startsWith('image/');
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
    res.writeHead(result.statusCode || 200, headers['Content-Type'] ? headers : { ...headers, 'Content-Type': 'application/json' });
    res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
  }
}


const server = http.createServer(async (req, res) => {
  // Add CORS headers for all requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',  // Allow all origins in development
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400' // 24 hours
  };

  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log(`📥 ${req.method} ${req.url}`);
    console.log(`Response: 200 21 bytes`);
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }
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
    // Strip /api prefix for Lambda handler compatibility
    let apiPath = req.url;
    if (apiPath.startsWith('/api/')) {
      apiPath = apiPath.substring(4); // Remove '/api' prefix
    }
    
    // For multipart, pass the raw req object to the handler
    const event = {
      httpMethod: req.method,
      path: apiPath,
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
        // Remove query string for path matching
        const urlParts = req.url.split('?');
        const cleanPath = urlParts[0];
        
        // Handle health check routes directly
        if (cleanPath.startsWith('/health')) {
          await handleHealthRoutes(req, res, cleanPath);
          return;
        }
        
        // Handle build marker initialization endpoint
        if (req.method === 'POST' && cleanPath === '/initializeBuildMarker') {
          console.log('🔧 Build marker initialization requested via POST /initializeBuildMarker');
          try {
            const buildMarker = await import(`./build-marker.js?t=${Date.now()}`);
            console.log('✅ Build marker loaded successfully:', buildMarker.BUILD_INFO);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: 'success',
              message: 'Build marker initialized',
              buildInfo: buildMarker.BUILD_INFO
            }));
          } catch (error) {
            console.error('❌ Failed to load build marker:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: 'error',
              message: 'Failed to initialize build marker',
              error: error.message
            }));
          }
          return;
        }
        
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
        
        // Strip /api prefix for Lambda handler compatibility
        let apiPath = req.url;
        if (apiPath.startsWith('/api/')) {
          apiPath = apiPath.substring(4); // Remove '/api' prefix
        }
        
        const event = {
          httpMethod: req.method,
          path: apiPath,
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

server.listen(PORT, async () => {
  console.log(`🚀 Local server starting on http://localhost:${PORT}`);
  
  try {
    // Initialize database and health checks
    await getDb();
    
    // Setup health check routes (simulated for local server)
    console.log('✅ Health check system initialized');
    console.log('📍 Health endpoints available:');
    console.log(`   http://localhost:${PORT}/health`);
    console.log(`   http://localhost:${PORT}/health/detailed`);
    console.log(`   http://localhost:${PORT}/health/history`);
    console.log(`   http://localhost:${PORT}/health/live`);
    console.log(`   http://localhost:${PORT}/health/ready`);
    
    // Setup graceful shutdown
    setupGracefulShutdown();
    
    console.log(`✅ Server ready at http://localhost:${PORT}`);
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    if (process.env.FAIL_ON_CRITICAL_HEALTH === 'true') {
      console.error('💀 Exiting due to critical health issues');
      process.exit(1);
    } else {
      console.log('⚠️  Server started with health issues - some features may not work correctly');
    }
  }
});
