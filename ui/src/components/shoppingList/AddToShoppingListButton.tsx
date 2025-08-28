import React, { useState } from 'react';
import { addToShoppingList } from '../../utils/api';

interface AddToShoppingListButtonProps {
  recipeId: string;
  recipeTitle: string;
  ingredients: Array<{
    name: string;
    amount?: string;
    unit?: string;
  }>;
  onSuccess?: () => void;
  autoAdd?: boolean; // If true, skip the selector and add all ingredients immediately
}

const AddToShoppingListButton: React.FC<AddToShoppingListButtonProps> = ({
  recipeId,
  recipeTitle,
  ingredients,
  onSuccess,
  autoAdd = false
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Record<number, boolean>>({});
  const [showSelector, setShowSelector] = useState(false);

  const toggleIngredient = (index: number) => {
    setSelectedIngredients(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const selectAll = () => {
    const newSelected: Record<number, boolean> = {};
    ingredients.forEach((_, index) => {
      newSelected[index] = true;
    });
    setSelectedIngredients(newSelected);
  };

  const clearSelection = () => {
    setSelectedIngredients({});
  };

  const handleAddToShoppingList = async () => {
    let selectedItems;
    
    if (autoAdd) {
      // If autoAdd is true, add all ingredients
      selectedItems = ingredients.map((ingredient) => {
        const formattedName = ingredient.amount 
          ? `${ingredient.amount} ${ingredient.unit || ''} ${ingredient.name}`.trim()
          : ingredient.name;
        
        return {
          name: formattedName,
          recipeId,
          recipeTitle,
          checked: false,
          amount: ingredient.amount,
          unit: ingredient.unit
        };
      });
    } else {
      // Otherwise use the selected ingredients
      selectedItems = Object.entries(selectedIngredients)
        .filter(([_, isSelected]) => isSelected)
        .map(([indexStr]) => {
          const index = parseInt(indexStr, 10);
          const ingredient = ingredients[index];
          // Format the ingredient name with quantity and unit if available
          const formattedName = ingredient.amount 
            ? `${ingredient.amount} ${ingredient.unit || ''} ${ingredient.name}`.trim()
            : ingredient.name;
          
          return {
            name: formattedName,
            recipeId,
            recipeTitle,
            checked: false,
            amount: ingredient.amount,
            unit: ingredient.unit
          };
        });
    }

    console.log('Selected ingredients to add:', selectedItems);
    console.log('Recipe ID:', recipeId);
    console.log('Recipe Title:', recipeTitle);

    if (selectedItems.length === 0) {
      console.warn('No items selected to add to shopping list');
      return;
    }

    setLoading(true);
    try {
      console.log('[AddToShoppingList] Calling API with:', selectedItems);
      const result = await addToShoppingList(selectedItems);
      console.log('[AddToShoppingList] API response:', result);
      
      setShowSelector(false);
      setSelectedIngredients({});
      if (onSuccess) {
        onSuccess();
      }
      // Show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out';
      toast.textContent = `${selectedItems.length} items added to shopping list`;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('animate-fade-out');
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    } catch (error) {
      console.error('Error adding items to shopping list:', error);
      // Show error toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out';
      toast.textContent = 'Failed to add items to shopping list';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('animate-fade-out');
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  // Handle auto-add if enabled
  React.useEffect(() => {
    if (autoAdd && ingredients.length > 0) {
      handleAddToShoppingList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdd, ingredients]);
  
  return (
    <div className="relative">
      {!showSelector ? (
        <button
          onClick={autoAdd ? handleAddToShoppingList : () => setShowSelector(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            className="text-white"
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
          Add to Shopping List
        </button>
      ) : (
        <div className="border rounded-md p-4 bg-white shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium">Add ingredients to shopping list</h3>
            <button
              onClick={() => setShowSelector(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto mb-3">
            {ingredients.map((ingredient, index) => (
              <div 
                key={`${ingredient.name}-${index}`}
                className="flex items-center mb-2"
              >
                <input
                  type="checkbox"
                  id={`ingredient-${index}`}
                  checked={!!selectedIngredients[index]}
                  onChange={() => toggleIngredient(index)}
                  className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label 
                  htmlFor={`ingredient-${index}`}
                  className="text-sm text-gray-800"
                >
                  {ingredient.amount && (
                    <span className="font-medium">{ingredient.amount} {ingredient.unit} </span>
                  )}
                  {ingredient.name}
                </label>
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-2">
            <div className="space-x-2">
              <button 
                onClick={selectAll}
                className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Select All
              </button>
              <button 
                onClick={clearSelection}
                className="px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
            <button
              onClick={handleAddToShoppingList}
              disabled={loading || Object.values(selectedIngredients).filter(Boolean).length === 0}
              className={`px-3 py-1 text-sm font-medium text-white rounded ${
                loading || Object.values(selectedIngredients).filter(Boolean).length === 0
                  ? 'bg-blue-300'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Adding...' : 'Add Selected'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddToShoppingListButton;
