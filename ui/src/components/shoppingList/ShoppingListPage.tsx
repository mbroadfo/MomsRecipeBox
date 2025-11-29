import React, { useState } from 'react';
import { useShoppingList } from './useShoppingList';
import { useIngredientCategories } from './useIngredientCategories';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { showToast, ToastType } from '../Toast';
import { usePageActions } from '../../contexts/PageActionsContext';
import type { ShoppingListItem } from './useShoppingList';
import { 
  Chip, 
  ConfirmModal 
} from './components';
import { 
  PlusCircle, 
  Trash2, 
  Printer, 
  CheckCircle
} from 'lucide-react';
import './ShoppingListPage.css';
import './PrintStyles.css';

const ShoppingListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { setActions, clearActions } = usePageActions();
  const [viewMode, setViewMode] = useState<'recipe' | 'category'>('recipe');
  const [searchText, setSearchText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState<'all' | 'purchased' | null>(null);
  
  const { 
    shoppingList, 
    loading, 
    error, 
    getItemsByRecipe,
    toggleItemChecked,
    clearList,
    addItems
  } = useShoppingList(isAuthenticated, authLoading);
  
  // Always call hooks at the top level, before any conditional returns
  const itemsByRecipe = getItemsByRecipe();
  const { 
    categories: categorizedItems, 
    isAiCategorized,
    categorizeWithAI,
    isLoading: aiCategorizing
  } = useIngredientCategories(shoppingList?.items || [], viewMode);
  
  // AI categorization is working perfectly!
  
  // Check if any items are selected/checked
  const hasCheckedItems = shoppingList?.items?.some(item => item.checked) || false;
  const purchasedCount = shoppingList?.items?.filter(item => item.checked).length || 0;
  
  // Create a separate list of purchased items
  const purchasedItems = shoppingList?.items?.filter(item => item.checked) || [];

  // Register page actions in header hamburger menu
  React.useEffect(() => {
    setActions([
      {
        id: 'print',
        label: 'Print List',
        icon: <Printer className="w-4 h-4" />,
        onClick: () => window.print(),
        disabled: false
      },
      {
        id: 'clear',
        label: 'Clear All',
        icon: <Trash2 className="w-4 h-4" />,
        onClick: () => setShowConfirmModal('all'),
        disabled: loading || shoppingList?.items?.length === 0,
        variant: 'danger' as const
      }
    ]);

    return () => clearActions();
  }, [setActions, clearActions, loading, shoppingList?.items?.length]);

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
        {/* Compact header with back button */}
        <div className="shopping-list-header-compact">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  console.log('Back button clicked - navigating to /');
                  window.location.href = '/';
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#334155',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 'normal'
                }}
                aria-label="Back to recipes"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <h1 className="shopping-list-title-compact" style={{ marginTop: '2px' }}>Shopping List</h1>
            </div>
          </div>
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
            onClick={() => {
              console.log('Browse Recipes button clicked - navigating to /');
              window.location.href = '/';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: '2px solid #1e40af',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              margin: '0 auto',
              boxShadow: '0 4px 6px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.2s ease'
            }}
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

  // Handle adding custom items directly from search input
  const handleAddItemFromSearch = async () => {
    if (!searchText.trim()) {
      showToast('Please enter an item to add', ToastType.Info);
      return;
    }

    try {
      await addItems([{
        name: searchText.trim(),
        recipeId: undefined,
        recipeTitle: 'Custom Item',
        checked: false
      }]);
      
      setSearchText('');
      showToast(`Added "${searchText.trim()}" to shopping list`, ToastType.Success);
    } catch (err) {
      console.error('Error adding item:', err);
      showToast('Failed to add item', ToastType.Error);
    }
  };

  // View mode options for the buttons

  return (
    <div className="shopping-list-page">
      {/* Compact header with title, view selector, and action buttons */}
      <div className="shopping-list-header-compact">
        <div className="flex items-center justify-between">
          {/* Left: Back button and title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                padding: '0.5rem',
                color: '#334155'
              }}
              aria-label="Back to recipes"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <h1 className="shopping-list-title-compact" style={{ marginTop: '2px' }}>Shopping List</h1>
            
            {/* View mode dropdown */}
            <select 
              value={viewMode}
              onChange={(e) => {
                const newMode = e.target.value as 'recipe' | 'category';
                setViewMode(newMode);
                if (newMode === 'category') {
                  categorizeWithAI();
                }
              }}
              className="px-3 py-1.5 text-sm font-medium border-2 border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: '#ffffff',
                color: '#334155'
              }}
            >
              <option value="recipe">By Recipe</option>
              <option value="category">By Category {isAiCategorized ? '(AI)' : ''}</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Compact search bar */}
      <div className="shopping-list-search-bar">
        <input
          type="text"
          placeholder="Type to add item and press Enter..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchText.trim()) {
              handleAddItemFromSearch();
            }
          }}
          className="flex-1 px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button 
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleAddItemFromSearch}
          disabled={!searchText.trim()}
        >
          <PlusCircle className="w-4 h-4" />
          Add
        </button>
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
        ) : aiCategorizing ? (
          // Loading state while AI is categorizing
          <div className="loading-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <div className="loader" style={{ margin: '0 auto 1rem' }}></div>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>AI is categorizing your items...</p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>This usually takes a few seconds</p>
          </div>
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
                title={`Clear ${purchasedCount} purchased item${purchasedCount !== 1 ? 's' : ''}`}
                aria-label={`Clear ${purchasedCount} purchased item${purchasedCount !== 1 ? 's' : ''}`}
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
