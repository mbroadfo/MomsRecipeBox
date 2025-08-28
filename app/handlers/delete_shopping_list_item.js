/**
 * Delete a shopping list item
 * DELETE /shopping-list/item/:itemId
 */

import { getCollection } from '../utils/db.js';

async function handler(event, context) {
  try {
    const { itemId } = event.pathParameters;
    
    // Get user_id from either query parameters or body
    let user_id = event.queryStringParameters?.user_id;
    
    if (!user_id) {
      const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      if (!body || !body.user_id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Required field missing: user_id' })
        };
      }
      user_id = body.user_id;
    }
    
    // Connect to the shopping_lists collection
    const shoppingListsColl = await getCollection('shopping_lists');
    
    // Find the item first to return it in the response
    const shoppingList = await shoppingListsColl.findOne(
      { 
        user_id, 
        'items.item_id': itemId 
      },
      {
        projection: { 'items.$': 1 }
      }
    );

    if (!shoppingList || !shoppingList.items || shoppingList.items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Item not found or user does not have access' })
      };
    }

    const itemToRemove = shoppingList.items[0];

    // Remove the item from the user's shopping list
    const result = await shoppingListsColl.updateOne(
      { user_id },
      { 
        $pull: { items: { item_id: itemId } },
        $set: { updated_at: new Date() }
      }
    );

    if (result.modifiedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Item not found or already removed' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Item removed successfully',
        removed_item: itemToRemove
      })
    };
  } catch (error) {
    console.error('Error removing shopping list item:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message })
    };
  }
}

export { handler };
