import { useState, useEffect, useCallback } from 'react';
import {
  getShoppingList,
  addToShoppingList,
  updateShoppingListItem,
  deleteShoppingListItem,
  clearShoppingList
} from '../../utils/api';

// API Response types
interface ApiResponse<T = unknown> {
  data?: T;
  success?: boolean;
  needsRefresh?: boolean;
}

interface ShoppingListApiResponse {
  _id: string;
  userId: string;
  items: ShoppingListItem[];
}

export interface ShoppingListItem {
  _id: string;
  name: string;
  ingredient?: string;  // Support both formats
  recipeId?: string | null;
  recipe_id?: string | null;   // Support both formats
  recipeTitle?: string | null;
  recipe_title?: string | null; // Support both formats
  checked: boolean;
  item_id?: string;     // Support both formats
}

export interface ShoppingList {
  _id: string;
  userId: string;
  items: ShoppingListItem[];
}

export const useShoppingList = () => {
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Load the shopping list
  const loadShoppingList = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getShoppingList();
      
      // Handle ApiResponse structure - actual data is in response.data
      const apiResponse = response as ApiResponse<ShoppingListApiResponse>;
      const data = apiResponse.data || (response as unknown as ShoppingListApiResponse);
      
      // Check if we have a valid response with items array
      if (data && data.items) {
        if (Array.isArray(data.items)) {
          // Map the items to ensure they have the expected properties
          const mappedItems = data.items.map((item: ShoppingListItem) => ({
            _id: item._id || item.item_id || '', // Use either _id or item_id
            name: item.name || item.ingredient || '', // Use either name or ingredient
            recipeId: item.recipeId || item.recipe_id || null,
            recipeTitle: item.recipeTitle || item.recipe_title || null,
            checked: item.checked || false
          }));
          
          setShoppingList({
            ...data,
            items: mappedItems
          });
        } else {
          console.warn('Shopping list items is not an array:', data.items);
          setShoppingList({ ...data, items: [] });
        }
      } else {
        console.warn('Invalid shopping list format received');
        // Initialize with empty items if we get an invalid response
        setShoppingList({ _id: 'default', userId: 'default', items: [] });
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      console.error('Error loading shopping list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadShoppingList();
  }, [loadShoppingList]);

  // Add items to the shopping list
  const addItems = useCallback(async (
    items: Array<{
      name: string;
      recipeId?: string;
      recipeTitle?: string;
      checked?: boolean;
    }>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await addToShoppingList(items);
      
      // Handle various response formats
      if (response) {
        if (response.items && Array.isArray(response.items)) {
          // Direct shopping list response - ensure we have required fields
          const shoppingListData: ShoppingList = {
            _id: response._id || 'default',
            userId: response.userId || 'default', 
            items: response.items.map(item => ({
              _id: item._id || item.item_id || item.id || '',
              name: item.name || item.ingredient || '',
              recipeId: item.recipeId || item.recipe_id || null,
              recipeTitle: item.recipeTitle || item.recipe_title || null,
              checked: item.checked || false
            }))
          };
          setShoppingList(shoppingListData);
        } else if (response.success || response.needsRefresh) {
          // Success message without data - refresh manually
          await loadShoppingList();
        } else {
          console.warn('Unexpected response format from addToShoppingList');
          // Refresh anyway to be safe
          await loadShoppingList();
        }
      }
      
      return response;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      console.error('Error adding items to shopping list:', err);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadShoppingList]);

  // Toggle item checked status
  const toggleItemChecked = useCallback(async (itemId: string, checked: boolean) => {
    setError(null);
    
    // Optimistic update
    if (shoppingList) {
      const updatedItems = shoppingList.items.map(item => 
        item._id === itemId ? { ...item, checked } : item
      );
      
      setShoppingList({
        ...shoppingList,
        items: updatedItems
      });
    }
    
    try {
      await updateShoppingListItem(itemId, checked);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      console.error('Error updating shopping list item:', err);
      // Revert optimistic update on failure
      loadShoppingList();
      throw error;
    }
  }, [shoppingList, loadShoppingList]);

  // Delete an item
  const deleteItem = useCallback(async (itemId: string) => {
    setError(null);
    
    // Optimistic update
    if (shoppingList) {
      const updatedItems = shoppingList.items.filter(item => item._id !== itemId);
      
      setShoppingList({
        ...shoppingList,
        items: updatedItems
      });
    }
    
    try {
      const response = await deleteShoppingListItem(itemId);
      return response;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      console.error('Error deleting shopping list item:', err);
      // Revert optimistic update on failure
      loadShoppingList();
      throw error;
    }
  }, [shoppingList, loadShoppingList]);

  // Clear shopping list
  const clearList = useCallback(async (action: 'delete' | 'check' | 'delete_purchased' = 'delete') => {
    setLoading(true);
    setError(null);
    
    // Optimistic update
    if (shoppingList) {
      if (action === 'delete') {
        // Clear all items
        setShoppingList({
          ...shoppingList,
          items: []
        });
      } else if (action === 'check') {
        // Mark all items as checked
        const updatedItems = shoppingList.items.map(item => ({ ...item, checked: true }));
        setShoppingList({
          ...shoppingList,
          items: updatedItems
        });
      } else if (action === 'delete_purchased') {
        // Remove only purchased (checked) items
        const updatedItems = shoppingList.items.filter(item => !item.checked);
        setShoppingList({
          ...shoppingList,
          items: updatedItems
        });
      }
    }
    
    try {
      const response = await clearShoppingList(action);
      
      // Process the response
      if (!(response && response.success)) {
        console.warn('Unexpected response from clearShoppingList');
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      console.error('Error clearing shopping list:', err);
      // Revert optimistic update on failure
      loadShoppingList();
      throw error;
    } finally {
      setLoading(false);
    }
  }, [shoppingList, loadShoppingList]);

  // Get items grouped by recipe
  const getItemsByRecipe = useCallback(() => {
    if (!shoppingList || !shoppingList.items || !Array.isArray(shoppingList.items)) {
      return {};
    }
    
    return shoppingList.items.reduce<Record<string, ShoppingListItem[]>>((acc, item) => {
      if (!item) {
        console.warn('Found undefined item in shopping list');
        return acc;
      }
      
      // Support both field naming formats
      const key = item.recipeId || item.recipe_id || 'uncategorized';
      
      // Normalize the item to have all expected fields
      const normalizedItem: ShoppingListItem = {
        ...item,
        _id: item._id || item.item_id || '',
        name: item.name || item.ingredient || '',
        recipeId: item.recipeId || item.recipe_id || '',
        recipeTitle: item.recipeTitle || item.recipe_title || '',
      };
      
      if (!acc[key]) {
        acc[key] = [];
      }
      
      acc[key].push(normalizedItem);
      return acc;
    }, {});
  }, [shoppingList]);

  return {
    shoppingList,
    loading,
    error,
    refresh: loadShoppingList,
    addItems,
    toggleItemChecked,
    deleteItem,
    clearList,
    getItemsByRecipe
  };
};
