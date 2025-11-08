/**
 * Get a user's shopping list
 * GET /shopping-list
 */

import { getCollection } from '../utils/db.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('get_shopping_list');

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
      logger.info('No shopping list found for user, returning empty list', { userId: user_id });
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
      logger.info('Found shopping list items', { userId: user_id, itemCount: shoppingList.items.length });
      
      // Make sure each item has both _id and item_id for frontend compatibility
      shoppingList.items = shoppingList.items.map((item, index) => {
        const mappedItem = {
          ...item,
          _id: item._id || item.item_id,
          item_id: item.item_id || item._id,
          // Ensure name property exists for frontend
          name: item.name || item.ingredient
        };
        
        logger.debug('Mapped shopping list item', { userId: user_id, index: index, itemId: mappedItem._id, name: mappedItem.name });
        return mappedItem;
      });
    }
    
    logger.debug('Retrieved shopping list for user', { userId: user_id, itemCount: shoppingList.items?.length || 0 });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...shoppingList
      })
    };
  } catch (error) {
    logger.error('Error retrieving shopping list', { error: error.message, stack: error.stack });
    
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message })
    };
  }
}

export { handler };
