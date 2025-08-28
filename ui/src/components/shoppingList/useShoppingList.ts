import { useState, useEffect, useCallback } from 'react';
import {
  getShoppingList,
  addToShoppingList,
  updateShoppingListItem,
  deleteShoppingListItem,
  clearShoppingList
} from '../../utils/api';

export interface ShoppingListItem {
  _id: string;
  name: string;
  ingredient?: string;  // Support both formats
  recipeId?: string;
  recipe_id?: string;   // Support both formats
  recipeTitle?: string;
  recipe_title?: string; // Support both formats
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
    console.log('Loading shopping list...');
    setLoading(true);
    setError(null);
    
    try {
      const data = await getShoppingList();
      console.log('Shopping list data received:', JSON.stringify(data, null, 2));
      console.log('Shopping list data type:', typeof data);
      console.log('Has items property:', data && 'items' in data);
      console.log('Items is array:', data && data.items && Array.isArray(data.items));
      
      // Check if we have a valid response with items array
      if (data && data.items) {
        if (Array.isArray(data.items)) {
          console.log('Valid shopping list with items array, setting state');
          
          // Map the items to ensure they have the expected properties
          const mappedItems = data.items.map((item: any) => ({
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
          console.warn('Items is not an array:', data.items);
          setShoppingList({ ...data, items: [] });
        }
      } else {
        console.warn('Received invalid shopping list format:', data);
        // Initialize with empty items if we get an invalid response
        setShoppingList({ _id: 'default', userId: 'default', items: [] });
      }
    } catch (err: any) {
      setError(err);
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
    
    console.log('Adding items to shopping list:', items);
    
    try {
      const response = await addToShoppingList(items);
      console.log('Response from adding items:', response);
      
      // Handle various response formats
      if (response) {
        if (response.items && Array.isArray(response.items)) {
          // Direct shopping list response
          console.log('Setting shopping list from response:', response);
          setShoppingList(response);
        } else if (response.success || response.needsRefresh) {
          // Success message without data - refresh manually
          console.log('Items added successfully, refreshing shopping list');
          await loadShoppingList();
        } else {
          console.warn('Unexpected response format:', response);
          // Refresh anyway to be safe
          await loadShoppingList();
        }
      }
      
      return response;
    } catch (err: any) {
      setError(err);
      console.error('Error adding items to shopping list:', err);
      throw err;
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
    } catch (err: any) {
      setError(err);
      console.error('Error updating shopping list item:', err);
      // Revert optimistic update on failure
      loadShoppingList();
      throw err;
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
      await deleteShoppingListItem(itemId);
    } catch (err: any) {
      setError(err);
      console.error('Error deleting shopping list item:', err);
      // Revert optimistic update on failure
      loadShoppingList();
      throw err;
    }
  }, [shoppingList, loadShoppingList]);

  // Clear shopping list
  const clearList = useCallback(async (action: 'delete' | 'check' = 'delete') => {
    setLoading(true);
    setError(null);
    
    // Optimistic update
    if (shoppingList) {
      if (action === 'delete') {
        setShoppingList({
          ...shoppingList,
          items: []
        });
      } else if (action === 'check') {
        const updatedItems = shoppingList.items.map(item => ({ ...item, checked: true }));
        setShoppingList({
          ...shoppingList,
          items: updatedItems
        });
      }
    }
    
    try {
      await clearShoppingList(action);
    } catch (err: any) {
      setError(err);
      console.error('Error clearing shopping list:', err);
      // Revert optimistic update on failure
      loadShoppingList();
      throw err;
    } finally {
      setLoading(false);
    }
  }, [shoppingList, loadShoppingList]);

  // Get items grouped by recipe
  const getItemsByRecipe = useCallback(() => {
    if (!shoppingList || !shoppingList.items || !Array.isArray(shoppingList.items)) {
      console.warn('No valid shopping list items to group', shoppingList);
      return {};
    }
    
    console.log('Grouping items by recipe:', shoppingList.items);
    
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
