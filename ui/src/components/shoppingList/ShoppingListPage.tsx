import React, { useState } from 'react';
import { useShoppingList } from './useShoppingList';
import { useIngredientCategories } from './useIngredientCategories';
import { useNavigate } from 'react-router-dom';
import type { ShoppingListItem } from './useShoppingList';
import { 
  Chip, 
  SegmentedControl,
  ConfirmModal 
} from './components';
import { 
  PlusCircle, 
  ShoppingCart, 
  LayoutGrid, 
  Trash2, 
  Printer, 
  Download,
  CheckCircle
} from 'lucide-react';
import './ShoppingListPage.css';
import './PrintStyles.css';

const ShoppingListPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'recipe' | 'category'>('recipe');
  const [searchText, setSearchText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState<'all' | 'purchased' | null>(null);
  
  const { 
    shoppingList, 
    loading, 
    error, 
    getItemsByRecipe,
    toggleItemChecked,
    clearList
  } = useShoppingList();
  
  // Always call hooks at the top level, before any conditional returns
  const itemsByRecipe = getItemsByRecipe();
  const { 
    categories: categorizedItems, 
    isAiCategorized 
  } = useIngredientCategories(shoppingList?.items || []);
  
  // Check if any items are selected/checked
  const hasCheckedItems = shoppingList?.items?.some(item => item.checked) || false;
  const purchasedCount = shoppingList?.items?.filter(item => item.checked).length || 0;
  
  // Create a separate list of purchased items
  const purchasedItems = shoppingList?.items?.filter(item => item.checked) || [];

  if (loading) {
    return (
      <div className="shopping-list-page">
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading your shopping list...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shopping-list-page">
        <div className="shopping-list-header">
          <div className="back-button-container">
            <button 
              className="back-to-recipes-button"
              onClick={() => navigate('/')}
              aria-label="Back to recipes list"
            >
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span>Back to Recipes</span>
            </button>
          </div>
          <h1 className="shopping-list-title">Shopping List</h1>
          <p className="shopping-list-subtitle">Plan your grocery trips with ease</p>
        </div>
        
        <div className="error-state">
          <h3 className="error-title">Error loading shopping list</h3>
          <p className="error-message">{error.message}</p>
          <button 
            className="shopping-list-button btn-primary"
            onClick={() => window.location.reload()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!shoppingList || !shoppingList.items || shoppingList.items.length === 0) {
    return (
      <div className="shopping-list-page">
        <div className="shopping-list-header">
          <div className="back-button-container">
            <button 
              className="back-to-recipes-button"
              onClick={() => navigate('/')}
              aria-label="Back to recipes list"
            >
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span>Back to Recipes</span>
            </button>
          </div>
          <h1 className="shopping-list-title">Shopping List</h1>
          <p className="shopping-list-subtitle">Plan your grocery trips with ease</p>
        </div>
        
        <div className="empty-state">
          <div className="empty-icon">
            <svg 
              width="32" 
              height="32" 
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
          </div>
          <h2 className="empty-title">Your shopping list is empty</h2>
          <p className="empty-description">
            Browse your favorite recipes and select ingredients to add them to your shopping list
          </p>
          <button
            className="shopping-list-button btn-primary"
            onClick={() => window.history.back()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Browse Recipes
          </button>
        </div>
      </div>
    );
  }

  // Handle clear actions with confirmation
  const handleClearAll = () => {
    setShowConfirmModal('all'); // Show confirmation for clear all
  };

  const handleClearPurchased = () => {
    // Execute directly without confirmation - now uses a single API call
    clearList('delete_purchased')
      .catch(err => {
        console.error("Error clearing purchased items:", err);
      });
  };

  const confirmClear = () => {
    if (showConfirmModal === 'all') {
      clearList('delete').catch(err => {
        console.error("Error clearing shopping list:", err);
      });
    }
    setShowConfirmModal(null);
  };

  // Handle print functionality
  const handlePrint = () => {
    window.print();
  };

  // Segmented control options
  const viewOptions = [
    { 
      value: 'recipe', 
      label: 'By Recipe', 
      icon: <ShoppingCart className="w-4 h-4" />
    },
    { 
      value: 'category', 
      label: 'By Category', 
      icon: <LayoutGrid className="w-4 h-4" />,
      isAI: isAiCategorized
    }
  ];

  return (
    <div className="shopping-list-page">
      <div className="shopping-list-header">
        <div className="back-button-container">
          <button 
            className="back-to-recipes-button"
            onClick={() => navigate('/')}
            aria-label="Back to recipes list"
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span>Back to Recipes</span>
          </button>
        </div>
        <h1 className="shopping-list-title">Shopping List</h1>
        <p className="shopping-list-subtitle">Organize your ingredients efficiently</p>
      </div>
      
      {/* New sticky control bar */}
      <div className="shopping-list-control-bar">
        <div className="control-bar-grid">
          {/* Left zone: Add item text + button */}
          <div className="control-bar-left">
            <div className="flex items-center w-full max-w-sm">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Add new item..."
                  className="block w-full px-5 py-3.5 text-[15.2px] text-slate-700 bg-white border-2 border-blue-500 rounded-l-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-sans"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif' }}
                />
              </div>
              
              <button 
                className="flex items-center gap-1.5 px-5 py-3.5 text-[15.2px] font-medium text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 border-2 border-blue-600 rounded-r-lg shadow-md"
                onClick={() => alert('Add item functionality coming soon')}
                style={{ fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif' }}
              >
                <PlusCircle className="w-5 h-5" />
                Add
              </button>
            </div>
          </div>
          
          {/* Center zone: Segmented control */}
          <div className="control-bar-center">
            <SegmentedControl
              options={viewOptions}
              value={viewMode}
              onChange={(value) => setViewMode(value as 'recipe' | 'category')}
              fullWidth={window.innerWidth < 768}
            />
          </div>
          
          {/* Right zone: Global actions */}
          <div className="control-bar-right">
            <div className="flex items-center gap-3">
              <button
                onClick={() => alert('Export functionality coming soon')}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 border-2 border-blue-600 rounded-lg shadow-md"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 border-2 border-blue-600 rounded-lg shadow-md"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg shadow-md"
                style={{
                  background: 'linear-gradient(to bottom right, #e11d48, #be123c)',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: '#be123c',
                  boxShadow: '0 3px 6px rgba(190, 18, 60, 0.3)',
                  textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)',
                  color: '#ffffff',
                  fontWeight: '600',
                  letterSpacing: '0.01em'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'linear-gradient(to bottom right, #be123c, #9f1239)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'linear-gradient(to bottom right, #e11d48, #be123c)'}
                disabled={loading || shoppingList?.items?.length === 0}
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span style={{ color: 'white' }}>Clear All</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="shopping-list-content">
        {/* Regular Unpurchased Items First */}
        {viewMode === 'recipe' ? (
          // Recipe View - Show only unchecked items
          Object.entries(itemsByRecipe).map(([recipeId, allItems]) => {
            // Filter out checked items since they're now in the purchased section
            const items = allItems.filter(item => !item.checked);
            
            // Skip if no unchecked items in this recipe
            if (items.length === 0) return null;
            
            const recipeName = items[0].recipeTitle || 'Other Items';
            
            return (
              <div key={recipeId} className="recipe-group">
                <div className="recipe-group-header">
                  <div 
                    className="recipe-link"
                    onClick={() => navigate(`/recipe/${recipeId}`)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18" />
                    </svg>
                    <span className="recipe-title-text">{recipeName}</span>
                  </div>
                  <span className="recipe-group-item-count">{items.length}</span>
                </div>
                <ul className="recipe-group-list">
                  {items.map(item => (
                    <ShoppingListItemRow
                      key={item._id}
                      item={item}
                      onToggleChecked={toggleItemChecked}
                    />
                  ))}
                </ul>
              </div>
            );
          })
        ) : (
          // Category View - Show only unchecked items
          Object.entries(categorizedItems).map(([categoryKey, category]) => {
            // Filter out checked items since they're now in the purchased section
            const items = category.items.filter(item => !item.checked);
            
            // Skip if no unchecked items in this category
            if (items.length === 0) return null;
            
            return (
              <div key={categoryKey} className="recipe-group">
                <div className="recipe-group-header category-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {category.icon}
                    <span className="recipe-title-text">{category.name}</span>
                  </div>
                  <span className="recipe-group-item-count">{items.length}</span>
                </div>
                <ul className="recipe-group-list">
                  {items.map(item => (
                    <ShoppingListItemRow
                      key={item._id}
                      item={item}
                      onToggleChecked={toggleItemChecked}
                      showRecipeTitle={true}
                    />
                  ))}
                </ul>
              </div>
            );
          })
        )}
        
        
        {/* Purchased Items Section - Only show if there are checked items */}
        {hasCheckedItems && (
          <div className="purchased-items-group">
            <div className="purchased-items-header">
              <h2 className="text-lg font-medium text-gray-800">Purchased Items</h2>
              
              <button
                onClick={handleClearPurchased}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg shadow-md"
                style={{
                  background: 'linear-gradient(to bottom right, #e11d48, #be123c)',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: '#be123c',
                  boxShadow: '0 3px 6px rgba(190, 18, 60, 0.3)',
                  textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)',
                  color: '#ffffff',
                  fontWeight: '600',
                  letterSpacing: '0.01em'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'linear-gradient(to bottom right, #be123c, #9f1239)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'linear-gradient(to bottom right, #e11d48, #be123c)'}
                disabled={loading || !hasCheckedItems}
              >
                <Trash2 className="w-4 h-4 text-white" />
                <div className="flex items-center">
                  <span style={{ color: 'white' }}>Clear Purchased&nbsp;&nbsp;</span>
                  {purchasedCount > 0 && (
                    <span className="bg-white/30 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      ({purchasedCount})
                    </span>
                  )}
                </div>
              </button>
            </div>
            
            <div className="recipe-group purchased-items-container">
              <div className="recipe-group-header purchased-header">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="recipe-title-text">Purchased Items</span>
                </div>
                <Chip count={purchasedItems.length} />
              </div>
              <ul className="recipe-group-list">
                {purchasedItems.map(item => (
                  <ShoppingListItemRow
                    key={item._id}
                    item={item}
                    onToggleChecked={toggleItemChecked}
                    showRecipeTitle={true}
                  />
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {/* Confirmation Modal - Only for Clear All */}
        <ConfirmModal
          isOpen={showConfirmModal === 'all'}
          title="Clear All Items?"
          message="Are you sure you want to clear all items from your shopping list? This action cannot be undone."
          confirmText="Clear All"
          onConfirm={confirmClear}
          onCancel={() => setShowConfirmModal(null)}
          variant="danger"
        />
      </div>
    </div>
  );
};

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
  onToggleChecked: (id: string, checked: boolean) => void;
  showRecipeTitle?: boolean;
}

const ShoppingListItemRow: React.FC<ShoppingListItemRowProps> = ({ 
  item, 
  onToggleChecked,
  showRecipeTitle = false
}) => {
  return (
    <li className={`recipe-group-item ${item.checked ? 'item-checked' : ''}`}>
      <div className="item-content">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={() => onToggleChecked(item._id, !item.checked)}
          className="item-checkbox"
          aria-label={`Mark ${item.name || item.ingredient} as ${item.checked ? 'unpurchased' : 'purchased'}`}
        />
        <div className="item-text">
          <span className="item-name">
            {item.name || item.ingredient || '[No Name]'}
          </span>
          {showRecipeTitle && item.recipeTitle && (
            <span className="item-recipe-title">
              from {item.recipeTitle}
            </span>
          )}
        </div>
      </div>
    </li>
  );
};

export default ShoppingListPage;
