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
    
    Return a JSON object where keys are the EXACT ingredient strings I provide (including quantities and preparations) and values are their categories.
    It's critically important to use the full ingredient strings I provide as the keys in your response.
    
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
            content: "You are a helpful assistant that categorizes food ingredients into grocery store categories. Respond only with JSON. Use the EXACT full ingredient strings provided (including quantities and preparations) as the keys in your JSON response."
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
      // Fallback to returning all ingredients as "Other"
      return ingredients.reduce((acc, ingredient) => {
        acc[ingredient] = "Other";
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
        // Fallback to "Other" if no match
        result[ingredient] = "Other";
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error calling AI service:", error);
    console.error("API Key present:", !!process.env.OPENAI_API_KEY);
    console.error("API Response:", error.response?.data);
    console.error("API Status:", error.response?.status);
    
    // Fallback to returning all ingredients as "Other"
    return ingredients.reduce((acc, ingredient) => {
      acc[ingredient] = "Other";
      return acc;
    }, {});
  }
}
