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
import toggleFavorite from './handlers/toggle_favorite.js';
import getComment from './handlers/get_comment.js';

// AWS Lambda entrypoint
export async function handler(event, context) {
  // Get user ID from query params if available
  const userId = event.queryStringParameters?.user_id || 'anonymous';
  console.log('\x1b[35m📥 Event received: ' + event.httpMethod + ' ' + event.path + ' [' + userId + ']\x1b[0m');
  const originalPath = event.path || '';
  const pathOnly = originalPath.split('?')[0];

  try {
    const db = await getDb();

    // Image (GET)
    if (event.httpMethod === 'GET' && /^\/recipes\/[\w-]+\/image$/.test(pathOnly)) {
      return await getImage(event);
    }
    // Recipe detail
    if (event.httpMethod === 'GET' && /^\/recipes\/[\w-]+$/.test(pathOnly)) {
      return await getRecipe(event);
    }
    // Recipe list (supports query string)
    if (event.httpMethod === 'GET' && pathOnly === '/recipes') {
      return await listRecipes(event);
    }
    // Create
    if (event.httpMethod === 'POST' && pathOnly === '/recipes') {
      return await createRecipe(db, JSON.parse(event.body));
    }
    // Update
    if (event.httpMethod === 'PUT' && /^\/recipes\/[\w-]+$/.test(pathOnly)) {
      return await updateRecipe(event);
    }
    // Delete
    if (event.httpMethod === 'DELETE' && /^\/recipes\/[\w-]+$/.test(pathOnly)) {
      return await deleteRecipe(event);
    }
    // Comments
    if (event.httpMethod === 'POST' && /^\/recipes\/[\w-]+\/comments$/.test(pathOnly)) {
      return await postComment(event);
    }
    if (event.httpMethod === 'PUT' && /^\/comments\/[\w-]+$/.test(pathOnly)) {
      return await updateComment(event);
    }
    if (event.httpMethod === 'DELETE' && /^\/comments\/[\w-]+$/.test(pathOnly)) {
      return await deleteComment(event);
    }
    if (event.httpMethod === 'GET' && /^\/comments\/[\w-]+$/.test(pathOnly)) {
      return await getComment(event);
    }
    // Likes
    if (event.httpMethod === 'POST' && /^\/recipes\/[\w-]+\/like$/.test(pathOnly)) {
      return await toggleFavorite(event);
    }
    // Image update/delete
    if (event.httpMethod === 'PUT' && /^\/recipes\/[\w-]+\/image$/.test(pathOnly)) {
      const contentType = event.headers['content-type'] || '';
      if (contentType.startsWith('multipart/form-data')) return await uploadImage(event);
      return await updateImage(event);
    }
    if (event.httpMethod === 'DELETE' && /^\/recipes\/[\w-]+\/image$/.test(pathOnly)) {
      return await deleteImage(event);
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Not Found' }) };
  } catch (err) {
    console.error('\x1b[31m❌ Error:\x1b[0m', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
}
