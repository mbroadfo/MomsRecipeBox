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
    
    // Log the request items for debugging
    console.log('Received shopping list items:', JSON.stringify(items, null, 2));
    
    // Validate items format
    for (const item of items) {
      if (!item.ingredient && !item.name) {
        console.error('Invalid item format - missing both name and ingredient:', item);
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            message: 'Each item must have either an ingredient or name field',
            received: item
          })
        };
      }
    }
    
    // Handle both name and ingredient fields
    const validatedItems = items.map(item => {
      // If name is provided but not ingredient, use name as ingredient
      const result = {
        ...item,
        ingredient: item.ingredient || item.name
      };
      console.log('Validated item:', result);
      return result;
    });

    // Prepare items with metadata
    const timestamp = new Date();
    const preparedItems = validatedItems.map(item => {
      const itemId = new ObjectId().toString();
      return {
        ...item,
        added_at: timestamp,
        checked: false,
        // Use consistent ID field names for frontend compatibility
        item_id: itemId,
        _id: itemId  // Add both formats for compatibility
      };
    });

    // Connect to the shopping_lists collection
    const shoppingListsColl = await getCollection('shopping_lists');
    
    // First, get the existing shopping list to check for duplicates
    let existingList = await shoppingListsColl.findOne({ user_id });
    let existingItems = existingList?.items || [];
    
    // Filter out duplicates (same ingredient from same recipe)
    const newItems = [];
    const skippedCount = {count: 0};
    
    preparedItems.forEach(newItem => {
      const isDuplicate = existingItems.some(existingItem => {
        // Check if same recipe_id and same ingredient
        const sameRecipe = newItem.recipe_id && existingItem.recipe_id && 
                          newItem.recipe_id === existingItem.recipe_id;
        
        const sameIngredient = (newItem.ingredient === existingItem.ingredient) ||
                              (newItem.name && existingItem.name && newItem.name === existingItem.name);
        
        return sameRecipe && sameIngredient;
      });
      
      if (!isDuplicate) {
        newItems.push(newItem);
      } else {
        console.log(`Skipping duplicate item: ${newItem.ingredient || newItem.name}`);
        skippedCount.count++;
      }
    });
    
    console.log(`Adding ${newItems.length} new items, skipped ${skippedCount.count} duplicates`);
    
    // Only proceed with update if we have new items
    let result;
    if (newItems.length > 0) {
      result = await shoppingListsColl.findOneAndUpdate(
        { user_id },
        { 
          $push: { items: { $each: newItems } },
          $setOnInsert: { created_at: timestamp },
          $set: { updated_at: timestamp }
        },
        { 
          upsert: true,
          returnDocument: 'after'
        }
      );
    } else {
      result = existingList;
    }

    // Get the full updated shopping list to return
    const updatedShoppingList = await shoppingListsColl.findOne({ user_id });
    
    console.log('Updated shopping list:', JSON.stringify(updatedShoppingList, null, 2));
    
    console.log('Full updated shopping list:', JSON.stringify(updatedShoppingList, null, 2));
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: `Added ${newItems.length} item(s) to shopping list${skippedCount.count > 0 ? `, skipped ${skippedCount.count} duplicate(s)` : ''}`,
        items: newItems,
        skipped: skippedCount.count,
        shopping_list_id: result._id,
        // Return the full shopping list for immediate use
        shopping_list: updatedShoppingList,
        user_id: user_id
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
