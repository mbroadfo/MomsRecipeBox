import { useMemo, useState, useEffect } from 'react';
import type { ShoppingListItem } from './useShoppingList';
import type { ReactNode } from 'react';

// Common ingredient categories with their keywords
const CATEGORIES = {
  PRODUCE: {
    name: 'Produce',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 22s4-18 20-18M22 2s-10 18-10 18s-4-8-4-8M8 12l-4 4"/>
      </svg>
    ),
    keywords: [
      'apple', 'banana', 'orange', 'lemon', 'lime', 'berry', 'berries', 'strawberry', 'blueberry',
      'raspberry', 'blackberry', 'grape', 'melon', 'watermelon', 'cantaloupe', 'pineapple', 'kiwi',
      'mango', 'peach', 'pear', 'plum', 'cherry', 'tomato', 'lettuce', 'spinach', 'kale', 'arugula',
      'carrot', 'celery', 'cucumber', 'pepper', 'onion', 'garlic', 'ginger', 'potato', 'sweet potato',
      'squash', 'zucchini', 'broccoli', 'cauliflower', 'cabbage', 'asparagus', 'mushroom',
      'avocado', 'corn', 'pea', 'bean', 'sprout', 'radish', 'green', 'herb', 'basil', 'cilantro',
      'parsley', 'mint', 'dill', 'rosemary', 'thyme', 'oregano', 'sage', 'chive'
    ]
  },
  DAIRY: {
    name: 'Dairy & Eggs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8l4-4"/>
        <path d="M18 2H6"/>
        <path d="M11 12a2 2 0 0 1 2 2v4"/>
      </svg>
    ),
    keywords: [
      'milk', 'cream', 'butter', 'cheese', 'yogurt', 'sour cream', 'creme', 'egg', 'dairy',
      'cheddar', 'mozzarella', 'parmesan', 'ricotta', 'cottage', 'brie', 'feta', 'goat cheese',
      'whipped', 'half and half', 'buttermilk'
    ]
  },
  MEAT: {
    name: 'Meat & Seafood',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.99 14.37A8 8 0 1 1 9.62 7.01"/>
        <path d="M22 16a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    keywords: [
      'beef', 'chicken', 'pork', 'steak', 'ground beef', 'meat', 'turkey', 'lamb', 'veal',
      'bacon', 'sausage', 'ham', 'salami', 'prosciutto', 'pepperoni', 'hot dog', 'hamburger',
      'fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'clam', 'mussel', 'oyster',
      'scallop', 'cod', 'tilapia', 'trout', 'halibut', 'seafood', 'duck', 'venison'
    ]
  },
  GRAINS: {
    name: 'Grains & Bread',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v12"/>
        <path d="M8 7a4 4 0 0 1 8 0v14h1a2 2 0 0 0 2-2V9a4 4 0 0 0-8 0"/>
        <path d="M4 9a2 2 0 0 0 2 2h1v10a2 2 0 0 0 4 0V11h1a2 2 0 0 0 2-2"/>
      </svg>
    ),
    keywords: [
      'flour', 'bread', 'roll', 'bagel', 'baguette', 'rice', 'pasta', 'noodle', 'spaghetti',
      'tortilla', 'wrap', 'pita', 'croissant', 'cereal', 'oatmeal', 'grain', 'wheat', 'barley',
      'couscous', 'quinoa', 'bulgur', 'farro', 'cornmeal', 'polenta', 'grits', 'cracker',
      'breadcrumb', 'panko', 'toast'
    ]
  },
  CANNED_GOODS: {
    name: 'Canned & Packaged',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.91 8.84L8.56 2.23a1.93 1.93 0 0 0-1.81 0L3.1 4.13a1.93 1.93 0 0 0-.09 3.34l12.35 6.61a1.93 1.93 0 0 0 1.81 0l3.65-1.9a1.93 1.93 0 0 0 .09-3.34z"/>
        <path d="M3.09 8.84v7.21a1.93 1.93 0 0 0 1.14 1.76l3.5 1.81a1.93 1.93 0 0 0 1.8 0l3.4-1.76a1.93 1.93 0 0 0 1.1-1.74v-7.2"/>
        <path d="M20.91 16.05V8.84"/>
      </svg>
    ),
    keywords: [
      'can', 'jar', 'bottle', 'package', 'box', 'canned', 'packaged', 'soup', 'sauce', 'salsa',
      'ketchup', 'mustard', 'mayonnaise', 'dressing', 'oil', 'vinegar', 'broth', 'stock', 'tomato',
      'beans', 'tuna', 'corn', 'peas', 'olives', 'pickles', 'jam', 'jelly', 'peanut butter',
      'honey', 'syrup', 'pasta sauce', 'marinara', 'alfredo'
    ]
  },
  SPICES: {
    name: 'Spices & Condiments',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3a7.192 7.192 0 0 0-3.272 13.905v1.745a2.35 2.35 0 0 0 4.7 0v-1.745A7.192 7.192 0 0 0 14 3Z"/>
        <path d="M10.728 16.945V19.5M17.272 16.945V19.5M12.215 9.518L12.214 9.518M12.0008 9.518L12 9.518M14.858 12.104L14.857 12.104M14.6437 12.104L14.643 12.104M9.357 12.104L9.3569 12.104M9.1426 12.104L9.142 12.104"/>
      </svg>
    ),
    keywords: [
      'salt', 'pepper', 'spice', 'herb', 'seasoning', 'cinnamon', 'nutmeg', 'cumin', 'paprika',
      'oregano', 'basil', 'thyme', 'rosemary', 'sage', 'bay leaf', 'chili', 'powder', 'vanilla',
      'extract', 'soy sauce', 'teriyaki', 'hot sauce', 'worcestershire', 'curry', 'cajun',
      'italian seasoning', 'allspice', 'clove', 'ginger', 'garlic powder', 'onion powder'
    ]
  },
  BAKING: {
    name: 'Baking',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3"/>
        <path d="M16 3v3a2 2 0 0 0 2 2h3"/>
        <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
        <path d="M3 16h3a2 2 0 0 1 2 2v3"/>
        <path d="M12 8v8"/>
        <path d="M8 12h8"/>
      </svg>
    ),
    keywords: [
      'sugar', 'brown sugar', 'powdered sugar', 'baking powder', 'baking soda', 'flour', 'cornstarch',
      'yeast', 'chocolate chip', 'cocoa', 'vanilla extract', 'almond extract', 'frosting', 'sprinkles',
      'food coloring', 'cake mix', 'brownie mix', 'cookie', 'pie crust', 'confectioner', 'molasses'
    ]
  },
  FROZEN: {
    name: 'Frozen',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20"/>
        <path d="M17.5 7 12 2 6.5 7"/>
        <path d="m2 12 20 0"/>
        <path d="M7 6.5 2 12l5 5.5"/>
        <path d="M22 12l-5-5.5"/>
        <path d="M17 17.5 22 12l-5-5.5"/>
        <path d="M12 22l5.5-5.5"/>
        <path d="M6.5 17 12 22l5.5-5"/>
      </svg>
    ),
    keywords: [
      'frozen', 'ice cream', 'popsicle', 'pizza', 'vegetable', 'fruit', 'waffle', 'pancake',
      'french fries', 'tater tots', 'dinner', 'breakfast', 'dessert'
    ]
  },
  SNACKS: {
    name: 'Snacks & Sweets',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.4 10.6a2.5 2.5 0 0 1 0-3.5"/>
        <path d="M21 11.7c.9-.9.9-2.5 0-3.4l-6.37-6.3a2.4 2.4 0 0 0-3.4 0L4.9 8.3c-1 1-1 2.5 0 3.4l9.1 9.1a2.4 2.4 0 0 0 3.4 0"/>
        <path d="M13.5 10.9a2.5 2.5 0 0 0 3.5 0"/>
      </svg>
    ),
    keywords: [
      'chip', 'cracker', 'popcorn', 'pretzel', 'nut', 'candy', 'chocolate', 'cookie', 'cake',
      'pie', 'granola', 'bar', 'snack', 'sweet', 'dessert', 'ice cream', 'cookie dough'
    ]
  },
  BEVERAGES: {
    name: 'Beverages',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.2 2H6.8a2 2 0 0 0-1.8 2.8L9 12v6"/>
        <path d="m13 12 4-7.2A2 2 0 0 0 15.2 2"/>
        <path d="M12 12v6"/>
        <path d="M6 20a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2H6v2z"/>
      </svg>
    ),
    keywords: [
      'water', 'juice', 'soda', 'pop', 'coffee', 'tea', 'wine', 'beer', 'milk', 'smoothie',
      'drink', 'beverage', 'lemonade', 'cocktail', 'alcohol', 'liquor', 'whiskey', 'vodka',
      'gin', 'rum', 'tequila', 'champagne', 'sparkling'
    ]
  },
  OTHER: {
    name: 'Other',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 7.5v8c0 1.4-1 2.5-2.4 2.5H6.5l-4 3v-3h-.1c-1.4 0-2.4-1.2-2.4-2.6v-8c0-1.4 1-2.4 2.4-2.4h16.2c1.4 0 2.4 1.1 2.4 2.5z"/>
        <path d="M8 9v3"/>
        <path d="M16 9v3"/>
        <path d="M12 9v3"/>
      </svg>
    ),
    keywords: []
  }
};

export const useIngredientCategories = (items: ShoppingListItem[]) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [aiCategorizations, setAiCategorizations] = useState<Record<string, string>>({});
  const [aiCategorized, setAiCategorized] = useState(false);
  
  // Call the API to get AI-based categorizations
  useEffect(() => {
    async function categorizeIngredients() {
      if (!items || items.length === 0) return;
      
      try {
        setLoading(true);
        // Extract ingredient names for categorization
        const ingredientNames = items.map(item => item.name || item.ingredient || '').filter(Boolean);
        
        // Skip API call if no valid ingredients
        if (ingredientNames.length === 0) {
          setLoading(false);
          return;
        }
        
        // Call our new API endpoint
        const response = await fetch('/api/shopping-list/categorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ingredients: ingredientNames }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to categorize ingredients');
        }
        
        const data = await response.json();
        
        if (data.success && data.categories) {
          setAiCategorizations(data.categories);
          setAiCategorized(true);
        }
      } catch (err) {
        console.error('Error categorizing ingredients:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setAiCategorized(false);
      } finally {
        setLoading(false);
      }
    }
    
    categorizeIngredients();
  }, [items]);

  // Use the AI categorizations when available, fallback to keyword matching
  const categorizedItems = useMemo(() => {
    const categorizedItems: Record<string, {
      name: string;
      icon: ReactNode;
      items: ShoppingListItem[];
    }> = {};
    
    // Initialize all categories
    Object.entries(CATEGORIES).forEach(([key, category]) => {
      categorizedItems[key] = {
        name: category.name,
        icon: category.icon,
        items: []
      };
    });
    
    // Categorize each item
    items.forEach(item => {
      const itemName = (item.name || item.ingredient || '');
      if (!itemName) return;
      
      // Try to use AI categorization first
      const aiCategory = aiCategorizations[itemName];
      
      if (aiCategory) {
        // Instead of trying to match the AI category to our predefined categories,
        // let's just use what the AI gives us directly
        
        // Check if we already have this category in our results
        if (!categorizedItems[aiCategory]) {
          // Create a new dynamic category
          categorizedItems[aiCategory] = {
            name: aiCategory,
            icon: CATEGORIES.OTHER.icon, // Use the "Other" icon as default
            items: []
          };
        }
        
        // Add the item to its AI-assigned category
        categorizedItems[aiCategory].items.push(item);
      } else {
        // Fallback to keyword matching
        const itemNameLower = itemName.toLowerCase();
        let matched = false;
        
        for (const [key, category] of Object.entries(CATEGORIES)) {
          // Skip the "OTHER" category during matching
          if (key === 'OTHER') continue;
          
          if (category.keywords.some(keyword => itemNameLower.includes(keyword.toLowerCase()))) {
            categorizedItems[key].items.push(item);
            matched = true;
            break;
          }
        }
        
        // If no category matched, put in "OTHER"
        if (!matched) {
          categorizedItems.OTHER.items.push(item);
        }
      }
    });
    
    // Filter out empty categories
    return Object.entries(categorizedItems)
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
  }, [items, aiCategorizations]);
  
  // Return both the categorized items and metadata
  return {
    categories: categorizedItems,
    isLoading: loading,
    isAiCategorized: aiCategorized,
    error
  };
};
