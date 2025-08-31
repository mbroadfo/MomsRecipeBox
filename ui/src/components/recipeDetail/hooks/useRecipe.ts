import { useState, useEffect, useCallback } from 'react';

export interface RawRecipe {
  _id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  author?: string;
  source?: string | { [k: string]: any };
  visibility?: string; // 'private', 'family', 'public'
  owner_id?: string;  // User ID of recipe owner
  status?: string;
  image_url?: string;
  tags?: string[];
  yield?: string;
  time?: any; // flexible
  ingredients?: any; // array | grouped object
  instructions?: string[];
  steps?: string[]; // alternate name
  sections?: { section_type?: string; type?: string; content: string; position?: number }[];
  notes?: string;
  [k: string]: any;
}

/**
 * Hook to fetch and refresh recipe data
 */
export function useRecipe(id: string) {
  const [recipe, setRecipe] = useState<RawRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch recipe data
  const fetchRecipe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = (window as any).currentUser?.id || (window as any).currentUserId || 'demo-user';
      const data = await fetch(`/api/recipes/${id}?user_id=${encodeURIComponent(userId)}`).then(r => {
        if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
        return r.json();
      });
      setRecipe(data);
    } catch (e: any) {
      setError(e);
    } finally { 
      setLoading(false); 
    }
  }, [id]);

  // Function to poll for recipe image updates
  const pollForImage = useCallback(async (attempts = 5, delay = 1000) => {
    if (!id) return;
    
    console.log(`Starting to poll for image updates for recipe ${id}`);
    
    let currentAttempt = 0;
    const checkForImage = async () => {
      if (currentAttempt >= attempts) {
        console.log(`Max polling attempts (${attempts}) reached for recipe ${id}`);
        return;
      }
      
      currentAttempt++;
      console.log(`Polling attempt ${currentAttempt}/${attempts} for recipe ${id}`);
      
      try {
        const userId = (window as any).currentUser?.id || (window as any).currentUserId || 'demo-user';
        const response = await fetch(`/api/recipes/${id}?user_id=${encodeURIComponent(userId)}`);
        
        if (!response.ok) {
          console.error(`Failed to fetch recipe during polling: ${response.status}`);
          setTimeout(checkForImage, delay);
          return;
        }
        
        const data = await response.json();
        console.log(`Polling got recipe data with image_url:`, data.image_url);
        
        // Update the recipe with fresh data
        setRecipe(data);
        
        // If we still don't have an image_url, try again
        if (!data?.image_url) {
          console.log(`No image_url found yet, scheduling next poll in ${delay}ms`);
          setTimeout(checkForImage, delay);
        } else {
          console.log(`Found image_url: ${data.image_url}, polling complete`);
        }
      } catch (err) {
        console.error(`Error during image polling:`, err);
        setTimeout(checkForImage, delay);
      }
    };
    
    await checkForImage();
  }, [id, fetchRecipe]);

  // Fetch recipe data on mount and when ID changes
  useEffect(() => { fetchRecipe(); }, [fetchRecipe]);

  return { 
    recipe, 
    loading, 
    error, 
    refresh: fetchRecipe,
    pollForImage,
    setRecipe 
  };
}
