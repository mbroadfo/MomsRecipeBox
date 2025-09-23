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
    const db = await getDb();

    // Image (GET)
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
    
    // Admin routes
    if (event.httpMethod === 'GET' && pathOnly === '/admin/users') {
      return addCorsHeaders(await listUsersHandler(event));
    }
    if (event.httpMethod === 'POST' && pathOnly === '/admin/users/invite') {
      return addCorsHeaders(await inviteUserHandler(event));
    }
    if (event.httpMethod === 'DELETE' && /^\/admin\/users\/[\w|@.-]+$/.test(pathOnly)) {
      const userId = decodeURIComponent(pathOnly.split('/').pop());
      event.pathParameters = { id: userId };
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

    // Health check endpoint
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

    return addCorsHeaders({ statusCode: 404, body: JSON.stringify({ error: 'Not Found' }) });
  } catch (err) {
    console.error('❌ Error:', err);
    return addCorsHeaders({ statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) });
  }
}
