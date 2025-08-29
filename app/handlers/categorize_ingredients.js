import axios from 'axios';

/**
 * API endpoint for categorizing ingredients using OpenAI
 */
export async function handler(event) {
  try {
    // TODO: Add proper authentication when auth system is ready
    // For now, allow all requests to this endpoint
    
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
    try {
      const categories = await categorizeIngredientsWithAI(ingredients);
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          categories,
          method: "ai" // Indicate that AI was used for categorization
        })
      };
    } catch (aiError) {
      // If AI categorization fails, log the error but don't fail the request
      // Instead, return fallback categorizations
      console.warn("AI categorization failed, using keyword fallback:", aiError.message);
      
      // Use fallback keyword-based categorization
      const fallbackCategories = ingredients.reduce((acc, ingredient) => {
        acc[ingredient] = "Other"; // Default to "Other" category
        return acc;
      }, {});
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          categories: fallbackCategories,
          method: "fallback", // Indicate that fallback was used
          fallbackReason: aiError.message
        })
      };
    }
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
    Categorize each ingredient into one of the following grocery store aisle categories:
    ${categories.join(', ')}
    
    Important categorization guidelines:
    - Categorize based on where you would typically find the item in a grocery store
    - "Baking" includes items like flour, sugar, baking powder, chocolate chips, vanilla extract
    - "Snacks & Sweets" includes ready-to-eat items like cookies, candies, potato chips
    - "Canned & Packaged" includes jarred sauces, canned vegetables, boxed mixes
    - "Produce" includes fresh fruits and vegetables
    - "Dairy & Eggs" includes milk, cheese, yogurt, butter, and eggs
    - "Meat & Seafood" includes all fresh and packaged meats and seafood
    
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
        },
        timeout: 10000 // 10 second timeout
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
