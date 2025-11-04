import { useState } from 'react';
import type { RawRecipe } from './useRecipe';

// Type definitions for window global properties
interface WindowWithUser extends Window {
  currentUser?: { id: string };
  currentUserId?: string;
}

// Type for ingredient items in the nested structure
interface IngredientItem {
  name?: string;
  quantity?: string;
}

// Type for ingredient groups
interface IngredientGroup {
  items: IngredientItem[];
}

export function useNewRecipe() {
  // Initialize the empty recipe, checking if we have a temporary image URL in localStorage
  const tempImageUrl = localStorage.getItem('newRecipe_tempImageUrl') || '';
  
  const emptyRecipe: RawRecipe = {
    title: '',
    subtitle: '',
    description: '',
    author: '',
    source: '',
    image_url: tempImageUrl,
    tags: [],
    yield: '',
    time: '',
    ingredients: [],
    steps: [],
    notes: '',
    visibility: 'private', // Default to private for new recipes
    owner_id: (window as WindowWithUser).currentUser?.id || (window as WindowWithUser).currentUserId || 'demo-user'
  };
  
  // Using const declaration to avoid unused variable warning
  const recipe = useState<RawRecipe>(emptyRecipe)[0];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const saveNewRecipe = async (recipeData: RawRecipe) => {
    setLoading(true);
    setError(null);
    try {
      const userId = (window as WindowWithUser).currentUser?.id || (window as WindowWithUser).currentUserId || 'demo-user';
      
      // Make sure we have all required fields
      if (!recipeData.title) {
        throw new Error("Recipe title is required");
      }
      
      // Ensure we have valid data structures
      // Normalize tags to lowercase
      const normalizedTags = Array.isArray(recipeData.tags) 
        ? recipeData.tags.map(tag => tag.toLowerCase()) 
        : [];
      
      // Extract ingredients from the structure
      let ingredientsArray: IngredientItem[] = [];
      if (Array.isArray(recipeData.ingredients) && recipeData.ingredients.length > 0) {
        // Handle the nested structure from useWorkingRecipe
        const firstIngredient = recipeData.ingredients[0] as IngredientGroup;
        if (Array.isArray(firstIngredient?.items)) {
          ingredientsArray = firstIngredient.items.filter((i: IngredientItem) => 
            (i.name && i.name.trim()) || (i.quantity && i.quantity.trim())
          );
        } else {
          ingredientsArray = recipeData.ingredients as IngredientItem[];
        }
      }
      
      // Build a complete payload with all supported fields
      const payload = {
        title: recipeData.title,
        subtitle: recipeData.subtitle || "",
        description: recipeData.description || "",
        author: recipeData.author || "",
        source: recipeData.source || "",
        owner_id: recipeData.owner_id || userId,
        visibility: recipeData.visibility || 'private',
        tags: normalizedTags,
        yield: recipeData.yield || "",
        time: recipeData.time || {},
        ingredients: ingredientsArray,
        steps: Array.isArray(recipeData.steps) ? recipeData.steps.filter(s => s.trim()) : [],
        instructions: Array.isArray(recipeData.steps) ? recipeData.steps.filter(s => s.trim()) : [], // Including both formats for compatibility
        notes: recipeData.notes || ""
      };
      
      // Debug output to check what we're sending
      console.log("New recipe payload fields:", {
        hasTitle: !!payload.title,
        hasSubtitle: !!payload.subtitle,
        hasDescription: !!payload.description,
        hasAuthor: !!payload.author,
        hasSource: !!payload.source,
        tagCount: payload.tags.length,
        hasYield: !!payload.yield,
        timeFields: Object.keys(payload.time || {}),
        ingredientCount: payload.ingredients.length,
        stepCount: payload.steps.length,
        hasNotes: !!payload.notes,
      });
      
      console.log("Saving new recipe with payload:", payload);
      
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`Save failed (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Successfully created recipe:", data);
      return data._id;
    } catch (e: unknown) {
      console.error("Error saving recipe:", e);
      const error = e instanceof Error ? e : new Error(String(e));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    recipe,
    loading,
    error,
    saveNewRecipe
  };
}
