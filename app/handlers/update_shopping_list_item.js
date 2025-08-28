/**
 * Update a shopping list item
 * PUT /shopping-list/item/:itemId
 */

import { getCollection } from '../utils/db.js';

async function handler(event, context) {
  try {
    
    const { itemId } = event.pathParameters || {};
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    if (!body || !body.user_id || body.checked === undefined) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Required fields missing: user_id and checked status' })
      };
    }

    const { user_id, checked } = body;
    
    // Connect to the shopping_lists collection
    const shoppingListsColl = await getCollection('shopping_lists');
    
    // Update the specific item in the user's shopping list
    const result = await shoppingListsColl.findOneAndUpdate(
      { 
        user_id, 
        'items.item_id': itemId 
      },
      { 
        $set: { 
          'items.$.checked': checked,
          updated_at: new Date()
        } 
      },
      { 
        returnDocument: 'after'
      }
    );

    if (!result) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Item not found or user does not have access' })
      };
    }

    // Get a fresh copy of the shopping list after update
    const updatedList = await shoppingListsColl.findOne({ 
      user_id,
      'items.item_id': itemId
    }, {
      projection: { 'items.$': 1 }
    });
    
    if (!updatedList || !updatedList.items || updatedList.items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Item not found after update' })
      };
    }
    
    // Use the first item from the filtered result
    const updatedItem = updatedList.items[0];
    
    if (!updatedItem) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Item not found after update' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Item updated successfully',
        item: updatedItem
      })
    };
  } catch (error) {
    console.error('Error updating shopping list item:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message })
    };
  }
}

export { handler };
