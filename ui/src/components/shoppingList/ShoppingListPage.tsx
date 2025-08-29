import React, { useState } from 'react';
import { useShoppingList } from './useShoppingList';
import { useIngredientCategories } from './useIngredientCategories';
import type { ShoppingListItem } from './useShoppingList';
import './ShoppingListPage.css';

const ShoppingListPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'recipe' | 'category'>('recipe');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  
  const { 
    shoppingList, 
    loading, 
    error, 
    getItemsByRecipe,
    toggleItemChecked,
    deleteItem,
    clearList
  } = useShoppingList();
  
  // Always call hooks at the top level, before any conditional returns
  const itemsByRecipe = getItemsByRecipe();
  
  // Use a separate state for triggering categorization
  const [triggerCategorization, setTriggerCategorization] = useState(0);
  
  // Call the ingredient categorization hook with current items and trigger counter
  // The hook will only fetch categories when the trigger counter changes
  const { 
    categories: categorizedItems, 
    isLoading: isCategorizing, 
    isAiCategorized 
  } = useIngredientCategories(shoppingList?.items || [], triggerCategorization);
  
  // Handle view mode change
  const handleViewModeChange = (mode: 'recipe' | 'category') => {
    setViewMode(mode);
    // If switching to category view, trigger categorization
    if (mode === 'category') {
      // Only trigger if we have items to categorize
      if (shoppingList?.items && shoppingList.items.length > 0) {
        setTriggerCategorization(prev => prev + 1);
      }
    }
  };

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
        <div className="shopping-list-header">
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

  return (
    <div className="shopping-list-page">
      <div className="shopping-list-header">
        <h1 className="shopping-list-title">Shopping List</h1>
        <p className="shopping-list-subtitle">Organize your ingredients efficiently</p>
        
        <div className="shopping-list-actions">
          <div className="view-toggle-container">
            <button 
              onClick={() => handleViewModeChange('recipe')}
              className={`view-toggle-button ${viewMode === 'recipe' ? 'active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18" />
              </svg>
              By Recipe
            </button>
            <button 
              onClick={() => handleViewModeChange('category')}
              className={`view-toggle-button ${viewMode === 'category' ? 'active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h18v18H3z"/>
                <path d="M3 9h18"/>
                <path d="M3 15h18"/>
                <path d="M9 3v18"/>
                <path d="M15 3v18"/>
              </svg>
              By Category
              {isAiCategorized && (
                <span className="ai-badge" title="AI-powered categorization">AI</span>
              )}
            </button>
          </div>
          
          <div className="shopping-list-buttons">
            <button
              onClick={() => clearList('check')}
              className="shopping-list-button btn-secondary"
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Mark All Complete
            </button>
            <button
              onClick={() => clearList('delete')}
              className="shopping-list-button btn-danger"
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
              Clear List
            </button>
            <button 
              className="shopping-list-button btn-secondary"
              onClick={() => window.history.back()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back to Recipes
            </button>
          </div>
        </div>
      </div>

      <div className="shopping-list-content">
        {viewMode === 'recipe' ? (
          // Recipe View
          Object.entries(itemsByRecipe).map(([recipeId, items]) => {
            const recipeName = items[0].recipeTitle || 'Other Items';
            const isCollapsed = collapsedGroups[recipeId] || false;
            
            return (
              <div key={recipeId} className="recipe-group">
                <div 
                  className="recipe-group-header" 
                  onClick={() => setCollapsedGroups(prev => ({
                    ...prev, 
                    [recipeId]: !isCollapsed
                  }))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg 
                      className={`recipe-group-chevron ${isCollapsed ? 'collapsed' : ''}`}
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                    
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18" />
                    </svg>
                    <span className="recipe-title-text">{recipeName}</span>
                  </div>
                  <span className="recipe-group-item-count">{items.length}</span>
                </div>
                <ul className={`recipe-group-list ${isCollapsed ? 'collapsed' : ''}`}>
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
          })
        ) : (
          // Category View
          isCategorizing ? (
            // Show loading indicator while categorizing
            <div className="categorizing-loading-state">
              <div className="loader"></div>
              <p>Organizing ingredients into categories...</p>
              <small>Using AI to categorize your shopping list</small>
            </div>
          ) : (
            // Display categorized items when ready
            Object.entries(categorizedItems).map(([categoryKey, category]) => {
              const isCollapsed = collapsedGroups[categoryKey] || false;
              
              return (
                <div key={categoryKey} className="recipe-group">
                  <div 
                    className="recipe-group-header category-header"
                    onClick={() => setCollapsedGroups(prev => ({
                      ...prev, 
                      [categoryKey]: !isCollapsed
                    }))}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg 
                        className={`recipe-group-chevron ${isCollapsed ? 'collapsed' : ''}`}
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                      {category.icon}
                      <span className="recipe-title-text">{category.name}</span>
                    </div>
                    <span className="recipe-group-item-count">{category.items.length}</span>
                  </div>
                  <ul className={`recipe-group-list ${isCollapsed ? 'collapsed' : ''}`}>
                    {category.items.map(item => (
                      <ShoppingListItemRow
                        key={item._id}
                        item={item}
                        onToggleChecked={toggleItemChecked}
                        onDelete={deleteItem}
                        showRecipeTitle={true}
                      />
                    ))}
                  </ul>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
};

interface ShoppingListItemRowProps {
  item: ShoppingListItem;
  onToggleChecked: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  showRecipeTitle?: boolean;
}

const ShoppingListItemRow: React.FC<ShoppingListItemRowProps> = ({ 
  item, 
  onToggleChecked,
  onDelete,
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
      <div className="item-actions">
        <button
          onClick={() => onDelete(item._id)}
          className="action-button action-button-delete"
          aria-label="Delete item"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    </li>
  );
};

export default ShoppingListPage;
