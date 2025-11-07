import { useMemo, useState } from 'react';
import type { ShoppingListItem } from './useShoppingList';
import type { ReactNode } from 'react';
import { apiClient } from '../../lib/api-client.js';

// Default icon for AI-created categories
const DEFAULT_CATEGORY_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7.5v8c0 1.4-1 2.5-2.4 2.5H6.5l-4 3v-3h-.1c-1.4 0-2.4-1.2-2.4-2.6v-8c0-1.4 1-2.4 2.4-2.4h16.2c1.4 0 2.4 1.1 2.4 2.5z"/>
    <path d="M8 9v3"/>
    <path d="M16 9v3"/>
    <path d="M12 9v3"/>
  </svg>
);

export const useIngredientCategories = (items: ShoppingListItem[], viewMode: 'recipe' | 'category') => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [aiCategorizations, setAiCategorizations] = useState<Record<string, string>>({});
  const [aiCategorized, setAiCategorized] = useState(false);
  
  // Hook for AI-powered ingredient categorization
  
  // Manual AI categorization function - only called when user requests it
  const categorizeWithAI = async () => {
    // Don't re-categorize if we already have AI categorizations
    if (aiCategorized && Object.keys(aiCategorizations).length > 0) {
      return;
    }
    
    if (!items || items.length === 0) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Extract ingredient names for categorization
      const ingredientNames = items.map(item => item.name || item.ingredient || '').filter(Boolean);
      
      // Skip API call if no valid ingredients
      if (ingredientNames.length === 0) {
        setLoading(false);
        return;
      }
      
      // Call our API endpoint
      const response = await apiClient.request('shopping-list/categorize', {
        method: 'POST',
        body: { ingredients: ingredientNames }
      });
      
      if (response.success && response.data?.categories) {
        setAiCategorizations(response.data.categories);
        setAiCategorized(true);
      } else {
        setError(new Error('No categories returned from AI'));
      }
    } catch (err) {
      console.error('Error categorizing ingredients:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setAiCategorized(false);
    } finally {
      setLoading(false);
    }
  };

  // Use the AI categorizations when available, fallback to keyword matching
  // Only categorize when in category view mode
  const categorizedItems = useMemo(() => {
    // Recalculate categories when state changes
    
    // If not in category view, return empty categories
    if (viewMode !== 'category') {
      return {};
    }

    // If AI is currently loading and we haven't categorized yet, return empty
    // This prevents showing keyword-based categories while AI is thinking
    if (loading && !aiCategorized) {
      return {};
    }

    const categorizedItems: Record<string, {
      name: string;
      icon: ReactNode;
      items: ShoppingListItem[];
    }> = {};
    
    // No predefined categories - AI creates categories dynamically
    
    // Categorize each item
    items.forEach(item => {
      const itemName = (item.name || item.ingredient || '');
      if (!itemName) return;
      
      // Try to use AI categorization first
      const aiCategory = aiCategorizations[itemName];
      
      if (aiCategory) {
        // Use AI categorization - create dynamic categories as needed
        // Check if we already have this category in our results
        if (!categorizedItems[aiCategory]) {
          // Create a new dynamic category
          categorizedItems[aiCategory] = {
            name: aiCategory,
            icon: DEFAULT_CATEGORY_ICON,
            items: []
          };
        }
        
        // Add the item to its AI-assigned category
        categorizedItems[aiCategory].items.push(item);
      } else {
        // TEMPORARY: Add fallback for debugging if we don't have AI categories yet
        if (!aiCategorized && Object.keys(aiCategorizations).length === 0) {
          if (!categorizedItems['Uncategorized']) {
            categorizedItems['Uncategorized'] = {
              name: 'Uncategorized',
              icon: DEFAULT_CATEGORY_ICON,
              items: []
            };
          }
          categorizedItems['Uncategorized'].items.push(item);
        }
      }
      // No fallback categorization - AI only!
    });
    
    // Filter out empty categories
    const result = Object.entries(categorizedItems)
      .filter(([_, category]) => category.items.length > 0)
      .sort((a, b) => {
        // Sort by number of items (descending)
        return b[1].items.length - a[1].items.length;
      })
      .reduce((acc, [key, category]) => {
        acc[key] = category;
        return acc;
      }, {} as Record<string, {
        name: string;
        icon: ReactNode;
        items: ShoppingListItem[];
      }>);
      
    return result;
  }, [items, aiCategorizations, viewMode, loading, aiCategorized]);
  
  // Return both the categorized items and metadata
  return {
    categories: categorizedItems,
    isLoading: loading,
    isAiCategorized: aiCategorized,
    error,
    categorizeWithAI
  };
};
