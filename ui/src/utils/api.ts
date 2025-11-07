/**
 * API Service for MomsRecipeBox
 * Contains standardized functions for interacting with the backend API
 */

import { apiClient } from '../lib/api-client';

// Type definitions for API responses and data structures
interface WindowWithUser extends Window {
  currentUser?: { id: string };
  currentUserId?: string;
}

interface ShoppingListItem {
  _id?: string;
  id?: string;
  item_id?: string;
  name?: string;
  ingredient?: string;
  recipe_id?: string;
  recipeId?: string;
  recipe_title?: string;
  recipeTitle?: string;
  checked: boolean;
  amount?: string;
  unit?: string;
}

interface ShoppingListResponse {
  _id?: string;
  userId?: string;
  success?: boolean;
  items?: ShoppingListItem[];
}

interface AddToShoppingListResponse extends ShoppingListResponse {
  needsRefresh?: boolean;
  shopping_list?: ShoppingListResponse;
}

/**
 * Get the current user ID from the window object
 * @returns The user ID string
 */
export const getCurrentUserId = (): string => {
  // For development, always use test user to match backend MongoDB data
  const isLocalhost = window.location.hostname === 'localhost';
  const isTestEnv = process.env.NODE_ENV === 'test';
  
  if (isTestEnv || isLocalhost) {
    return 'auth0|testuser';
  }
  
  const windowWithUser = window as WindowWithUser;
  const userId = windowWithUser.currentUser?.id || windowWithUser.currentUserId || 'demo-user';
  return userId;
};

// Recipe API Functions

/**
 * Get a recipe by ID
 * @param recipeId The ID of the recipe to get
 * @returns The recipe data
 */
export const getRecipe = async (recipeId: string) => {
  const userId = getCurrentUserId();
  return await apiClient.get(`/recipes/${recipeId}?user_id=${encodeURIComponent(userId)}`);
};

/**
 * Get all recipes for the current user
 * @returns Array of recipes
 */
export const getRecipes = async () => {
  const userId = getCurrentUserId();
  return await apiClient.get(`/recipes?user_id=${encodeURIComponent(userId)}`);
};

// Shopping List API Functions

/**
 * Get the current user's shopping list
 * @returns Shopping list with items
 */
export const getShoppingList = async (): Promise<ShoppingListResponse> => {
  try {
    const data = await apiClient.get('/shopping-list');
    
    // If we don't have an items array but have success=true, initialize an empty one
    const response = data as ShoppingListResponse;
    if (data && response.success === true && !response.items) {
      response.items = [];
    }
    
    return data as ShoppingListResponse;
  } catch (error) {
    console.error('Error in getShoppingList API call:', error);
    throw error;
  }
};

/**
 * Add items to the shopping list
 * @param items Array of shopping list items to add
 * @returns Updated shopping list
 */
export const addToShoppingList = async (items: Array<{
  name: string;
  recipeId?: string;
  recipeTitle?: string;
  checked?: boolean;
  amount?: string;
  unit?: string;
}>): Promise<AddToShoppingListResponse> => {
  try {
    const payload = {
      items: items.map(item => ({
        ingredient: item.name,
        recipe_id: item.recipeId,
        recipe_title: item.recipeTitle,
        amount: item.amount,
        unit: item.unit
      }))
    };
    
    const data = await apiClient.post('/shopping-list/add', payload);
    
    // For successful responses, check for different response formats
    if (data) {
      const response = data as AddToShoppingListResponse;
      // If we have a shopping_list object in the response, return that
      if (response.shopping_list) {
        return response.shopping_list;
      } 
      // If we have a success message but need to fetch the full list
      else if (response.success === true) {
        // Return the success message with a flag indicating we need to refresh
        return {
          ...response,
          needsRefresh: true
        };
      } 
      // If we have the full list already - TypeScript handling for dynamic response
    }
    
    return data as AddToShoppingListResponse;
  } catch (error) {
    console.error('Error in addToShoppingList API call:', error);
    throw error;
  }
};

/**
 * Update a shopping list item (typically to toggle checked status)
 * @param itemId ID of the item to update
 * @param checked New checked status
 * @returns Updated item
 */
export const updateShoppingListItem = async (itemId: string, checked: boolean) => {
  return await apiClient.put(`/shopping-list/item/${itemId}`, { checked });
};

/**
 * Delete a shopping list item
 * @param itemId ID of the item to delete
 * @returns Success message
 */
export const deleteShoppingListItem = async (itemId: string) => {
  return await apiClient.delete(`/shopping-list/item/${itemId}`);
};

/**
 * Clear the shopping list (delete all items, mark all as checked, or delete purchased items)
 * @param action The action to perform ('delete', 'check', or 'delete_purchased')
 * @returns Success message
 */
export const clearShoppingList = async (action: 'delete' | 'check' | 'delete_purchased' = 'delete') => {
  let actionParam: string;
  
  // Map friendly action names to API parameters
  if (action === 'delete') {
    actionParam = 'delete_all';
  } else if (action === 'check') {
    actionParam = 'check_all';
  } else if (action === 'delete_purchased') {
    actionParam = 'delete_purchased';
  } else {
    actionParam = action;
  }
  
  return await apiClient.post('/shopping-list/clear', {
    action: actionParam
  });
};
