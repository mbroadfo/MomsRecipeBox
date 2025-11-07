import axios from 'axios';

/**
 * API endpoint for categorizing ingredients using OpenAI
 */
export async function handler(event) {
  try {
    // Extract user_id from JWT authorizer context
    const user_id = event.requestContext?.authorizer?.principalId;
    
    if (!user_id) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized: No user context found' })
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
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key not found");
    }
    
    const prompt = `
    Categorize these ingredients by grocery store aisle/section for efficient shopping.
    
    Group items by where they're ACTUALLY located in real grocery stores.
    Use clear aisle names like: Produce, Dairy & Eggs, Meat & Seafood, Spices & Condiments, Bakery, Frozen Foods, Canned Goods.
    
    Return JSON with EXACT ingredient strings as keys and aisle names as values.
    
    Ingredients:
    ${ingredients.join('\n')}
    `;
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a grocery shopping expert. Group ingredients by their actual physical location in real grocery stores for efficient shopping. Use EXACT ingredient strings as JSON keys."
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
    console.log("Raw OpenAI response:", categorizedData);
    
    // Parse the JSON response
    let categorizedIngredients;
    try {
      categorizedIngredients = JSON.parse(categorizedData);
      console.log("Parsed categorizations:", categorizedIngredients);
    } catch (e) {
      console.error("Error parsing AI response:", e);
      // Fallback to returning all ingredients as "Miscellaneous"
      return ingredients.reduce((acc, ingredient) => {
        acc[ingredient] = "Miscellaneous";
        return acc;
      }, {});
    }
    
    // Map AI categorizations back to full ingredient strings
    // AI often extracts just the main ingredient (e.g., "flour" from "1 cup flour")
    const result = {};
    
    for (const ingredient of ingredients) {
      // Try direct match first
      if (categorizedIngredients[ingredient]) {
        result[ingredient] = categorizedIngredients[ingredient];
        continue;
      }
      
      // Try to find the main ingredient within the full string
      const mainIngredient = Object.keys(categorizedIngredients).find(key => 
        ingredient.toLowerCase().includes(key.toLowerCase())
      );
      
      if (mainIngredient) {
        result[ingredient] = categorizedIngredients[mainIngredient];
      } else {
        // Fallback to "Miscellaneous" if no match
        result[ingredient] = "Miscellaneous";
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error calling AI service:", error);
    console.error("API Key present:", !!process.env.OPENAI_API_KEY);
    console.error("API Response:", error.response?.data);
    console.error("API Status:", error.response?.status);
    
    // Fallback to returning all ingredients as "Miscellaneous"
    return ingredients.reduce((acc, ingredient) => {
      acc[ingredient] = "Miscellaneous";
      return acc;
    }, {});
  }
}
