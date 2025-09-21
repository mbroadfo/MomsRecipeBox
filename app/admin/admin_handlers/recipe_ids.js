// Get all recipe IDs for orphan analysis - Lambda handler format
import { getDb } from '../../app.js';

export async function handler(event) {
  try {
    const db = await getDb();
    const collection = db.collection('recipes');
    
    // Get all recipe IDs
    const recipes = await collection.find({}, { projection: { _id: 1 } }).toArray();
    const recipeIds = recipes.map(recipe => recipe._id.toString()).sort();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        totalRecipes: recipeIds.length,
        recipeIds: recipeIds
      })
    };
  } catch (error) {
    console.error('Error getting recipe IDs:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}