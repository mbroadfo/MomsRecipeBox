import React, { useState, useCallback, useEffect } from 'react';
import type { IngredientGroup } from '../hooks/useWorkingRecipe';
import { useNavigate } from 'react-router-dom';
import { addToShoppingList } from '../../../utils/api';
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
  
  // Initialize checked items from localStorage if available
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(() => {
    if (!recipeId) return {};
    
    try {
      const savedItems = localStorage.getItem(`recipe_${recipeId}_checked_ingredients`);
      return savedItems ? JSON.parse(savedItems) : {};
    } catch (error) {
      console.error("Error loading checked ingredients from localStorage:", error);
      return {};
    }
  });
  
  // Save checked items to localStorage whenever they change
  useEffect(() => {
    if (!recipeId) return;
    
    try {
      localStorage.setItem(`recipe_${recipeId}_checked_ingredients`, JSON.stringify(checkedItems));
    } catch (error) {
      console.error("Error saving checked ingredients to localStorage:", error);
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
  
  const handleToggleCheck = useCallback((index: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  const handleSelectAll = useCallback(() => {
    const allChecked: Record<number, boolean> = {};
    list.items.forEach((item, index) => {
      const rawName: any = (item as any).name;
      const rawQty: any = (item as any).quantity;
      const name = typeof rawName === 'string' ? rawName.trim() : '';
      const qty = typeof rawQty === 'string' ? rawQty.trim() : '';
      // Only select actual ingredients, not group headers
      if (name && !(!name && !!qty)) {
        allChecked[index] = true;
      }
    });
    setCheckedItems(allChecked);
  }, [list.items]);

  const handleClearAll = useCallback(() => {
    setCheckedItems({});
  }, []);

  const handleAddToShoppingList = useCallback(async () => {
    // Convert checked ingredients to the format expected by the API
    const selectedIngredients = list.items
      .filter((_, index) => checkedItems[index])
      .map((item) => {
        const rawName: any = (item as any).name;
        const rawQty: any = (item as any).quantity;
        const name = typeof rawName === 'string' ? rawName.trim() : '';
        const qty = typeof rawQty === 'string' ? rawQty.trim() : '';
        
        // Format the ingredient name with quantity if available
        const formattedName = qty ? `${qty} ${name}`.trim() : name;
        
        return {
          name: formattedName,
          recipeId: recipeId || '',
          recipeTitle,
          checked: false
        };
      });
    
    // Directly add to shopping list if we have ingredients
    if (selectedIngredients.length > 0) {
      console.log('[IngredientsView] Adding to shopping list:', selectedIngredients);
      setIsAddingToList(true);
      try {
        const result = await addToShoppingList(selectedIngredients);
        console.log('[IngredientsView] Shopping list API result:', result);
        
        // Use the new toast function with string literals
        showToast(`${selectedIngredients.length} items added to shopping list`, 'success', 3000);
        
        // Clear checked items after successfully adding to shopping list
        setCheckedItems({});
      } catch (error) {
        console.error('Error adding items to shopping list:', error);
        
        // Use the new toast function for errors with string literals
        showToast('Failed to add items to shopping list', 'error', 3000);
      } finally {
        setIsAddingToList(false);
      }
    }
  }, [checkedItems, list.items, recipeId, recipeTitle]);

  const handleGoToShoppingList = useCallback(() => {
    navigate('/shopping-list');
  }, [navigate]);
  
  // We'll use a loading state to disable the button during API calls
  const [isAddingToList, setIsAddingToList] = useState(false);

  return (
    <div className="section-block">
      <h2>Ingredients</h2>
      
      <div className="ingredient-buttons-container">
        <div className="ingredient-buttons-group">
          <button 
            className="ingredient-button"
            onClick={handleSelectAll}
            disabled={selectableItems === 0}
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
            onClick={handleClearAll}
            disabled={checkedCount === 0}
            title="Clear all selections"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
            </svg>
            <span>Clear All</span>
          </button>
          <button 
            className="ingredient-button primary"
            onClick={handleAddToShoppingList}
            disabled={checkedCount === 0 || isAddingToList}
            title="Add selected ingredients to shopping list"
          >
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <circle cx="8" cy="21" r="1"></circle>
              <circle cx="19" cy="21" r="1"></circle>
              <path d="M2 2h2l3.6 12h10.8l3.6-9H5.5"></path>
            </svg>
            <span>{isAddingToList ? 'Adding...' : `Add Selected ${checkedCount > 0 ? `(${checkedCount})` : ''}`}</span>
          </button>
          <button 
            className="ingredient-button"
            onClick={handleGoToShoppingList}
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
      
      {/* We now handle adding directly in the handleAddToShoppingList function */}
      
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
          
          return (
            <li key={ii} className="ingredient-item">
              <div className="ingredient-checkbox-container">
                <input
                  type="checkbox"
                  id={`ingredient-${ii}`}
                  checked={!!checkedItems[ii]}
                  onChange={() => handleToggleCheck(ii)}
                  className="ingredient-checkbox"
                />
                <label htmlFor={`ingredient-${ii}`} className="ingredient-label">
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
