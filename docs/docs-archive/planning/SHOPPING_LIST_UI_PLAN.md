# Shopping List UI Integration Plan

## Overview

This plan outlines the steps to integrate the backend shopping list functionality with the React frontend. The integration will provide users with the ability to add ingredients to their shopping list, view the list, mark items as purchased, and clear the list.

## Components to Create

### 1. Shopping List API Service

- Create new API functions in `src/utils/api.ts` for shopping list operations:
  - `getShoppingList(userId)`
  - `addToShoppingList(userId, items)`
  - `updateShoppingListItem(userId, itemId, checked)`
  - `deleteShoppingListItem(userId, itemId)`
  - `clearShoppingList(userId, action)`

### 2. Shopping List State Management

- Create a `useShoppingList` hook to manage shopping list state and operations
- Implement functions to add, update, delete items and clear list
- Provide loading/error states and data fetching

### 3. UI Components

- **ShoppingListPage.tsx**: Main shopping list view page
  - Display all shopping list items grouped by recipe
  - Allow checking/unchecking items
  - Allow deleting items
  - Provide buttons to clear all or mark all as checked
- **ShoppingListButton.tsx**: Component for the "Add to Shopping List" button in recipe view
- **ShoppingListIcon.tsx**: Navigation icon with optional badge showing count
- **ShoppingListItem.tsx**: Individual shopping list item with checkbox and delete button
- **EmptyShoppingList.tsx**: Placeholder when list is empty

### 4. Route and Navigation

- Add a route for the shopping list page in main router
- Add navigation link/icon in the header or menu

### 5. Recipe Detail Integration

- Enhance `IngredientsView.tsx` with checkboxes for each ingredient
- Add button to add selected ingredients to shopping list
- Implement local storage for persisting checked state between visits

## Implementation Steps

1. ✅ **Backend API Complete**
   - All shopping list API endpoints are implemented and tested

2. **Step 1: API Service Layer**
   - Create shopping list API functions in api.ts
   - Test API calls to ensure they work correctly

3. **Step 2: Shopping List State Management**
   - Create useShoppingList hook
   - Implement state management for shopping list items

4. **Step 3: Basic Shopping List Page**
   - Create ShoppingListPage component
   - Implement basic list view with loading and error states

5. **Step 4: Shopping List Item Components**
   - Create ShoppingListItem component
   - Implement check/uncheck functionality
   - Implement delete functionality

6. **Step 5: Navigation and Routing**
   - Add route for shopping list page
   - Add navigation link/icon

7. **Step 6: Recipe Detail Integration**
   - Enhance IngredientsView with checkboxes
   - Implement local storage for checked state
   - Add "Add to Shopping List" button

8. **Step 7: UX Enhancements**
   - Add animations for adding/removing items
   - Implement grouping by recipe
   - Add clear all / check all buttons
   - Implement toast notifications for actions

9. **Step 8: Polish and Testing**
   - Test full flow from recipe to shopping list
   - Ensure responsive design works
   - Add error handling and recovery
   - Optimize performance

## Data Flow

1. **Adding Items**
   - User checks ingredients in recipe
   - User clicks "Add to Shopping List"
   - Selected ingredients sent to backend with recipe info
   - Shopping list updated and UI refreshed

2. **Viewing List**
   - On shopping list page load, fetch current list
   - Display grouped by recipe with check status

3. **Updating Items**
   - When user checks/unchecks item, update sent to backend
   - UI updates optimistically
   - Error handling if update fails

4. **Deleting Items**
   - When user clicks delete, item removed from backend
   - UI updates optimistically
   - Error handling if delete fails

5. **Clearing List**
   - User clicks clear all or mark all as checked
   - Update sent to backend
   - UI updates based on action chosen

## Dependencies

- Backend API endpoints (already implemented)
- React state management
- LocalStorage for persisting checkbox state
- Router for navigation

## Completion Criteria

- User can view their shopping list
- User can add ingredients from recipes to shopping list
- User can check/uncheck items in shopping list
- User can delete items from shopping list
- User can clear entire list or mark all as checked
- State persists between page visits
- UI is responsive and provides feedback
