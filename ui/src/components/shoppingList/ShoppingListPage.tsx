import React from 'react';
import { useShoppingList } from './useShoppingList';
import type { ShoppingListItem } from './useShoppingList';

const ShoppingListPage: React.FC = () => {
  const { 
    shoppingList, 
    loading, 
    error, 
    getItemsByRecipe,
    toggleItemChecked,
    deleteItem,
    clearList
  } = useShoppingList();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading shopping list...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md my-4">
        <h3 className="text-red-800 font-medium">Error loading shopping list</h3>
        <p className="text-red-600">{error.message}</p>
        <button 
          className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  // We no longer need to get the currentUserId since we removed the debug display
  
  if (!shoppingList || !shoppingList.items || shoppingList.items.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Shopping List</h1>
        <div className="text-center p-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-gray-200 rounded-full p-4">
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              className="text-gray-600"
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
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">Your shopping list is empty</h2>
          <p className="text-gray-600 mb-8 max-w-sm mx-auto">
            Select ingredients from your favorite recipes to add them to your shopping list
          </p>
          {/* No debugging info needed in production */}
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-md font-medium"
            onClick={() => window.history.back()}
          >
            Browse Recipes
          </button>
        </div>
      </div>
    );
  }

  const itemsByRecipe = getItemsByRecipe();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Shopping List</h1>
        <div className="space-x-2">
          <button
            onClick={() => clearList('check')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={loading}
          >
            Mark All Complete
          </button>
          <button
            onClick={() => clearList('delete')}
            className="px-4 py-2 text-red-700 bg-red-100 rounded-md hover:bg-red-200"
            disabled={loading}
          >
            Clear List
          </button>
        </div>
      </div>

      {Object.entries(itemsByRecipe).map(([recipeId, items]) => {
        const recipeName = items[0].recipeTitle || 'Other Items';
        
        return (
          <div key={recipeId} className="mb-8">
            <h2 className="text-xl font-semibold mb-3 pb-2 border-b border-gray-200">
              {recipeName}
            </h2>
            <ul className="space-y-2">
              {items.map(item => (
                <ShoppingListItemRow
                  key={item._id}
                  item={item}
                  onToggleChecked={toggleItemChecked}
                  onDelete={deleteItem}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
  onToggleChecked: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}

const ShoppingListItemRow: React.FC<ShoppingListItemRowProps> = ({ 
  item, 
  onToggleChecked,
  onDelete 
}) => {
  return (
    <li className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => onToggleChecked(item._id, !item.checked)}
          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
        />
        <span className={`${item.checked ? 'line-through text-gray-500' : 'text-gray-800'}`}>
          {item.name || item.ingredient || '[No Name]'}
        </span>
      </div>
      <button
        onClick={() => onDelete(item._id)}
        className="text-gray-400 hover:text-red-600"
        aria-label="Delete item"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>
    </li>
  );
};

export default ShoppingListPage;
