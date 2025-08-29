import React, { useState, useEffect } from 'react';
import type { IngredientGroup } from '../hooks/useWorkingRecipe';
import { useNavigate } from 'react-router-dom';
import { addToShoppingList, getShoppingList, deleteShoppingListItem } from '../../../utils/api';
import { showToast } from '../../../components/Toast';

export const IngredientsView: React.FC<{ 
  groups: IngredientGroup[], 
  recipeId?: string,
  recipeTitle?: string
}> = ({ 
  groups, 
  recipeId, 
  recipeTitle = "Recipe" 
}) => {
  const navigate = useNavigate();
  const list = groups[0] || { items: [] } as IngredientGroup;
  
  // For tracking if we're modifying the shopping list
  const [isModifyingList, setIsModifyingList] = useState(false);
  
  // For checking existing shopping list items - store item id, name and checked state for each item
  const [shoppingListItems, setShoppingListItems] = useState<Record<string, {id: string, name: string, checked: boolean}>>({});
  const [shoppingListLoaded, setShoppingListLoaded] = useState(false);
  
  // Initialize checked items from localStorage if available
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(() => {
    if (!recipeId) return {};
    
    try {
      const savedItems = localStorage.getItem(`recipe_${recipeId}_checked_ingredients`);
      return savedItems ? JSON.parse(savedItems) : {};
    } catch (error) {
      return {};
    }
  });
  
  // Load shopping list to check which items are already added
  // Poll for shopping list changes only when tab is not visible
  useEffect(() => {
    if (!recipeId) return;
    
    const loadShoppingList = async () => {
      try {
        const data = await getShoppingList();
        
        if (data && data.items && Array.isArray(data.items)) {
          // Create a map of ingredient names from this recipe that are in the shopping list
          const ingredientMap: Record<string, {id: string, name: string, checked: boolean}> = {};
          
          data.items.forEach((item: any) => {
            const itemName = item.name || item.ingredient || '';
            const itemRecipeId = item.recipeId || item.recipe_id || '';
            const itemId = item._id || item.item_id || '';
            const checked = item.checked || false;
            
            // Check if this item belongs to the current recipe
            if (itemRecipeId === recipeId) {
              ingredientMap[itemName] = {
                id: itemId,
                name: itemName,
                checked: checked // Track checked state
              };
            }
          });
          
          setShoppingListItems(ingredientMap);
        }
        
        setShoppingListLoaded(true);
      } catch (error) {
        setShoppingListLoaded(true);
      }
    };
    
    // Initial load
    loadShoppingList();
    
    // Set up visibility change detection
    let intervalId: NodeJS.Timeout | null = null;
    let isPolling = false;
    
    const startPolling = () => {
      if (!isPolling) {
        intervalId = setInterval(loadShoppingList, 3000);
        isPolling = true;
      }
    };
    
    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        isPolling = false;
      }
    };
    
    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is not visible, start polling
        startPolling();
      } else {
        // Tab is visible, stop polling but do one refresh
        stopPolling();
        loadShoppingList(); // Refresh once when becoming visible
      }
    };
    
    // Set initial polling state based on visibility
    if (document.hidden) {
      startPolling();
    }
    
    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup function to clear interval and event listener when component unmounts
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [recipeId]);
  
  // Pre-check ingredients that are already in shopping list
  useEffect(() => {
    if (!shoppingListLoaded || !recipeId) return;
    
    const newCheckedItems: Record<number, boolean> = {...checkedItems};
    let hasChanges = false;
    
    // Check each ingredient to see if it's already in the shopping list
    list.items.forEach((item, index) => {
      const rawName: any = (item as any).name;
      const rawQty: any = (item as any).quantity;
      const name = typeof rawName === 'string' ? rawName.trim() : '';
      const qty = typeof rawQty === 'string' ? rawQty.trim() : '';
      
      if (!name) return; // Skip group headers or empty rows
      
      // Format the ingredient name with quantity if available
      const formattedName = qty ? `${qty} ${name}`.trim() : name;
      
      // Check if this ingredient is in the shopping list
      const shoppingListItem = shoppingListItems[formattedName];
      
      if (shoppingListItem) {
        // Only check the box if the item exists in the shopping list and is not marked as purchased
        if (!shoppingListItem.checked) {
          if (newCheckedItems[index] !== true) {
            newCheckedItems[index] = true;
            hasChanges = true;
          }
        } else {
          // If the item is marked as purchased, show it with a dash (unchecked)
          if (newCheckedItems[index] !== false) {
            newCheckedItems[index] = false;
            hasChanges = true;
          }
        }
      } else {
        // If item is not in the shopping list at all, make sure it's unchecked
        if (newCheckedItems[index]) {
          newCheckedItems[index] = false;
          hasChanges = true;
        }
      }
    });
    
    // Update checked items if any changes were detected
    if (hasChanges) {
      setCheckedItems(newCheckedItems);
    }
  }, [shoppingListLoaded, shoppingListItems, list.items, recipeId, checkedItems]);
  
  // Save checked items to localStorage whenever they change
  useEffect(() => {
    if (!recipeId) return;
    
    try {
      localStorage.setItem(`recipe_${recipeId}_checked_ingredients`, JSON.stringify(checkedItems));
    } catch (error) {
      // Error handling for localStorage
    }
  }, [checkedItems, recipeId]);
  
  // Calculate number of checked items and total selectable items
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const selectableItems = list.items.filter((it) => {
    const rawName: any = (it as any).name;
    const rawQty: any = (it as any).quantity;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    const qty = typeof rawQty === 'string' ? rawQty.trim() : '';
    return name && !((!name && !!qty) || (!name && !qty)); // Not a group header or empty row
  }).length;
  
  // Helper function to get formatted name for an ingredient
  const getFormattedIngredientName = (index: number) => {
    const item = list.items[index];
    if (!item) return '';
    
    const rawName: any = (item as any).name;
    const rawQty: any = (item as any).quantity;
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    const qty = typeof rawQty === 'string' ? rawQty.trim() : '';
    
    if (!name) return ''; // Skip group headers
    
    return qty ? `${qty} ${name}`.trim() : name;
  };

  // Add individual ingredient to shopping list
  const addIngredientToShoppingList = async (index: number) => {
    if (!recipeId) return;
    
    const formattedName = getFormattedIngredientName(index);
    if (!formattedName) return;
    
    try {
      // Check if this item is already in the shopping list
      if (shoppingListItems[formattedName]) {
        return;
      }
      
      // Create the ingredient item for the API
      const ingredientToAdd = {
        name: formattedName,
        recipeId: recipeId || '',
        recipeTitle,
        checked: false
      };
      
      // Add to shopping list
      const result = await addToShoppingList([ingredientToAdd]);
      // Get the item ID from the result if available
      let itemId = '';
      if (result && result.items && Array.isArray(result.items)) {
        const addedItem = result.items.find((i: any) => 
          (i.name === formattedName || i.ingredient === formattedName) && 
          (i.recipeId === recipeId || i.recipe_id === recipeId)
        );
        if (addedItem) {
          itemId = addedItem._id || addedItem.item_id || '';
        }
      }
      
      // If we couldn't find the ID, reload the shopping list to get updated state
      if (!itemId) {
        const refreshedList = await getShoppingList();
        if (refreshedList && refreshedList.items && Array.isArray(refreshedList.items)) {
          const addedItem = refreshedList.items.find((i: any) => 
            (i.name === formattedName || i.ingredient === formattedName) && 
            (i.recipeId === recipeId || i.recipe_id === recipeId)
          );
          if (addedItem) {
            itemId = addedItem._id || addedItem.item_id || '';
          }
        }
      }
      
      // Update our local record of what's in the shopping list
      setShoppingListItems(prev => ({
        ...prev,
        [formattedName]: {
          id: itemId,
          name: formattedName,
          checked: false // New items are not checked initially
        }
      }));
      
      showToast('Added to shopping list', 'success', 2000);
    } catch (error) {
      console.error('Error adding item to shopping list:', error);
      throw error; // Re-throw so the parent handler can handle it
    }
  };
  
  // Remove individual ingredient from shopping list
  const removeIngredientFromShoppingList = async (index: number) => {
    if (!recipeId) return;
    
    const formattedName = getFormattedIngredientName(index);
    if (!formattedName) return;
    
    // Check if we have this item in our shopping list items map
    if (!shoppingListItems[formattedName] || !shoppingListItems[formattedName].id) {
      return;
    }
    
    try {
      const itemId = shoppingListItems[formattedName].id;

      
      // Remove from our local record immediately (optimistic update)
      const updatedItems = {...shoppingListItems};
      delete updatedItems[formattedName];
      setShoppingListItems(updatedItems);
      
      // Then send the delete request to the API
      await deleteShoppingListItem(itemId);
      
      showToast('Removed from shopping list', 'success', 2000);
    } catch (error) {
      // Error handling for removing item
      
      // Restore the item in our local record if the API call fails
      if (shoppingListItems[formattedName]) {
        setShoppingListItems(prev => ({
          ...prev,
          [formattedName]: shoppingListItems[formattedName]
        }));
      }
      
      throw error; // Re-throw so the parent handler can handle it
    }
  };
  
  // Track pending operations to avoid race conditions
  const [pendingOperations, setPendingOperations] = useState<{[key: number]: boolean}>({});

  // Toggle ingredient in shopping list when checkbox is clicked
  const handleToggleCheck = (index: number) => {
    // Prevent multiple rapid clicks on the same item
    if (pendingOperations[index] || isModifyingList) return;
    
    // Mark this specific item as pending
    setPendingOperations(prev => ({
      ...prev,
      [index]: true
    }));
    
    // Get the formatted name for this ingredient
    const formattedName = getFormattedIngredientName(index);
    
    // Check if item is already in shopping list
    const existingItem = shoppingListItems[formattedName];
    
    // Determine what operation needs to be performed
    let newChecked = !checkedItems[index];
    let operation: 'add' | 'remove' | 'update' = newChecked ? 'add' : 'remove';
    
    // If item is in shopping list but marked as purchased, we should just remove it
    if (existingItem && existingItem.checked) {
      operation = 'remove';
      newChecked = false; // Keep checkbox unchecked for purchased items
    }
    
    // Update checked state immediately for UI responsiveness
    setCheckedItems(prev => ({
      ...prev,
      [index]: newChecked
    }));
    
    // Set global modifying state to show loading indicators
    setIsModifyingList(true);
    
    // Use a timeout to delay the API call slightly for better visual feedback
    setTimeout(() => {
      // Create a closure to handle the async operation
      const performOperation = async () => {
        try {
          // Sync with shopping list based on determined operation
          if (operation === 'add') {
            await addIngredientToShoppingList(index);
          } else if (operation === 'remove') {
            await removeIngredientFromShoppingList(index);
          }
        } catch (error) {
          // Error handling
          
          // Revert the checkbox state on error
          setCheckedItems(prev => ({
            ...prev,
            [index]: !newChecked // Toggle back to previous state
          }));
          
          showToast('Failed to update shopping list', 'error', 3000);
        } finally {
          // Clear the pending state for this specific item
          setPendingOperations(prev => {
            const updated = {...prev};
            delete updated[index];
            return updated;
          });
          
          // Re-enable further clicks if no other operations are pending
          setTimeout(() => {
            setIsModifyingList(false);
          }, 100); // Small delay to ensure UI updates properly
        }
      };
      
      // Execute the operation
      performOperation();
    }, 50); // Small delay for better visual feedback
  };

  // Add all ingredients to shopping list
  const handleSelectAll = async () => {
    setIsModifyingList(true);
    
    try {
      // First update all checkboxes for immediate UI feedback
      const allChecked: Record<number, boolean> = {};
      const itemsToAdd: {index: number, formattedName: string}[] = [];
      
      list.items.forEach((item, index) => {
        const rawName: any = (item as any).name;
        const rawQty: any = (item as any).quantity;
        const name = typeof rawName === 'string' ? rawName.trim() : '';
        const qty = typeof rawQty === 'string' ? rawQty.trim() : '';
        
        // Only select actual ingredients, not group headers
        if (name && !(!name && !!qty)) {
          allChecked[index] = true;
          
          const formattedName = qty ? `${qty} ${name}`.trim() : name;
          
          // Only add if not already in the shopping list
          if (!shoppingListItems[formattedName]) {
            itemsToAdd.push({ index, formattedName });
          }
        }
      });
      
      // Update checked items state
      setCheckedItems(allChecked);
      
      // If there are items to add to the shopping list
      if (itemsToAdd.length > 0) {
        // Create the API payload for ingredients to add
        const ingredients = itemsToAdd.map(item => ({
          name: item.formattedName,
          recipeId: recipeId || '',
          recipeTitle,
          checked: false
        }));
        
        // Add to shopping list
        await addToShoppingList(ingredients);
        
        // Refresh shopping list to get updated state with new IDs
        const refreshedList = await getShoppingList();
        if (refreshedList && refreshedList.items && Array.isArray(refreshedList.items)) {
          const updatedItems = {...shoppingListItems};
          
          // Update our local shopping list items record
          itemsToAdd.forEach(item => {
            const addedItem = refreshedList.items.find((i: any) => 
              (i.name === item.formattedName || i.ingredient === item.formattedName) && 
              (i.recipeId === recipeId || i.recipe_id === recipeId)
            );
            
            if (addedItem) {
              updatedItems[item.formattedName] = {
                id: addedItem._id || addedItem.item_id || '',
                name: item.formattedName,
                checked: addedItem.checked || false
              };
            }
          });
          
          setShoppingListItems(updatedItems);
        }
        
        showToast(`Added ${itemsToAdd.length} items to shopping list`, 'success', 3000);
      }
    } catch (error) {
      // Error handling
      showToast('Failed to add items to shopping list', 'error', 3000);
    } finally {
      setIsModifyingList(false);
    }
  };

  // Remove all ingredients from shopping list
  const handleClearAll = async () => {
    setIsModifyingList(true);
    
    try {
      // Get all checked items that need to be removed from the shopping list
      const itemsToRemove: {index: number, formattedName: string}[] = [];
      
      list.items.forEach((item, index) => {
        if (checkedItems[index]) {
          const rawName: any = (item as any).name;
          const rawQty: any = (item as any).quantity;
          const name = typeof rawName === 'string' ? rawName.trim() : '';
          const qty = typeof rawQty === 'string' ? rawQty.trim() : '';
          
          if (name) {
            const formattedName = qty ? `${qty} ${name}`.trim() : name;
            
            if (shoppingListItems[formattedName] && shoppingListItems[formattedName].id) {
              itemsToRemove.push({ 
                index, 
                formattedName 
              });
            }
          }
        }
      });
      
      // Clear checked items immediately for UI feedback
      setCheckedItems({});
      
      // Remove each item from the shopping list
      const deletePromises = itemsToRemove.map(async (item) => {
        const itemId = shoppingListItems[item.formattedName].id;
        
        try {
          await deleteShoppingListItem(itemId);
          return { success: true, item };
        } catch (error) {
          // Error handling
          return { success: false, item };
        }
      });
      
      const results = await Promise.all(deletePromises);
      
      // Update our local shopping list items state
      const updatedItems = {...shoppingListItems};
      results.forEach(result => {
        if (result.success) {
          delete updatedItems[result.item.formattedName];
        }
      });
      setShoppingListItems(updatedItems);
      
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        showToast(`Removed ${successCount} items from shopping list`, 'success', 3000);
      }
    } catch (error) {
      // Error handling
      showToast('Failed to clear items from shopping list', 'error', 3000);
    } finally {
      setIsModifyingList(false);
    }
  };

  return (
    <div className="section-block">
      <h2>Ingredients</h2>
      
      <div className="ingredient-buttons-container">
        <div className="ingredient-buttons-group">
          <button 
            className="ingredient-button"
            onClick={() => handleSelectAll()}
            disabled={selectableItems === 0 || isModifyingList}
            title="Select all ingredients"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Select All</span>
          </button>
          <button 
            className="ingredient-button"
            onClick={() => handleClearAll()}
            disabled={checkedCount === 0 || isModifyingList}
            title="Clear all selections"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
            </svg>
            <span>Clear All</span>
          </button>
          <button 
            className="ingredient-button"
            onClick={() => navigate('/shopping-list')}
            title="Go to shopping list page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
            <span>Go to List</span>
          </button>
        </div>
      </div>
      
      <ul className="ingredients-list">
        {list.items.map((it, ii) => {
          const rawName: any = (it as any).name;
          const rawQty: any = (it as any).quantity;
          const name = typeof rawName === 'string' ? rawName.trim() : '';
          const qty = typeof rawQty === 'string' ? rawQty.trim() : '';
          const isGroup = !name && !!qty; // quantity used as group label when name blank
          
          if (isGroup) {
            return (
              <li
                key={ii}
                style={{
                  listStyle: 'none',
                  paddingLeft: 0,
                  fontWeight: 700,
                  marginTop: ii === 0 ? 0 : '0.75rem',
                }}
                className="ingredient-group-label"
              >
                <span
                  style={{
                    fontSize: '.9rem',
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    color: '#334155',
                  }}
                >
                  {qty}
                </span>
              </li>
            );
          }
          
          if (!name && !qty) return null; // skip completely empty rows just in case
          
          // Check if this ingredient is in shopping list and marked as purchased
          const formattedName = qty ? `${qty} ${name}`.trim() : name;
          const shoppingListItem = shoppingListItems[formattedName];
          const isPurchased = shoppingListItem && shoppingListItem.checked;
          
          return (
            <li key={ii} className={`ingredient-item ${isPurchased ? 'purchased' : ''}`}>
              <div className="ingredient-checkbox-container">
                <input
                  type="checkbox"
                  id={`ingredient-${ii}`}
                  checked={!!checkedItems[ii]}
                  onChange={() => handleToggleCheck(ii)}
                  className={`ingredient-checkbox ${pendingOperations[ii] ? 'updating' : ''} ${isPurchased ? 'purchased' : ''}`}
                  disabled={pendingOperations[ii]}
                />
                <label htmlFor={`ingredient-${ii}`} className={`ingredient-label ${isPurchased ? 'purchased-label' : ''}`}>
                  <span className="ingredient-quantity">{qty}</span>
                  {name}
                </label>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
