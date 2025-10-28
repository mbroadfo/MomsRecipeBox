import assert from 'assert';
import { config } from 'dotenv';
import { getBearerToken, validateConfig } from './utils/auth0-token-generator.js';
import { getBaseUrl, logEnvironmentInfo } from './utils/environment-detector.js';
config();

const BASE = getBaseUrl();
const testUserA = 'test-user-a';
const testUserB = 'test-user-b';

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

async function createRecipe() {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${BASE}/recipes`, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify({ title: 'Fav Test', description: 'Fav test desc' }) 
  });
  assert.strictEqual(resp.status, 201, 'Create recipe failed');
  const data = await resp.json();
  return data._id;
}

async function toggle(recipeId, userId) {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${BASE}/recipes/${recipeId}/like`, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify({ user_id: userId }) 
  });
  const data = await resp.json();
  return { status: resp.status, data };
}

async function getRecipe(recipeId) {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${BASE}/recipes/${recipeId}`, { headers });
  const data = await resp.json();
  return { status: resp.status, data };
}

(async () => {
  try {
    // Validate Auth0 configuration
    console.log('===== Validating Auth0 Configuration =====');
    await validateConfig();
    console.log('✅ Auth0 configuration validated');
    
    logEnvironmentInfo();
    
    const recipeId = await createRecipe();
    console.log('Created recipe', recipeId);

    let r = await toggle(recipeId, testUserA);
    assert.strictEqual(r.status, 200, 'First like should succeed');
    assert.strictEqual(r.data.liked, true, 'User A should now like');
    assert.strictEqual(r.data.likes, 1, 'Likes count should be 1');

    r = await toggle(recipeId, testUserA);
    assert.strictEqual(r.data.liked, false, 'User A unlike');

    r = await toggle(recipeId, testUserA);
    assert.strictEqual(r.data.liked, true, 'User A like again');

    r = await toggle(recipeId, testUserB);
    assert.strictEqual(r.data.liked, true, 'User B like');
    assert.strictEqual(r.data.likes, 2, 'Likes count should be 2');

    const gr = await getRecipe(recipeId);
    assert.strictEqual(gr.status, 200, 'Get recipe');
    assert.ok(typeof gr.data.likes_count === 'number', 'Recipe should have likes_count');

    console.log('✅ Favorites toggle test passed');
    process.exit(0);
  } catch (e) {
    console.error('❌ Favorites test failed', e);
    process.exit(1);
  }
})();
