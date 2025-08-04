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
import postLike from './handlers/post_like.js';
import { handler as deleteImage } from './handlers/delete_image.js';
import { handler as uploadImage } from './handlers/upload_image.js';
import { handler as updateImage } from './handlers/update_image.js';

// AWS Lambda entrypoint
export async function handler(event, context) {
  console.log("📥 Event received:", event.httpMethod, event.path);

  try {
    const db = await getDb();

    // Routing logic
    // Recipes
    if (event.httpMethod === 'GET' && event.path.match(/^\/recipes\/[\w-]+$/)) {
      console.log("Routing to getRecipe handler for path:", event.path);
      return await getRecipe(event); // Ensure this matches the correct handler
    }
    if (event.httpMethod === 'GET' && event.path === '/recipes') {
      return await listRecipes(event);
    }
    if (event.httpMethod === 'POST' && event.path === '/recipes') {
      return await createRecipe(db, JSON.parse(event.body));
    }
    if (event.httpMethod === 'PUT' && event.path.match(/^\/recipes\/[\w-]+$/)) {
      return await updateRecipe(event);
    }
    if (event.httpMethod === 'DELETE' && event.path.match(/^\/recipes\/[\w-]+$/)) {
      return await deleteRecipe(event);
    }

    // Comments
    if (event.httpMethod === 'POST' && event.path.match(/^\/recipes\/[\w-]+\/comments$/)) {
      return await postComment(event);
    }
    if (event.httpMethod === 'PUT' && event.path.match(/^\/comments\/[\w-]+$/)) {
      return await updateComment(event);
    }
    if (event.httpMethod === 'DELETE' && event.path.match(/^\/comments\/[\w-]+$/)) {
      return await deleteComment(event);
    }

    // Likes
    if (event.httpMethod === 'POST' && event.path.match(/^\/recipes\/[\w-]+\/like$/)) {
      return await postLike(event);
    }

    // Image management
    if (event.httpMethod === 'POST' && event.path.match(/^\/recipes\/[\w-]+\/image$/)) {
      return await uploadImage(event);
    }
    if (event.httpMethod === 'PUT' && event.path.match(/^\/recipes\/[\w-]+\/image$/)) {
      return await updateImage(event);
    }
    if (event.httpMethod === 'DELETE' && event.path.match(/^\/recipes\/[\w-]+\/image$/)) {
      return await deleteImage(event);
    }

    // Default 404
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not Found' }),
    };

  } catch (err) {
    console.error("❌ Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
}
