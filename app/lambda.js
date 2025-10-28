// File: app/lambda.js
import { getDb } from './app.js'; // DB connection helper
import listRecipes from './handlers/list_recipes.js';
import getRecipe from './handlers/get_recipe.js';
import createRecipe from './handlers/create_recipe.js';
import updateRecipe from './handlers/update_recipe.js';
import deleteRecipe from './handlers/delete_recipe.js';
import postComment from './handlers/post_comment.js';
import updateComment from './handlers/update_comment.js';
import deleteComment from './handlers/delete_comment.js';
import { handler as deleteImage } from './handlers/delete_image.js';
import { handler as uploadImage } from './handlers/upload_image.js';
import { handler as updateImage } from './handlers/update_image.js';
import { handler as getImage } from './handlers/get_image.js';
import { handler as copyImage } from './handlers/copy_image.js';
import toggleFavorite from './handlers/toggle_favorite.js';
import getComment from './handlers/get_comment.js';
// Shopping List handlers
import { handler as addShoppingListItems } from './handlers/add_shopping_list_items.js';
import { handler as getShoppingList } from './handlers/get_shopping_list.js';
import { handler as updateShoppingListItem } from './handlers/update_shopping_list_item.js';
import { handler as deleteShoppingListItem } from './handlers/delete_shopping_list_item.js';
import { handler as clearShoppingList } from './handlers/clear_shopping_list.js';
// AI-powered handlers
import { handler as categorizeIngredients } from './handlers/categorize_ingredients.js';
import { handler as aiRecipeAssistant } from './handlers/ai_recipe_assistant.js';
import { AIProviderFactory } from './ai_providers/index.js';
// Admin handlers
import { listUsersHandler } from './admin/admin_handlers/list_users.js';
import { inviteUserHandler } from './admin/admin_handlers/invite_user.js';
import { deleteUserHandler } from './admin/admin_handlers/delete_user.js';
import { handler as systemStatusHandler } from './admin/admin_handlers/system_status.js';
import { handler as aiServicesStatusHandler } from './admin/admin_handlers/ai_services_status.js';
import { handler as userAnalyticsHandler } from './admin/admin_handlers/user_analytics.js';
import { handler as recipeIdsHandler } from './admin/admin_handlers/recipe_ids.js';

/**
 * Add CORS headers to the response
 * @param {object} response - The response object
 * @returns {object} Response with CORS headers
 */
function addCorsHeaders(response) {
  return {
    ...response,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      ...(response.headers || {})
    }
  };
}

/**
 * Get available AI providers
 * @param {object} event - The API Gateway event
 * @returns {object} Response with available AI providers
 */
async function getAiProviders(event) {
  try {
    const availableProviders = AIProviderFactory.getAvailableProviders();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        providers: availableProviders
      })
    };
  } catch (error) {
    console.error('Error getting AI providers:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Failed to get AI providers',
        error: error.message
      })
    };
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 * @param {object} event - API Gateway event
 * @returns {object} CORS preflight response
 */
function handleCorsOptions(event) {
  return addCorsHeaders({
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: 'CORS preflight successful' })
  });
}

// Initialize database connection at module load (cold start) for better performance
let dbInitialized = false;
let cachedDbConnection = null;

async function initializeDatabase() {
  if (dbInitialized && cachedDbConnection) {
    return cachedDbConnection;
  }
  
  console.log('🔧 Initializing database connection...');
  try {
    // Temporarily disable heavy health checks for Lambda startup performance
    const originalHealthCheckTimeout = process.env.HEALTH_CHECK_TIMEOUT_MS;
    const originalStartupHealthChecks = process.env.ENABLE_STARTUP_HEALTH_CHECKS;
    const originalDataQualityChecks = process.env.ENABLE_DATA_QUALITY_CHECKS;
    
    // Set fast startup for Lambda
    process.env.HEALTH_CHECK_TIMEOUT_MS = '3000';       // Shorter timeout
    process.env.ENABLE_STARTUP_HEALTH_CHECKS = 'false';  // Skip heavy startup checks
    process.env.ENABLE_DATA_QUALITY_CHECKS = 'false';    // Skip data quality checks
    
    cachedDbConnection = await getDb();
    dbInitialized = true;
    
    // Restore original settings
    if (originalHealthCheckTimeout) process.env.HEALTH_CHECK_TIMEOUT_MS = originalHealthCheckTimeout;
    if (originalStartupHealthChecks) process.env.ENABLE_STARTUP_HEALTH_CHECKS = originalStartupHealthChecks;
    if (originalDataQualityChecks) process.env.ENABLE_DATA_QUALITY_CHECKS = originalDataQualityChecks;
    
    console.log('✅ Database connection initialized for Lambda');
    return cachedDbConnection;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    // Don't throw - let individual routes handle database unavailability
    return null;
  }
}

// Initialize build marker system once at module load
let buildMarkerInitialized = false;

async function initializeBuildMarker() {
  if (buildMarkerInitialized) return;
  
  console.log('🔧 Loading build marker at container startup...');
  try {
    const buildMarker = await import('./build-marker.js');
    console.log('✅ Build marker loaded successfully:', buildMarker.BUILD_INFO);
  } catch (e) {
    console.log('⚠️ Build marker not loaded at startup:', e.message);
  }
  buildMarkerInitialized = true;
}

async function loadCurrentBuildMarker() {
  console.log('🔧 Loading current build marker on demand...');
  try {
    // Use timestamp to force fresh import (bypass module cache)
    const buildMarker = await import(`./build-marker.js?t=${Date.now()}`);
    console.log('🏗️ Build marker loaded:', buildMarker.BUILD_INFO);
    console.log('✅ Build marker loaded successfully:', buildMarker.BUILD_INFO);
    return buildMarker.BUILD_INFO;
  } catch (e) {
    console.log('⚠️ Build marker not loaded:', e.message);
    return null;
  }
}

// AWS Lambda entrypoint
export async function handler(event, context) {
  console.log('🚀 Lambda handler started');
  console.log('📥 Received event:', JSON.stringify(event, null, 2));
  
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    console.log('🔄 Handling CORS preflight');
    return handleCorsOptions(event);
  }

  const originalPath = event.path || '';
  const pathOnly = originalPath.split('?')[0];
  console.log(`🛣️  Processing path: ${pathOnly}, method: ${event.httpMethod}`);

  try {
    // Health check endpoint - don't require database connection
    if (event.httpMethod === 'GET' && pathOnly === '/health') {
      return addCorsHeaders({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          mode: 'lambda'
        })
      });
    }

    // Get database connection (initialized once during cold start) for routes that need it
    const db = await initializeDatabase();
    
    // If database is not available, return error for DB-dependent routes
    if (!db && (pathOnly.startsWith('/recipes') || pathOnly.startsWith('/shopping-list'))) {
      console.error('❌ Database unavailable for route:', pathOnly);
      return addCorsHeaders({
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Service Temporarily Unavailable',
          message: 'Database connection not available',
          retryAfter: 30
        })
      });
    }

    // ADMIN ROUTES - Check these FIRST to avoid conflicts with other routes
    if (event.httpMethod === 'GET' && pathOnly === '/admin/users') {
      console.log(`🔍 Admin route: GET /admin/users`);
      return addCorsHeaders(await listUsersHandler(event));
    }
    if (event.httpMethod === 'POST' && pathOnly === '/admin/users/invite') {
      console.log(`🔍 Admin route: POST /admin/users/invite`);
      return addCorsHeaders(await inviteUserHandler(event));
    }
    // DELETE USER ROUTE - Match any DELETE to /admin/users/[userId]
    if (event.httpMethod === 'DELETE' && pathOnly.startsWith('/admin/users/') && pathOnly !== '/admin/users/invite') {
      console.log(`🔍 Admin route: DELETE ${pathOnly}`);
      const userId = decodeURIComponent(pathOnly.split('/').pop());
      event.pathParameters = { id: userId };
      console.log(`🔍 Delete user request for: ${userId}`);
      return addCorsHeaders(await deleteUserHandler(event));
    }
    if (event.httpMethod === 'GET' && pathOnly === '/admin/system-status') {
      return addCorsHeaders(await systemStatusHandler(event));
    }
    if (event.httpMethod === 'GET' && pathOnly === '/admin/ai-services-status') {
      return addCorsHeaders(await aiServicesStatusHandler(event));
    }
    if (event.httpMethod === 'GET' && pathOnly === '/admin/user-analytics') {
      return addCorsHeaders(await userAnalyticsHandler(event));
    }
    if (event.httpMethod === 'GET' && pathOnly === '/admin/recipe-ids') {
      return addCorsHeaders(await recipeIdsHandler(event));
    }

    // IMAGE AND RECIPE ROUTES
    if (event.httpMethod === 'GET' && /^\/recipes\/[\w-]+\/image$/.test(pathOnly)) {
      return addCorsHeaders(await getImage(event));
    }
    // Recipe detail
    if (event.httpMethod === 'GET' && /^\/recipes\/[\w-]+$/.test(pathOnly)) {
      return addCorsHeaders(await getRecipe(event));
    }
    // Recipe list (supports query string)
    if (event.httpMethod === 'GET' && pathOnly === '/recipes') {
      return addCorsHeaders(await listRecipes(event));
    }
    // Create
    if (event.httpMethod === 'POST' && pathOnly === '/recipes') {
      return addCorsHeaders(await createRecipe(db, JSON.parse(event.body)));
    }
    // Update
    if (event.httpMethod === 'PUT' && /^\/recipes\/[\w-]+$/.test(pathOnly)) {
      return addCorsHeaders(await updateRecipe(event));
    }
    // Delete
    if (event.httpMethod === 'DELETE' && /^\/recipes\/[\w-]+$/.test(pathOnly)) {
      return addCorsHeaders(await deleteRecipe(event));
    }
    // Comments
    if (event.httpMethod === 'POST' && /^\/recipes\/[\w-]+\/comments$/.test(pathOnly)) {
      return addCorsHeaders(await postComment(event));
    }
    if (event.httpMethod === 'PUT' && /^\/comments\/[\w-]+$/.test(pathOnly)) {
      return addCorsHeaders(await updateComment(event));
    }
    if (event.httpMethod === 'DELETE' && /^\/comments\/[\w-]+$/.test(pathOnly)) {
      return addCorsHeaders(await deleteComment(event));
    }
    if (event.httpMethod === 'GET' && /^\/comments\/[\w-]+$/.test(pathOnly)) {
      return addCorsHeaders(await getComment(event));
    }
    // Likes
    if (event.httpMethod === 'POST' && /^\/recipes\/[\w-]+\/like$/.test(pathOnly)) {
      return addCorsHeaders(await toggleFavorite(event));
    }
    // Image update/delete
    if (event.httpMethod === 'PUT' && /^\/recipes\/[\w-]+\/image$/.test(pathOnly)) {
      const contentType = event.headers['content-type'] || '';
      if (contentType.startsWith('multipart/form-data')) return addCorsHeaders(await uploadImage(event));
      return addCorsHeaders(await updateImage(event));
    }
    if (event.httpMethod === 'DELETE' && /^\/recipes\/[\w-]+\/image$/.test(pathOnly)) {
      return addCorsHeaders(await deleteImage(event));
    }
    // Copy image (for new recipes)
    if (event.httpMethod === 'POST' && /^\/recipes\/[\w-]+\/copy-image$/.test(pathOnly)) {
      return addCorsHeaders(await copyImage(event));
    }
    
    // Shopping List routes
    if (event.httpMethod === 'GET' && pathOnly === '/shopping-list') {
      return addCorsHeaders(await getShoppingList(event));
    }
    if (event.httpMethod === 'POST' && pathOnly === '/shopping-list/add') {
      return addCorsHeaders(await addShoppingListItems(event));
    }
    if (event.httpMethod === 'PUT' && /^\/shopping-list\/item\/[\w-]+$/.test(pathOnly)) {
      const itemId = pathOnly.split('/').pop();
      event.pathParameters = { itemId };
      return addCorsHeaders(await updateShoppingListItem(event));
    }
    if (event.httpMethod === 'DELETE' && /^\/shopping-list\/item\/[\w-]+$/.test(pathOnly)) {
      const itemId = pathOnly.split('/').pop();
      event.pathParameters = { itemId };
      return addCorsHeaders(await deleteShoppingListItem(event));
    }
    if (event.httpMethod === 'POST' && pathOnly === '/shopping-list/clear') {
      return addCorsHeaders(await clearShoppingList(event));
    }
    // AI ingredient categorization
    if (event.httpMethod === 'POST' && pathOnly === '/shopping-list/categorize') {
      return addCorsHeaders(await categorizeIngredients(event));
    }
    
    // AI recipe assistant routes
    if (event.httpMethod === 'POST' && pathOnly === '/ai/chat') {
      return addCorsHeaders(await aiRecipeAssistant(event));
    }
    if (event.httpMethod === 'POST' && pathOnly === '/ai/extract') {
      return addCorsHeaders(await aiRecipeAssistant(event));
    }
    if (event.httpMethod === 'GET' && pathOnly === '/ai/providers') {
      return addCorsHeaders(await getAiProviders(event));
    }

    // Build marker initialization endpoint (for deployment verification)
    if (event.httpMethod === 'POST' && pathOnly === '/initializeBuildMarker') {
      console.log('🔧 Build marker initialization requested via POST /initializeBuildMarker');
      const currentMarker = await loadCurrentBuildMarker();
      return addCorsHeaders({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'success',
          message: 'Build marker loaded',
          timestamp: new Date().toISOString(),
          marker: currentMarker
        })
      });
    }

    return addCorsHeaders({ statusCode: 404, body: JSON.stringify({ error: 'Not Found' }) });
  } catch (err) {
    console.error('❌ Error:', err);
    return addCorsHeaders({ statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) });
  }
}
