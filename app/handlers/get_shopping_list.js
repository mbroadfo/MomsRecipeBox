/**
 * Get a user's shopping list
 * GET /shopping-list
 */

import { getCollection } from '../utils/db.js';

async function handler(event, context) {
  try {
    // Extract user_id from JWT authorizer context
    const user_id = event.requestContext?.authorizer?.principalId;
    
    if (!user_id) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized: No user context found' })
      };
    }

    // Connect to the shopping_lists collection
    const shoppingListsColl = await getCollection('shopping_lists');
    
    // Find the user's shopping list
    const shoppingList = await shoppingListsColl.findOne({ user_id });

    if (!shoppingList) {
      console.log(`No shopping list found for user ${user_id}, returning empty list`);
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          user_id,
          items: [],
          created_at: new Date(),
          updated_at: new Date()
        })
      };
    }

    // Format items to ensure consistency
    if (shoppingList.items && Array.isArray(shoppingList.items)) {
      console.log(`Found ${shoppingList.items.length} items in shopping list for user ${user_id}`);
      
      // Make sure each item has both _id and item_id for frontend compatibility
      shoppingList.items = shoppingList.items.map((item, index) => {
        const mappedItem = {
          ...item,
          _id: item._id || item.item_id,
          item_id: item.item_id || item._id,
          // Ensure name property exists for frontend
          name: item.name || item.ingredient
        };
        
        console.log(`Shopping list item ${index}: ${JSON.stringify(mappedItem)}`);
        return mappedItem;
      });
    }
    
    console.log(`Found shopping list for user ${user_id}:`, JSON.stringify(shoppingList, null, 2));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...shoppingList
      })
    };
  } catch (error) {
    console.error('Error retrieving shopping list:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message })
    };
  }
}

export { handler };
