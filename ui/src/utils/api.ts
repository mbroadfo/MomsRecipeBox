/**
 * API Service for MomsRecipeBox
 * Contains standardized functions for interacting with the backend API
 */

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
  
  const userId = (window as any).currentUser?.id || (window as any).currentUserId || 'demo-user';
  return userId;
};

/**
 * Handle API errors consistently
 * @param response The fetch response object
 * @returns The JSON response if successful
 * @throws Error if the response is not ok
 */
const handleResponse = async (response: Response) => {
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`API Error ${response.status}: ${errorText}`);
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }
  
  try {
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    throw new Error('Invalid JSON response from API');
  }
};

// Recipe API Functions

/**
 * Get a recipe by ID
 * @param recipeId The ID of the recipe to get
 * @returns The recipe data
 */
export const getRecipe = async (recipeId: string) => {
  const userId = getCurrentUserId();
  const response = await fetch(`/api/recipes/${recipeId}?user_id=${encodeURIComponent(userId)}`);
  return handleResponse(response);
};

/**
 * Get all recipes for the current user
 * @returns Array of recipes
 */
export const getRecipes = async () => {
  const userId = getCurrentUserId();
  const response = await fetch(`/api/recipes?user_id=${encodeURIComponent(userId)}`);
  return handleResponse(response);
};

// Shopping List API Functions

/**
 * Get the current user's shopping list
 * @returns Shopping list with items
 */
export const getShoppingList = async () => {
  const userId = getCurrentUserId();
  try {
    const url = `/api/shopping-list?user_id=${encodeURIComponent(userId)}`;
    
    const response = await fetch(url);
    
    const data = await handleResponse(response);
    
    // If we don't have an items array but have success=true, initialize an empty one
    if (data && data.success === true && !data.items) {
      data.items = [];
    }
    
    return data;
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
}>) => {
  const userId = getCurrentUserId();
  try {
    const payload = {
      user_id: userId,
      items: items.map(item => ({
        ingredient: item.name,
        recipe_id: item.recipeId,
        recipe_title: item.recipeTitle,
        amount: item.amount,
        unit: item.unit
      }))
    };
    
    const response = await fetch('/api/shopping-list/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await handleResponse(response);
    
    // For successful responses, check for different response formats
    if (data) {
      // If we have a shopping_list object in the response, return that
      if (data.shopping_list) {
        return data.shopping_list;
      } 
      // If we have a success message but need to fetch the full list
      else if (data.success === true) {
        // Return the success message with a flag indicating we need to refresh
        return {
          ...data,
          needsRefresh: true
        };
      } 
      // If we have the full list already
      else if (data.items && Array.isArray(data.items)) {
        return data;
      }
    }
    
    return data;
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
  const userId = getCurrentUserId();
  const response = await fetch(`/api/shopping-list/item/${itemId}?user_id=${encodeURIComponent(userId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: userId, checked })
  });
  return handleResponse(response);
};

/**
 * Delete a shopping list item
 * @param itemId ID of the item to delete
 * @returns Success message
 */
export const deleteShoppingListItem = async (itemId: string) => {
  const userId = getCurrentUserId();
  const response = await fetch(`/api/shopping-list/item/${itemId}?user_id=${encodeURIComponent(userId)}`, {
    method: 'DELETE'
  });
  return handleResponse(response);
};

/**
 * Clear the shopping list (delete all items, mark all as checked, or delete purchased items)
 * @param action The action to perform ('delete', 'check', or 'delete_purchased')
 * @returns Success message
 */
export const clearShoppingList = async (action: 'delete' | 'check' | 'delete_purchased' = 'delete') => {
  const userId = getCurrentUserId();
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
  
  const response = await fetch(`/api/shopping-list/clear`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      user_id: userId,
      action: actionParam
    })
  });
  return handleResponse(response);
};
