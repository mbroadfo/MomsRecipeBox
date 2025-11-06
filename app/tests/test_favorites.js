import assert from 'assert';
import { config } from 'dotenv';
import { getBearerToken, validateConfig } from './utils/auth0-token-generator.js';
import { getBaseUrl, logEnvironmentInfo } from './utils/environment-detector.js';
config();

const testUserId = 'auth0|67e1cc293eeee752d79bfd3a'; // mbroado@yahoo.com

// Function to get auth headers
async function getAuthHeaders() {
  try {
    const bearerToken = await getBearerToken();
    return {
      'Authorization': bearerToken,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Failed to generate Auth0 token:', error.message);
    throw error;
  }
}

async function createRecipe(BASE_URL) {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${BASE_URL}/recipes`, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify({ title: 'Fav Test', description: 'Fav test desc' }) 
  });
  assert.strictEqual(resp.status, 201, 'Create recipe failed');
  const data = await resp.json();
  return data._id;
}

async function toggle(recipeId, BASE_URL) {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${BASE_URL}/recipes/${recipeId}/like`, { 
    method: 'POST', 
    headers 
  });
  const data = await resp.json();
  return { status: resp.status, data };
}

async function getRecipe(recipeId, BASE_URL) {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${BASE_URL}/recipes/${recipeId}`, { headers });
  const data = await resp.json();
  return { status: resp.status, data };
}

(async () => {
  try {
    // Get dynamic base URL
    const BASE_URL = await getBaseUrl();
    
    // Validate Auth0 configuration
    console.log('===== Validating Auth0 Configuration =====');
    await validateConfig();
    console.log('✅ Auth0 configuration validated');
    
    logEnvironmentInfo();
    
    const recipeId = await createRecipe(BASE_URL);
    console.log('Created recipe', recipeId);

    // Test: First like
    let r = await toggle(recipeId, BASE_URL);
    assert.strictEqual(r.status, 200, 'First like should succeed');
    assert.strictEqual(r.data.liked, true, 'User should now like');
    assert.strictEqual(r.data.likes, 1, 'Likes count should be 1');

    // Test: Unlike
    r = await toggle(recipeId, BASE_URL);
    assert.strictEqual(r.data.liked, false, 'User unlike');
    assert.strictEqual(r.data.likes, 0, 'Likes count should be 0');

    // Test: Like again
    r = await toggle(recipeId, BASE_URL);
    assert.strictEqual(r.data.liked, true, 'User like again');
    assert.strictEqual(r.data.likes, 1, 'Likes count should be 1');

    // Test: Get recipe and verify likes_count
    const gr = await getRecipe(recipeId, BASE_URL);
    assert.strictEqual(gr.status, 200, 'Get recipe');
    assert.ok(typeof gr.data.likes_count === 'number', 'Recipe should have likes_count');
    assert.strictEqual(gr.data.likes_count, 1, 'Recipe likes_count should match');

    // CLEANUP: Delete the test recipe to avoid database pollution
    console.log('Cleaning up test recipe...');
    const headers = await getAuthHeaders();
    const deleteResponse = await fetch(`${BASE_URL}/recipes/${recipeId}`, { 
      method: 'DELETE', 
      headers 
    });
    assert.strictEqual(deleteResponse.status, 200, 'Recipe cleanup should succeed');
    console.log('✅ Test recipe cleaned up successfully');

    console.log('✅ Favorites toggle test passed');
    process.exit(0);
  } catch (e) {
    console.error('❌ Favorites test failed', e);
    process.exit(1);
  }
})();
