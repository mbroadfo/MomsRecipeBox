#!/usr/bin/env node

/**
 * Add Test Data - Node.js Version
 * 
 * This script adds test data to the application including recipes and shopping list items.
 * Useful for development, testing, and demonstration purposes.
 * 
 * Usage:
 *   node scripts/add-test-data.js
 *   node scripts/add-test-data.js --type=recipe
 *   node scripts/add-test-data.js --type=shopping
 *   node scripts/add-test-data.js --help
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'auth0|testuser';

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = {
        type: 'both', // 'recipe', 'shopping', or 'both'
        help: false
    };

    process.argv.slice(2).forEach(arg => {
        if (arg === '--help' || arg === '-h') {
            args.help = true;
        } else if (arg.startsWith('--type=')) {
            const type = arg.split('=')[1];
            if (['recipe', 'shopping', 'both'].includes(type)) {
                args.type = type;
            } else {
                console.error(`Invalid type: ${type}. Use 'recipe', 'shopping', or 'both'`);
                process.exit(1);
            }
        }
    });

    return args;
}

/**
 * Show help information
 */
function showHelp() {
    console.log(`
Add Test Data - Node.js Version

This script adds test data to the application including recipes and shopping list items.
Useful for development, testing, and demonstration purposes.

Usage:
  node scripts/add-test-data.js [options]

Options:
  --type=TYPE             Type of data to add: 'recipe', 'shopping', or 'both' (default)
  --help, -h              Show this help message

Examples:
  node scripts/add-test-data.js                    # Add both recipe and shopping items
  node scripts/add-test-data.js --type=recipe     # Add only test recipe
  node scripts/add-test-data.js --type=shopping   # Add only shopping list items

Prerequisites:
  - Local server must be running on ${API_BASE_URL}
  - Use 'npm run start:local' to start the server
`);
}

/**
 * Check if the server is responsive
 */
async function checkServer() {
    try {
        console.log('Checking server connectivity...');
        const response = await fetch(`${API_BASE_URL}/recipes?limit=1`, {
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        console.log('✅ Local server is running');
        return true;
        
    } catch (error) {
        console.error('❌ Local server not responding. Please make sure it\'s running');
        console.error(`   Error: ${error.message}`);
        console.error('   Try: npm run start:local');
        process.exit(1);
    }
}

/**
 * Create a test recipe
 */
async function createTestRecipe() {
    const recipeData = {
        title: 'Test Recipe for Shopping List',
        description: 'A test recipe created via Node.js script for development and testing purposes',
        tags: ['test', 'automated', 'development'],
        visibility: 'public',
        owner_id: TEST_USER_ID,
        ingredients: [
            {
                name: 'All-purpose Flour',
                quantity: '2 cups',
                position: 1
            },
            {
                name: 'Granulated Sugar',
                quantity: '1/2 cup',
                position: 2
            },
            {
                name: 'Large Eggs',
                quantity: '2',
                position: 3
            },
            {
                name: 'Whole Milk',
                quantity: '1 cup',
                position: 4
            },
            {
                name: 'Butter',
                quantity: '1/4 cup melted',
                position: 5
            },
            {
                name: 'Baking Powder',
                quantity: '2 tsp',
                position: 6
            },
            {
                name: 'Salt',
                quantity: '1/2 tsp',
                position: 7
            },
            {
                name: 'Vanilla Extract',
                quantity: '1 tsp',
                position: 8
            }
        ],
        instructions: [
            {
                step: 1,
                instruction: 'In a large bowl, whisk together flour, sugar, baking powder, and salt.'
            },
            {
                step: 2,
                instruction: 'In another bowl, beat eggs and add milk, melted butter, and vanilla extract.'
            },
            {
                step: 3,
                instruction: 'Pour wet ingredients into dry ingredients and stir until just combined.'
            },
            {
                step: 4,
                instruction: 'Cook on griddle or skillet until golden brown on both sides.'
            }
        ]
    };

    try {
        console.log('Creating test recipe...');
        const response = await fetch(`${API_BASE_URL}/recipes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recipeData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create recipe: ${response.status} ${error}`);
        }

        const recipe = await response.json();
        console.log(`✅ Created recipe with ID: ${recipe._id}`);
        console.log(`   Title: ${recipe.title}`);
        
        return recipe;
        
    } catch (error) {
        console.error(`❌ Error creating test recipe: ${error.message}`);
        throw error;
    }
}

/**
 * Add items to shopping list
 */
async function addShoppingListItems(recipeId, recipeTitle) {
    const shoppingListData = {
        user_id: TEST_USER_ID,
        items: [
            {
                ingredient: '2 cups All-purpose Flour',
                recipe_id: recipeId,
                recipe_title: recipeTitle
            },
            {
                ingredient: '1/2 cup Granulated Sugar',
                recipe_id: recipeId,
                recipe_title: recipeTitle
            },
            {
                ingredient: '2 Large Eggs',
                recipe_id: recipeId,
                recipe_title: recipeTitle
            },
            {
                ingredient: '1 cup Whole Milk',
                recipe_id: recipeId,
                recipe_title: recipeTitle
            },
            {
                ingredient: '1/4 cup melted Butter',
                recipe_id: recipeId,
                recipe_title: recipeTitle
            },
            {
                ingredient: '2 tsp Baking Powder',
                recipe_id: recipeId,
                recipe_title: recipeTitle
            },
            {
                ingredient: '1/2 tsp Salt',
                recipe_id: recipeId,
                recipe_title: recipeTitle
            },
            {
                ingredient: '1 tsp Vanilla Extract',
                recipe_id: recipeId,
                recipe_title: recipeTitle
            }
        ]
    };

    try {
        console.log('Adding items to shopping list...');
        const response = await fetch(`${API_BASE_URL}/shopping-list/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shoppingListData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to add shopping items: ${response.status} ${error}`);
        }

        const result = await response.json();
        console.log('✅ Shopping list items added successfully');
        console.log(`   Added ${shoppingListData.items.length} items to shopping list`);
        
        return result;
        
    } catch (error) {
        console.error(`❌ Error adding shopping list items: ${error.message}`);
        throw error;
    }
}

/**
 * Add standalone shopping list items (for testing shopping functionality)
 */
async function addStandaloneShoppingItems() {
    const shoppingListData = {
        user_id: TEST_USER_ID,
        items: [
            {
                ingredient: '1 dozen Eggs',
                recipe_id: null,
                recipe_title: 'Manual Addition'
            },
            {
                ingredient: '1 gallon Milk',
                recipe_id: null,
                recipe_title: 'Manual Addition'
            },
            {
                ingredient: '2 lbs Ground Beef',
                recipe_id: null,
                recipe_title: 'Manual Addition'
            },
            {
                ingredient: '1 loaf Bread',
                recipe_id: null,
                recipe_title: 'Manual Addition'
            }
        ]
    };

    try {
        console.log('Adding standalone shopping list items...');
        const response = await fetch(`${API_BASE_URL}/shopping-list/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(shoppingListData)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to add standalone shopping items: ${response.status} ${error}`);
        }

        const result = await response.json();
        console.log('✅ Standalone shopping list items added successfully');
        console.log(`   Added ${shoppingListData.items.length} manual items to shopping list`);
        
        return result;
        
    } catch (error) {
        console.error(`❌ Error adding standalone shopping items: ${error.message}`);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    const args = parseArgs();
    
    if (args.help) {
        showHelp();
        return;
    }
    
    console.log('Adding Test Data');
    console.log('='.repeat(50));
    
    try {
        // Check server connectivity
        await checkServer();
        
        let recipe = null;
        
        // Add recipe if requested
        if (args.type === 'recipe' || args.type === 'both') {
            recipe = await createTestRecipe();
        }
        
        // Add shopping list items if requested
        if (args.type === 'shopping' || args.type === 'both') {
            if (recipe) {
                // Add items from the recipe
                await addShoppingListItems(recipe._id, recipe.title);
            }
            
            // Add some standalone items
            await addStandaloneShoppingItems();
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ SUCCESS! Test data has been added.');
        console.log('Please refresh your browser to see the items.');
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Run the script
main().catch(error => {
    console.error(`❌ Unexpected error: ${error.message}`);
    process.exit(1);
});