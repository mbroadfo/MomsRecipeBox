import axios from 'axios';

/**
 * Simple authentication check - all requests are allowed in development mode
 * @param {Object} event - Lambda event object
 * @returns {boolean} - True if authenticated, false otherwise
 */
function isAuthenticated(event) {
  // In development mode, all requests are allowed
  // In production, this should be replaced with proper authentication
  return true;
}

/**
 * API endpoint for categorizing ingredients using OpenAI
 */
export async function handler(event) {
  try {
    // Check if the user is authenticated
    if (!isAuthenticated(event)) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: "Unauthorized" })
      };
    }
    
    const { ingredients } = JSON.parse(event.body);
    
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "Invalid request: ingredients must be a non-empty array"
        })
      };
    }
    
    // Call OpenAI API to categorize ingredients
    const categories = await categorizeIngredientsWithAI(ingredients);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        categories
      })
    };
  } catch (error) {
    console.error("Error in categorize_ingredients:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Failed to categorize ingredients",
        error: error.message
      })
    };
  }
}

/**
 * Uses OpenAI API to categorize a list of ingredients
 * @param {string[]} ingredients - Array of ingredient names to categorize
 * @returns {Object} - Object mapping each ingredient to its category
 */
async function categorizeIngredientsWithAI(ingredients) {
  try {
    // Define the categories we want to use
    const categories = [
      "Produce", 
      "Dairy & Eggs", 
      "Meat & Seafood", 
      "Grains & Bread", 
      "Canned & Packaged", 
      "Spices & Condiments", 
      "Baking", 
      "Frozen", 
      "Snacks & Sweets", 
      "Beverages", 
      "Other"
    ];
    
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not found");
    }
    
    const prompt = `
    Categorize each ingredient into one of the following categories:
    ${categories.join(', ')}
    
    Return a JSON object where keys are ingredient names and values are their categories.
    
    Ingredients to categorize:
    ${ingredients.join('\n')}
    `;
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that categorizes food ingredients into grocery store categories. Respond only with JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    // Parse and validate the response
    const categorizedData = response.data.choices[0].message.content;
    
    // Parse the JSON response
    let categorizedIngredients;
    try {
      categorizedIngredients = JSON.parse(categorizedData);
    } catch (e) {
      console.error("Error parsing AI response:", e);
      // Fallback to returning all ingredients as "Other"
      return ingredients.reduce((acc, ingredient) => {
        acc[ingredient] = "Other";
        return acc;
      }, {});
    }
    
    // Ensure all ingredients are categorized
    const result = ingredients.reduce((acc, ingredient) => {
      acc[ingredient] = categorizedIngredients[ingredient] || "Other";
      return acc;
    }, {});
    
    return result;
  } catch (error) {
    console.error("Error calling AI service:", error);
    
    // Fallback to returning all ingredients as "Other"
    return ingredients.reduce((acc, ingredient) => {
      acc[ingredient] = "Other";
      return acc;
    }, {});
  }
}
