/**
 * Simple script to add test items to the shopping list
 */
import dotenv from 'dotenv';
dotenv.config();

import fetch from 'node-fetch';
import { MongoClient, ObjectId } from 'mongodb';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const USER_ID = 'auth0|testuser';

// Create a test recipe and add some shopping list items
async function addTestItems() {
    try {
        console.log('Adding test items to shopping list...');
        
        // Create a recipe to reference
        const recipe = {
            title: 'Shopping List Demo Recipe',
            description: 'A recipe for testing shopping list functionality',
            ingredients: [
                { name: 'Flour', quantity: '2 cups', position: 1 },
                { name: 'Sugar', quantity: '1 cup', position: 2 },
                { name: 'Salt', quantity: '1 tsp', position: 3 }
            ],
            sections: [
                { section_type: 'Instructions', content: 'Mix everything together.', position: 1 }
            ],
            tags: ['demo', 'test', 'shopping-list'],
            visibility: 'public',
            owner_id: USER_ID
        };
        
        const recipeResponse = await fetch(`${API_URL}/api/recipes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipe)
        });
        
        const recipeData = await recipeResponse.json();
        console.log('Recipe created:', recipeData);
        
        // Add ingredients to shopping list
        const shoppingListItems = [
            {
                ingredient: '2 cups Flour',
                recipe_id: recipeData._id,
                recipe_title: recipe.title
            },
            {
                ingredient: '1 cup Sugar',
                recipe_id: recipeData._id,
                recipe_title: recipe.title
            },
            {
                ingredient: '1 tsp Salt',
                recipe_id: recipeData._id,
                recipe_title: recipe.title
            }
        ];
        
        const shoppingListResponse = await fetch(`${API_URL}/api/shopping-list/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: USER_ID,
                items: shoppingListItems
            })
        });
        
        const shoppingListData = await shoppingListResponse.json();
        console.log('Items added to shopping list:', shoppingListData);
        
        console.log('Success! Check your shopping list in the browser');
    } catch (error) {
        console.error('Error:', error);
    }
}

addTestItems();
