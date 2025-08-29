/**
 * Clear a user's shopping list
 * POST /shopping-list/clear
 */

import { getCollection } from '../utils/db.js';

async function handler(event, context) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    if (!body || !body.user_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Required field missing: user_id' })
      };
    }

    const { user_id, action = 'delete_all' } = body;
    const cleared_only = action === 'check_all';
    const delete_purchased_only = action === 'delete_purchased';
    
    // Connect to the shopping_lists collection
    const shoppingListsColl = await getCollection('shopping_lists');
    
    let result;
    const timestamp = new Date();

    if (cleared_only) {
      // Mark all items as checked but don't remove them
      result = await shoppingListsColl.updateOne(
        { user_id },
        { 
          $set: { 
            'items.$[].checked': true,
            updated_at: timestamp
          } 
        }
      );
    } else if (delete_purchased_only) {
      // Get the current shopping list
      const currentList = await shoppingListsColl.findOne(
        { user_id },
        { projection: { items: 1 } }
      );
      
      if (!currentList) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'Shopping list not found' })
        };
      }
      
      // Filter out purchased items
      const updatedItems = currentList.items.filter(item => !item.checked);
      
      // Update the shopping list with only the unchecked items
      result = await shoppingListsColl.updateOne(
        { user_id },
        { 
          $set: { 
            items: updatedItems,
            updated_at: timestamp
          } 
        }
      );
    } else {
      // Get the current shopping list for response
      const currentList = await shoppingListsColl.findOne(
        { user_id },
        { projection: { items: 1 } }
      );

      // Actually remove all items
      result = await shoppingListsColl.updateOne(
        { user_id },
        { 
          $set: { 
            items: [],
            updated_at: timestamp
          } 
        }
      );

      if (!currentList) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'Shopping list not found' })
        };
      }
    }

    if (result.matchedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Shopping list not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: cleared_only ? 
          'All shopping list items marked as checked' : 
          (delete_purchased_only ? 
            'Purchased items removed successfully' : 
            'Shopping list cleared successfully'),
        cleared_at: timestamp
      })
    };
  } catch (error) {
    console.error('Error clearing shopping list:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message })
    };
  }
}

export { handler };
