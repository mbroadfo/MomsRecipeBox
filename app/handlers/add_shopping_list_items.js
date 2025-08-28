/**
 * Add items to a user's shopping list
 * POST /shopping-list/add
 */

import { ObjectId } from 'mongodb';
import { getCollection } from '../utils/db.js';

async function handler(event, context) {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    
    if (!body || !body.user_id || !Array.isArray(body.items) || body.items.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Required fields missing: user_id and non-empty items array' })
      };
    }

    const { user_id, items } = body;
    
    // Validate items format
    for (const item of items) {
      if (!item.ingredient) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Each item must have an ingredient field' })
        };
      }
    }

    // Prepare items with metadata
    const timestamp = new Date();
    const preparedItems = items.map(item => ({
      ...item,
      added_at: timestamp,
      checked: false,
      // Add optional item_id for easier client-side identification
      item_id: new ObjectId().toString()
    }));

    // Connect to the shopping_lists collection
    const shoppingListsColl = await getCollection('shopping_lists');
    
    // Find user's shopping list or create a new one
    const result = await shoppingListsColl.findOneAndUpdate(
      { user_id },
      { 
        $push: { items: { $each: preparedItems } },
        $setOnInsert: { created_at: timestamp },
        $set: { updated_at: timestamp }
      },
      { 
        upsert: true,
        returnDocument: 'after'
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: `Added ${items.length} item(s) to shopping list`,
        items: preparedItems,
        shopping_list_id: result._id
      })
    };
  } catch (error) {
    console.error('Error adding items to shopping list:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error: error.message })
    };
  }
}

export { handler };
