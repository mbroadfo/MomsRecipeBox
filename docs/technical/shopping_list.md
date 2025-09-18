# Shopping List Technical Documentation

This document provides detailed technical information about the shopping list implementation in MomsRecipeBox, including the API endpoints, data model, and integration with other system components.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Model](#data-model)
3. [API Endpoints](#api-endpoints)
4. [Implementation Details](#implementation-details)
5. [AI Categorization](#ai-categorization)
6. [UI Implementation](#ui-implementation)
7. [Future Enhancements](#future-enhancements)
8. [Related Documentation](#related-documentation)

## Architecture Overview

The shopping list feature is implemented using:

- MongoDB for persistent storage
- RESTful API endpoints for CRUD operations
- React components for frontend UI
- AI-powered categorization for organizing items

The system is designed to:
- Store shopping list items per user
- Maintain recipe context for each item
- Support multiple views (by recipe, by category)
- Handle purchased/unpurchased state tracking
- Provide bulk operations (add, clear, etc.)

## Data Model

### Shopping List Collection

The shopping list is stored in the `shopping_lists` collection with the following schema:

```javascript
{
  _id: ObjectId,          // MongoDB document ID
  userId: String,         // User who owns list (unique)
  items: [                // Array of shopping list items
    {
      _id: ObjectId,      // Item ID
      ingredient: String, // Ingredient name
      name: String,       // Alternative field for ingredient name
      recipeId: String,   // Source recipe ID
      recipe_id: String,  // Alternative field for source recipe ID
      recipeTitle: String, // Source recipe title
      checked: Boolean    // Purchase status (true = purchased)
    }
  ],
  updatedAt: Date         // Last modification timestamp
}
```

### Indexes

The collection uses these indexes for performance:

```javascript
// Ensure one document per user
db.shopping_lists.createIndex({ "userId": 1 }, { unique: true });
```

### Field Compatibility

The system supports multiple field naming patterns for compatibility between frontend and backend:

- `ingredient` / `name` for the ingredient text
- `recipeId` / `recipe_id` for the source recipe ID

The API normalizes these fields automatically to ensure compatibility regardless of how items were stored.

## API Endpoints

### Get Shopping List

```
GET /shopping-list
```

**Description:** Retrieves the user's shopping list

**Request Parameters:**
- `userId` (query parameter): The user ID to retrieve the shopping list for

**Response:**
```json
{
  "success": true,
  "items": [
    {
      "_id": "60f8a12c8e1f2c001d123456",
      "ingredient": "2 cups flour",
      "recipeId": "60f8a12c8e1f2c001d654321",
      "recipeTitle": "Chocolate Chip Cookies",
      "checked": false
    },
    // More items...
  ]
}
```

### Add Items to Shopping List

```
POST /shopping-list/add
```

**Description:** Adds multiple ingredients to the shopping list

**Request Body:**
```json
{
  "userId": "user123",
  "items": [
    {
      "ingredient": "1 cup sugar",
      "recipeId": "recipe456",
      "recipeTitle": "Chocolate Cake"
    },
    // More items...
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "3 items added to shopping list",
  "items": [
    // Array of added items with generated IDs
  ]
}
```

### Update Shopping List Item

```
PUT /shopping-list/item/:id
```

**Description:** Updates a specific shopping list item (typically to toggle checked status)

**URL Parameters:**
- `id`: The ID of the item to update

**Request Body:**
```json
{
  "userId": "user123",
  "checked": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item updated",
  "item": {
    "_id": "60f8a12c8e1f2c001d123456",
    "ingredient": "2 cups flour",
    "recipeId": "60f8a12c8e1f2c001d654321",
    "recipeTitle": "Chocolate Chip Cookies",
    "checked": true
  }
}
```

### Delete Shopping List Item

```
DELETE /shopping-list/item/:id
```

**Description:** Removes an item from the shopping list

**URL Parameters:**
- `id`: The ID of the item to delete

**Request Body:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item deleted"
}
```

### Clear Shopping List

```
POST /shopping-list/clear
```

**Description:** Clears the entire shopping list or just purchased items

**Request Body:**
```json
{
  "userId": "user123",
  "action": "all"         // Options: "all" or "checked"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Shopping list cleared",
  "removedCount": 5
}
```

### AI Categorization Endpoint

```
POST /shopping-list/categorize
```

**Description:** Categorizes shopping list items into grocery store sections using AI

**Request Body:**
```json
{
  "items": [
    "2 cups flour",
    "1 cup sugar",
    "3 eggs",
    "1 lb ground beef"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "categorizedItems": {
    "Baking": ["2 cups flour", "1 cup sugar"],
    "Dairy": ["3 eggs"],
    "Meat": ["1 lb ground beef"]
  }
}
```

## Implementation Details

### API Handlers

The shopping list API is implemented with these handlers:

- `get_shopping_list.js`: Retrieves the user's shopping list
- `add_shopping_list_items.js`: Adds items to the shopping list
- `update_shopping_list_item.js`: Updates item status (checked/unchecked)
- `delete_shopping_list_item.js`: Removes an item from the list
- `clear_shopping_list.js`: Clears all or checked items
- `categorize_shopping_list.js`: AI-powered categorization

### Key Implementation Features

- **Document Creation**: On first add, creates a new shopping list document for user
- **Upsert Logic**: Updates existing document on subsequent adds
- **Item ID Generation**: Assigns unique MongoDB ObjectId to each item
- **Atomic Operations**: Uses MongoDB atomic operations for concurrent safety
- **Field Normalization**: Handles both naming conventions (`ingredient`/`name`, etc.)
- **Error Handling**: Comprehensive error handling with appropriate status codes
- **Performance**: Indexed queries and batch operations for efficiency

### Field Normalization Example

```javascript
// Example normalization in add_shopping_list_items.js
const normalizedItems = items.map(item => ({
  _id: new ObjectId(),
  ingredient: item.ingredient || item.name,
  recipeId: item.recipeId || item.recipe_id,
  recipeTitle: item.recipeTitle,
  checked: item.checked || false
}));
```

## AI Categorization

The shopping list includes AI-powered categorization to organize items by grocery store sections:

### Categorization Process

1. User selects "By Category" view
2. Frontend sends uncategorized items to `/shopping-list/categorize` endpoint
3. Backend calls AI provider to categorize ingredients
4. Items are grouped by returned categories
5. Categories are displayed in logical shopping order

### Category Groups

Common category groups include:

- Produce: Fruits and vegetables
- Dairy: Milk, cheese, eggs, etc.
- Meat: Beef, chicken, fish, etc.
- Pantry: Dry goods, canned items, etc.
- Baking: Flour, sugar, spices, etc.
- Frozen: Ice cream, frozen vegetables, etc.
- Other: Miscellaneous items

### AI Implementation

The categorization uses the same AI provider infrastructure as the recipe assistant:

```javascript
import { AIProviderFactory } from '../ai_providers/index.js';

// Get best available AI provider
const aiProvider = AIProviderFactory.getProvider();

// Categorize ingredients
const categorizedItems = await aiProvider.categorizeIngredients(items);
```

## UI Implementation

The shopping list UI consists of several React components:

- **ShoppingListPage**: Main container component
- **ShoppingListControls**: View toggle and bulk action buttons
- **ShoppingListItem**: Individual item with checkbox and delete button
- **RecipeGroup**: Groups items by recipe (in "By Recipe" view)
- **CategoryGroup**: Groups items by category (in "By Category" view)
- **EmptyState**: Shown when shopping list is empty
- **PurchasedSection**: Container for items marked as purchased

### State Management

The shopping list uses React state management:

```javascript
// Shopping list hook
function useShoppingList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('recipe'); // 'recipe' or 'category'
  
  // Load shopping list data
  const loadShoppingList = async () => {
    // Implementation...
  };
  
  // Add items to shopping list
  const addItems = async (newItems) => {
    // Implementation...
  };
  
  // Update item (toggle checked status)
  const updateItem = async (id, checked) => {
    // Implementation...
  };
  
  // Delete item
  const deleteItem = async (id) => {
    // Implementation...
  };
  
  // Clear shopping list
  const clearList = async (action = 'all') => {
    // Implementation...
  };
  
  return {
    items,
    loading,
    error,
    viewMode,
    setViewMode,
    loadShoppingList,
    addItems,
    updateItem,
    deleteItem,
    clearList
  };
}
```

## Future Enhancements

Planned improvements for the shopping list feature:

1. **Drag and Drop**: Allow reordering of items to match shopping route
2. **Item Quantities**: Automatically combine identical ingredients with quantity math
3. **Advanced Categorization**: User-configurable categories and ordering
4. **Shopping Lists**: Support for multiple named shopping lists per user
5. **Sharing**: Share shopping lists with other users
6. **Smart Suggestions**: AI-powered suggestions for complementary ingredients
7. **History**: View and restore previous shopping lists
8. **Meal Planning**: Integration with meal planning calendar

## Related Documentation

- [Shopping List User Guide](../guides/shopping_list.md) - User-focused documentation
- [AI Services Documentation](./ai_services.md) - AI integration details
- [MongoDB Guide](./mongodb_guide.md) - Database details