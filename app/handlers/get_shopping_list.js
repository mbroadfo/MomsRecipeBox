/**
 * Get a user's shopping list
 * GET /shopping-list
 */

import { getCollection } from '../utils/db.js';

async function handler(event, context) {
  try {
    // Extract user_id from query parameters
    const user_id = event.queryStringParameters?.user_id;
    
    if (!user_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required parameter: user_id' })
      };
    }

    // Connect to the shopping_lists collection
    const shoppingListsColl = await getCollection('shopping_lists');
    
    // Find the user's shopping list
    const shoppingList = await shoppingListsColl.findOne({ user_id });

    if (!shoppingList) {
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
