import assert from 'assert';
import { config } from 'dotenv';
config();

const BASE = process.env.APP_BASE_URL || 'http://localhost:3000';
const testUserA = 'test-user-a';
const testUserB = 'test-user-b';

async function createRecipe() {
  const resp = await fetch(`${BASE}/recipes`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title: 'Fav Test', description: 'Fav test desc' }) });
  assert.strictEqual(resp.status, 201, 'Create recipe failed');
  const data = await resp.json();
  return data._id;
}

async function toggle(recipeId, userId) {
  const resp = await fetch(`${BASE}/recipes/${recipeId}/like`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: userId }) });
  const data = await resp.json();
  return { status: resp.status, data };
}

async function getRecipe(recipeId) {
  const resp = await fetch(`${BASE}/recipes/${recipeId}`);
  const data = await resp.json();
  return { status: resp.status, data };
}

(async () => {
  try {
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
