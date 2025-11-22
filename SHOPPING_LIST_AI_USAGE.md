# Shopping List AI Context Integration

## Overview

The AI Assistant now supports page-specific context, allowing the shopping list page to provide its data to the AI for more intelligent assistance.

## Frontend Implementation (Complete ✅)

### 1. AIContext Extended

**File**: `ui/src/contexts/AIContext.tsx`

Added `pageContext` to store page-specific data:

```typescript
export interface PageContext {
  page: 'shopping-list' | 'recipe' | 'other';
  data?: any;
}

interface AIContextType {
  isVisible: boolean;
  pageContext: PageContext | null;
  showAI: (context?: PageContext) => void;
  hideAI: () => void;
  toggleAI: (context?: PageContext) => void;
}
```

### 2. RecipeAIChat Updated

**File**: `ui/src/components/recipeDetail/parts/RecipeAIChat.tsx`

Added `pageContext` prop and passes it to the API:

```typescript
interface RecipeAIChatProps {
  // ... existing props ...
  pageContext?: any; // Additional page-specific context
}

// In API request body:
body: JSON.stringify({
  message: userInput,
  messages: messages,
  currentRecipe: currentRecipe || undefined,
  mode: mode,
  pageContext: pageContext || undefined // ✅ New
}),
```

### 3. GlobalAIAssistant Updated

**File**: `ui/src/components/layout/GlobalAIAssistant.tsx`

Passes `pageContext` from AIContext to RecipeAIChat:

```typescript
const { isVisible, hideAI, pageContext } = useAI();

<RecipeAIChat 
  isVisible={isVisible} 
  onApplyRecipe={handleApplyRecipe}
  currentRecipe={currentRecipe}
  mode={recipeMode || 'new'}
  onClose={hideAI}
  pageContext={pageContext} // ✅ New
/>
```

## Shopping List Usage Example

### Option 1: Open AI with Context from Header Button

If the user clicks the AI button from the shopping list page header:

**File**: `ui/src/components/layout/Header.tsx`

```typescript
import { useAI } from '../../contexts/AIContext';
import { useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const { toggleAI } = useAI();
  const location = useLocation();
  
  // Get shopping list data if on shopping list page
  const shoppingListData = location.pathname === '/shopping-list' 
    ? getShoppingListFromSomewhere() 
    : null;

  const handleAIClick = () => {
    if (location.pathname === '/shopping-list' && shoppingListData) {
      toggleAI({
        page: 'shopping-list',
        data: shoppingListData
      });
    } else {
      toggleAI();
    }
  };

  return (
    <button onClick={handleAIClick}>
      AI Assistant
    </button>
  );
};
```

### Option 2: Add AI Button to Shopping List Page

**File**: `ui/src/components/shoppingList/ShoppingListPage.tsx`

```typescript
import { useAI } from '../../contexts/AIContext';

const ShoppingListPage: React.FC = () => {
  const { showAI } = useAI();
  const { shoppingList } = useShoppingList(isAuthenticated, authLoading);

  const handleOpenAI = () => {
    // Prepare shopping list context
    const context = {
      page: 'shopping-list' as const,
      data: {
        items: shoppingList?.items || [],
        itemsByRecipe: getItemsByRecipe(),
        totalItems: shoppingList?.items?.length || 0,
        checkedItems: shoppingList?.items?.filter(item => item.checked).length || 0,
        viewMode: viewMode // 'recipe' or 'category'
      }
    };

    showAI(context);
  };

  return (
    <div className="shopping-list-page">
      {/* Add AI button to control bar */}
      <button onClick={handleOpenAI}>
        Ask AI About Shopping List
      </button>
      
      {/* Rest of shopping list UI */}
    </div>
  );
};
```

## Backend Implementation (TODO)

### API Handler Update

**File**: `app/handlers/ai_chat_handler.js`

The AI chat handler needs to check for `pageContext` and include it in the system prompt:

```javascript
async function handleAIChat(event) {
  const { 
    message, 
    messages, 
    model, 
    currentRecipe, 
    mode,
    pageContext // ✅ New parameter
  } = JSON.parse(event.body);

  // Build system prompt based on context
  let systemPrompt = 'You are a helpful cooking assistant...';

  if (pageContext?.page === 'shopping-list') {
    const { items, itemsByRecipe, totalItems, checkedItems } = pageContext.data;
    
    systemPrompt += `

SHOPPING LIST CONTEXT:
- Total items: ${totalItems}
- Checked items: ${checkedItems}
- Unchecked items: ${totalItems - checkedItems}
- Items by recipe: ${JSON.stringify(itemsByRecipe, null, 2)}
- All items: ${JSON.stringify(items, null, 2)}

You can help the user with:
- Meal planning based on their shopping list
- Recipe suggestions using ingredients they already plan to buy
- Optimizing their shopping list
- Grouping items by store section
- Estimating costs or quantities
- Suggesting substitutions`;
  }

  // Continue with OpenAI API call using systemPrompt...
}
```

### Example AI Capabilities

With shopping list context, the AI can:

1. **Meal Planning**: "Based on your shopping list, I can see you're buying chicken, rice, and vegetables. Would you like me to suggest a complete meal plan?"

2. **Recipe Suggestions**: "You have tomatoes, basil, and mozzarella on your list. Have you considered making a Caprese salad?"

3. **Optimization**: "I notice you have ingredients for 3 Italian recipes. You can save money by buying a larger pack of Parmesan cheese."

4. **Store Navigation**: "Would you like me to regroup your list by store aisle? Produce, dairy, meats, etc."

5. **Shopping Tips**: "Your list includes fresh herbs. Pro tip: Buy them last and store in water to keep fresh longer."

## Data Privacy Note

Shopping list data is only sent to the AI when explicitly provided via context. It's not stored permanently and is only used for the current AI conversation session.

## Testing

1. Navigate to shopping list page with items
2. Click AI assistant button (with context)
3. Ask: "What meals can I make with my shopping list?"
4. AI should reference specific items from your list

## Status

- ✅ Frontend context passing implemented
- ✅ API payload includes `pageContext`
- ⏳ Backend handler needs to parse and use `pageContext`
- ⏳ System prompt enhancement for shopping list context
