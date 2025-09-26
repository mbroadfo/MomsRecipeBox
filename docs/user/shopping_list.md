# Shopping List Feature Guide

The shopping list feature in MomsRecipeBox allows users to add ingredients from recipes to a personal shopping list, organize items by recipe or category, and track purchased items. This guide explains how to use the shopping list feature and its key capabilities.

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Using the Shopping List](#using-the-shopping-list)
4. [Organization Options](#organization-options)
5. [Adding Items](#adding-items)
6. [Managing Items](#managing-items)
7. [Tips and Tricks](#tips-and-tricks)
8. [Related Documentation](#related-documentation)

## Overview

The shopping list feature simplifies meal planning and grocery shopping by allowing you to:

- Add ingredients directly from recipes
- Mark items as purchased while shopping
- View items organized by recipe or category
- Track which recipe each ingredient is from
- Manage your list with bulk actions

The shopping list is stored per user in the database, so it persists across sessions and devices, allowing you to prepare your list at home and access it at the grocery store.

## Key Features

### Personal Shopping Lists

- **User-Specific**: Each user has their own private shopping list
- **Persistent Storage**: List is saved in MongoDB and accessible from any device
- **Recipe Context**: Each item remembers which recipe it came from
- **Status Tracking**: Items can be marked as purchased/checked

### Organization Options

- **By Recipe**: Items grouped by their source recipe
- **By Category**: AI-powered categorization into grocery store sections
- **Purchased Items**: Separate section for already purchased items
- **Collapsible Sections**: Expand/collapse groups for better organization

### User Interface

- **Clear All Button**: Quickly remove all items from your list
- **Clear Purchased**: Remove only items marked as purchased
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Visual Feedback**: Clear visual indicators for purchased items
- **Drag and Drop**: Reorder items to match your shopping route (coming soon)

## Using the Shopping List

### Accessing the Shopping List

There are multiple ways to access your shopping list:

1. Click the **Shopping List** icon in the main navigation menu
2. From any recipe, click **Go to Shopping List** in the ingredients section
3. After adding ingredients to your list, click the confirmation link

### View Organization Options

The shopping list offers two organization modes:

#### By Recipe View

- Items are grouped according to their source recipe
- Recipe names appear as headers for each group
- Great when cooking multiple recipes and want to see ingredients by dish

#### By Category View

- Items are organized by grocery store categories using AI
- Common categories include Produce, Dairy, Meat, Pantry, etc.
- Ideal for efficient in-store shopping

Switch between views using the **View By** toggle at the top of the shopping list.

### Adding Items

#### From a Recipe

1. Open any recipe in the application
2. Check the boxes next to ingredients you want to add
3. Click **Add Selected to Shopping List**
4. Confirmation will appear when items are added

#### Multiple Recipes

You can add ingredients from multiple recipes to build a comprehensive shopping list:

1. Add ingredients from the first recipe
2. Navigate to another recipe
3. Select and add more ingredients
4. Continue until your menu planning is complete

### Managing Items

#### Marking Items as Purchased

While shopping, you can mark items as purchased:

1. Check the box next to an item
2. The item will move to the "Purchased Items" section
3. Text will appear with strikethrough formatting

#### Removing Individual Items

To remove a single item:

1. Click the delete (×) button next to the item
2. The item will be immediately removed from your list

#### Bulk Actions

The shopping list includes buttons for bulk operations:

- **Clear All**: Removes all items from your shopping list
- **Clear Purchased**: Removes only items marked as purchased
- **Check All**: Marks all items as purchased (coming soon)
- **Uncheck All**: Marks all items as unpurchased (coming soon)

## Tips and Tricks

### Efficient Shopping

- Use **By Category** view for the most efficient shopping route
- Check off items as you find them to keep track of progress
- Use **Clear Purchased** periodically to declutter your list
- Keep recipe context by using **By Recipe** view when preparing meals

### Meal Planning

1. Plan your week's recipes in advance
2. Add all ingredients to your shopping list from each recipe
3. Review the consolidated list to avoid buying duplicates
4. Shop once with your complete list

### Collaborative Shopping

- Multiple family members can access the shopping list (requires separate accounts)
- Updates sync across devices when the list is refreshed
- Coordinate who will purchase what items

### Mobile Usage

- The shopping list is fully responsive for mobile use
- Works well on small screens for in-store shopping
- Check/uncheck items with one tap while shopping

## Related Documentation

- [Technical Shopping List Documentation](../technical/shopping_list.md) - Implementation details
- [AI Recipe Assistant Guide](./ai_recipe_assistant.md) - AI-powered recipe creation
- [Getting Started Guide](./getting_started.md) - Basic application usage
