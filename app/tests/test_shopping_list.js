/**
 * test_shopping_list.js - Full lifecycle test for MomsRecipeBox shopping list API
 * Tests Add, Get, Update, Delete, and Clear operations for shopping list items
 */

import axios from 'axios';
import assert from 'assert';
import { config } from 'dotenv';
import { getBearerToken, validateConfig } from './utils/auth0-token-generator.js';
import { getBaseUrl, logEnvironmentInfo } from './utils/environment-detector.js';
config();

const BASE_URL = getBaseUrl();
const TEST_USER_ID = 'auth0|testuser';

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

// For storing generated IDs during the test
let testRecipeId;
let testItemIds = [];

/**
 * Run all shopping list tests in sequence
 */
async function runTests() {
  console.log('Starting shopping list API tests...');
  logEnvironmentInfo();
  
  try {
    // Validate Auth0 configuration
    console.log('\n===== Validating Auth0 Configuration =====');
    await validateConfig();
    console.log('✅ Auth0 configuration validated');
    
    // Step 1: Create a test recipe to use with the shopping list
    console.log('\n===== Creating test recipe for shopping list items =====');
    const testRecipe = {
      owner_id: TEST_USER_ID,
      visibility: 'public',
      status: 'published',
      title: 'Shopping List Test Recipe',
      subtitle: 'For testing shopping list API',
      description: 'A sample recipe to test shopping list functionality',
      ingredients: [
        '1 cup flour',
        '2 tbsp sugar',
        '1 tsp salt',
        '1/2 cup milk'
      ],
      instructions: [
        'Mix dry ingredients',
        'Add milk',
        'Stir well'
      ]
    };
    
    const createRecipeResponse = await axios.post(`${BASE_URL}/recipes`, testRecipe, { headers: await getAuthHeaders() });
    testRecipeId = createRecipeResponse.data._id;
    console.log(`Test recipe created with ID: ${testRecipeId}`);
    assert.ok(testRecipeId, 'Recipe should have been created with an ID');
    
    // Step 2: Add items to shopping list
    console.log('\n===== Adding items to shopping list =====');
    const items = [
      {
        ingredient: '1 cup flour',
        recipe_id: testRecipeId,
        recipe_title: 'Shopping List Test Recipe'
      },
      {
        ingredient: '2 tbsp sugar',
        recipe_id: testRecipeId,
        recipe_title: 'Shopping List Test Recipe'
      }
    ];
    
    const addItemsResponse = await axios.post(`${BASE_URL}/shopping-list/add`, {
      items,
      user_id: TEST_USER_ID
    }, { headers: await getAuthHeaders() });
    
    console.log('Items added to shopping list:');
    console.log(JSON.stringify(addItemsResponse.data, null, 2));
    
    assert.strictEqual(addItemsResponse.status, 200, 'Expected 200 status code for adding items');
    assert.strictEqual(addItemsResponse.data.success, true, 'Response should indicate success');
    assert.ok(addItemsResponse.data.message.toLowerCase().includes('added'), 'Response message should confirm items were added');
    
    // Step 3: Get shopping list to verify items were added
    console.log('\n===== Getting shopping list =====');
    const getShoppingListResponse = await axios.get(`${BASE_URL}/shopping-list?user_id=${encodeURIComponent(TEST_USER_ID)}`, { headers: await getAuthHeaders() });
    
    console.log('Shopping list retrieved:');
    console.log(JSON.stringify(getShoppingListResponse.data, null, 2));
    
    assert.strictEqual(getShoppingListResponse.status, 200, 'Expected 200 status code for getting shopping list');
    assert.ok(Array.isArray(getShoppingListResponse.data.items), 'Response should contain items array');
    assert.ok(getShoppingListResponse.data.items.length >= 2, 'Shopping list should have at least 2 items');
    
    // Save item IDs for later use - only use the most recently added items
    // Get the last two items which should be the ones we just added
    const recentItems = getShoppingListResponse.data.items.slice(-2);
    testItemIds = recentItems.map(item => item.item_id);
    
    console.log('Using these items for testing:', testItemIds);
    
    // Step 4: Update a shopping list item (mark as checked)
    console.log('\n===== Updating shopping list item =====');
    const updateItemResponse = await axios.put(
      `${BASE_URL}/shopping-list/item/${testItemIds[0]}`,
      {
        checked: true,
        user_id: TEST_USER_ID
      },
      { headers: await getAuthHeaders() }
    );
    
    console.log('Item updated:');
    console.log(JSON.stringify(updateItemResponse.data, null, 2));
    
    assert.strictEqual(updateItemResponse.status, 200, 'Expected 200 status code for updating item');
    assert.strictEqual(updateItemResponse.data.success, true, 'Response should indicate success');
    
    // Step 5: Verify the update
    console.log('\n===== Verifying item update =====');
    const verifyUpdateResponse = await axios.get(`${BASE_URL}/shopping-list?user_id=${encodeURIComponent(TEST_USER_ID)}`, { headers: await getAuthHeaders() });
    
    const updatedItem = verifyUpdateResponse.data.items.find(item => item.item_id === testItemIds[0]);
    console.log('Updated item verified:');
    console.log(JSON.stringify(updatedItem, null, 2));
    
    assert.strictEqual(updatedItem.checked, true, 'Item should be marked as checked');
    
    // Step 6: Delete a shopping list item
    console.log('\n===== Deleting shopping list item =====');
    const deleteItemResponse = await axios.delete(`${BASE_URL}/shopping-list/item/${testItemIds[0]}?user_id=${encodeURIComponent(TEST_USER_ID)}`, { headers: await getAuthHeaders() });
    
    console.log('Item deleted:');
    console.log(JSON.stringify(deleteItemResponse.data, null, 2));
    
    assert.strictEqual(deleteItemResponse.status, 200, 'Expected 200 status code for deleting item');
    assert.strictEqual(deleteItemResponse.data.success, true, 'Response should indicate success');
    
    // Step 7: Verify the deletion
    console.log('\n===== Verifying item deletion =====');
    const verifyDeletionResponse = await axios.get(`${BASE_URL}/shopping-list?user_id=${encodeURIComponent(TEST_USER_ID)}`, { headers: await getAuthHeaders() });
    
    console.log('Shopping list after deletion:');
    console.log(JSON.stringify(verifyDeletionResponse.data, null, 2));
    
    const deletedItemExists = verifyDeletionResponse.data.items.some(item => item.item_id === testItemIds[0]);
    assert.strictEqual(deletedItemExists, false, 'Deleted item should not be in the shopping list');
    
    // Step 8: Add more items for clear test
    console.log('\n===== Adding more items for clear test =====');
    const moreItems = [
      {
        ingredient: '1 tsp salt',
        recipe_id: testRecipeId,
        recipe_title: 'Shopping List Test Recipe'
      },
      {
        ingredient: '1/2 cup milk',
        recipe_id: testRecipeId,
        recipe_title: 'Shopping List Test Recipe'
      }
    ];
    
    await axios.post(`${BASE_URL}/shopping-list/add`, {
      items: moreItems,
      user_id: TEST_USER_ID
    }, { headers: await getAuthHeaders() });
    
    // Step 9: Test check all functionality
    console.log('\n===== Testing check all functionality =====');
    const checkAllResponse = await axios.post(
      `${BASE_URL}/shopping-list/clear`,
      {
        action: 'check_all',
        user_id: TEST_USER_ID
      },
      { headers: await getAuthHeaders() }
    );
    
    console.log('Check all response:');
    console.log(JSON.stringify(checkAllResponse.data, null, 2));
    
    assert.strictEqual(checkAllResponse.status, 200, 'Expected 200 status code for check all');
    assert.strictEqual(checkAllResponse.data.success, true, 'Response should indicate success');
    
    // Step 10: Verify all items are checked
    console.log('\n===== Verifying all items checked =====');
    const verifyCheckedResponse = await axios.get(`${BASE_URL}/shopping-list?user_id=${encodeURIComponent(TEST_USER_ID)}`, { headers: await getAuthHeaders() });
    
    console.log('Shopping list after check all:');
    console.log(JSON.stringify(verifyCheckedResponse.data, null, 2));
    
    const allChecked = verifyCheckedResponse.data.items.every(item => item.checked === true);
    assert.strictEqual(allChecked, true, 'All items should be checked');
    
    // Step 11: Test clear all functionality
    console.log('\n===== Testing clear all functionality =====');
    const clearAllResponse = await axios.post(
      `${BASE_URL}/shopping-list/clear`,
      {
        action: 'delete_all',
        user_id: TEST_USER_ID
      },
      { headers: await getAuthHeaders() }
    );
    
    console.log('Clear all response:');
    console.log(JSON.stringify(clearAllResponse.data, null, 2));
    
    assert.strictEqual(clearAllResponse.status, 200, 'Expected 200 status code for clear all');
    assert.strictEqual(clearAllResponse.data.success, true, 'Response should indicate success');
    
    // Step 12: Verify all items are gone
    console.log('\n===== Verifying all items cleared =====');
    const verifyClearResponse = await axios.get(`${BASE_URL}/shopping-list?user_id=${encodeURIComponent(TEST_USER_ID)}`, { headers: await getAuthHeaders() });
    
    console.log('Shopping list after clear all:');
    console.log(JSON.stringify(verifyClearResponse.data, null, 2));
    
    assert.strictEqual(verifyClearResponse.data.items.length, 0, 'Shopping list should be empty');
    
    // Step 13: Test error handling - add empty items list
    console.log('\n===== Testing error handling - empty items list =====');
    try {
      await axios.post(`${BASE_URL}/shopping-list/add`, {
        items: [],
        user_id: TEST_USER_ID
      }, { headers: await getAuthHeaders() });
      assert.fail('Should throw error for empty items list');
    } catch (error) {
      assert.strictEqual(error.response.status, 400, 'Expected 400 status code for empty items list');
      console.log('Received expected error for empty items list');
    }
    
    // Step 14: Test error handling - non-existent item update
    console.log('\n===== Testing error handling - non-existent item update =====');
    try {
      await axios.put(
        `${BASE_URL}/shopping-list/item/nonexistentid`,
        {
          checked: true,
          user_id: TEST_USER_ID
        },
        { headers: await getAuthHeaders() }
      );
      assert.fail('Should throw error for non-existent item update');
    } catch (error) {
      assert.strictEqual(error.response.status, 404, 'Expected 404 status code for non-existent item update');
      console.log('Received expected error for non-existent item update');
    }
    
    // Step 15: Clean up - Delete the test recipe
    console.log('\n===== Cleaning up - Deleting test recipe =====');
    const deleteRecipeResponse = await axios.delete(`${BASE_URL}/recipes/${testRecipeId}`, { headers: await getAuthHeaders() });
    console.log('Test recipe deleted:');
    console.log(JSON.stringify(deleteRecipeResponse.data, null, 2));
    
    // Validate the new delete response format
    if (deleteRecipeResponse.data.message && typeof deleteRecipeResponse.data.deletedImages === 'number') {
      console.log(`✅ Delete response format correct: ${deleteRecipeResponse.data.deletedImages} images deleted`);
    }
    
    console.log('\n✅ All shopping list tests completed successfully!');
  } catch (error) {
    console.error('❌ Shopping list test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    console.error('Error stack:', error.stack);
    
    // Cleanup in case of error - try to delete created resources
    console.log('\nAttempting cleanup after error...');
    try {
      if (testRecipeId) {
        await axios.delete(`${BASE_URL}/recipes/${testRecipeId}`, { headers: await getAuthHeaders() }).catch(() => {});
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError.message);
    }
    
    process.exit(1);
  }
}

// Run the tests
runTests();
