import assert from 'assert';
import { config } from 'dotenv';
config();

const BASE = process.env.APP_BASE_URL || 'http://localhost:3000';
const testUser = 'test-shopping-user';

// Helper functions
async function createRecipe() {
  const resp = await fetch(`${BASE}/recipes`, { 
    method: 'POST', 
    headers: {'Content-Type': 'application/json'}, 
    body: JSON.stringify({ 
      title: 'Shopping List Test Recipe', 
      description: 'Test recipe for shopping list integration',
      ingredients: [
        '1 cup flour',
        '2 eggs',
        '1/2 cup sugar',
        '1 tsp vanilla extract'
      ]
    }) 
  });
  assert.strictEqual(resp.status, 201, 'Create recipe failed');
  const data = await resp.json();
  return data._id;
}

async function clearShoppingList() {
  const resp = await fetch(`${BASE}/shopping-list/clear`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ user_id: testUser })
  });
  assert.strictEqual(resp.status, 200, 'Failed to clear shopping list');
  return await resp.json();
}

async function getShoppingList() {
  const resp = await fetch(`${BASE}/shopping-list?user_id=${testUser}`);
  assert.strictEqual(resp.status, 200, 'Failed to get shopping list');
  return await resp.json();
}

async function addToShoppingList(items) {
  const resp = await fetch(`${BASE}/shopping-list`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ 
      user_id: testUser,
      items
    })
  });
  assert.strictEqual(resp.status, 200, 'Failed to add items to shopping list');
  return await resp.json();
}

async function removeShoppingListItem(itemId) {
  const resp = await fetch(`${BASE}/shopping-list/${itemId}`, {
    method: 'DELETE'
  });
  assert.strictEqual(resp.status, 200, 'Failed to delete shopping list item');
  return await resp.json();
}

// Main test
(async () => {
  try {
    // Start with a clean shopping list
    await clearShoppingList();
    let shoppingList = await getShoppingList();
    assert.strictEqual(shoppingList.items.length, 0, 'Shopping list should be empty at start');
    console.log('Shopping list cleared successfully');

    // Create a test recipe
    const recipeId = await createRecipe();
    console.log(`Created test recipe: ${recipeId}`);

    // Add some ingredients to shopping list
    const itemsToAdd = [
      { name: '1 cup flour', recipe_id: recipeId },
      { name: '2 eggs', recipe_id: recipeId }
    ];
    
    await addToShoppingList(itemsToAdd);
    
    // Verify items were added
    shoppingList = await getShoppingList();
    assert.strictEqual(shoppingList.items.length, 2, 'Shopping list should have 2 items');
    assert.ok(shoppingList.items.some(item => item.name === '1 cup flour'), 'Shopping list should contain flour');
    assert.ok(shoppingList.items.some(item => item.name === '2 eggs'), 'Shopping list should contain eggs');
    console.log('Added items to shopping list successfully');

    // Remove an item
    const itemToRemove = shoppingList.items.find(item => item.name === '1 cup flour');
    await removeShoppingListItem(itemToRemove._id);
    
    // Verify item was removed
    shoppingList = await getShoppingList();
    assert.strictEqual(shoppingList.items.length, 1, 'Shopping list should have 1 item after removal');
    assert.ok(shoppingList.items.every(item => item.name !== '1 cup flour'), 'Shopping list should not contain flour');
    assert.ok(shoppingList.items.some(item => item.name === '2 eggs'), 'Shopping list should still contain eggs');
    console.log('Removed item from shopping list successfully');

    // Add all remaining ingredients
    const moreItemsToAdd = [
      { name: '1/2 cup sugar', recipe_id: recipeId },
      { name: '1 tsp vanilla extract', recipe_id: recipeId }
    ];
    
    await addToShoppingList(moreItemsToAdd);
    
    // Verify all items were added
    shoppingList = await getShoppingList();
    assert.strictEqual(shoppingList.items.length, 3, 'Shopping list should have 3 items');
    console.log('Added remaining items to shopping list successfully');

    // Clean up
    await clearShoppingList();
    shoppingList = await getShoppingList();
    assert.strictEqual(shoppingList.items.length, 0, 'Shopping list should be empty after cleanup');
    
    console.log('✅ Shopping list integration test passed');
    process.exit(0);
  } catch (e) {
    console.error('❌ Shopping list test failed', e);
    console.error(e.stack);
    process.exit(1);
  }
})();
