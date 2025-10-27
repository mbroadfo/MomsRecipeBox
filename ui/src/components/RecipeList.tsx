// File: ui/src/components/RecipeList.tsx
import React, { useState, useEffect } from 'react';
import { getCurrentUserId } from '../types/global';
import { apiClient } from '../lib/api-client';
import RecipeCard from './RecipeCard';

interface Recipe {
  _id?: string;
  id?: string;
  title: string;
  likes_count?: number;
  liked?: boolean;
  image_url?: string;
  comments?: number;
  [key: string]: unknown; // Allow additional properties
}

interface RecipeListProps {
  onSelectRecipe: (id: string) => void;
  filter?: string;
  sort?: string;
  maxColumns?: number;
}

export const RecipeList: React.FC<RecipeListProps> = ({ onSelectRecipe, filter = 'all', sort = 'newest', maxColumns = 5 }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Use environment-aware API client instead of direct fetch
    const userId = getCurrentUserId();
    
    const fetchRecipes = async () => {
      try {
        const response = await apiClient.get(`/recipes?user_id=${encodeURIComponent(userId)}`);
        
        if (response.success && response.data) {
          const dataObj = response.data as Record<string, unknown>;
          if (Array.isArray(dataObj.recipes)) setRecipes(dataObj.recipes as Recipe[]);
          else if (Array.isArray(response.data)) setRecipes(response.data as Recipe[]);
          else if (Array.isArray(dataObj.items)) setRecipes(dataObj.items as Recipe[]);
          else setRecipes([]);
          setError(null);
        } else {
          setError(response.error || 'Failed to load recipes');
        }
      } catch (err) {
        console.error('Error fetching recipes:', err);
        setError('Failed to load recipes');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  // Simple filter logic placeholder
  let filteredRecipes = recipes.filter((recipe) => {
    const rid = recipe.id || recipe._id || '';
    switch (filter) {
      case 'mine':
        return rid.startsWith('mine');
      case 'families':
        return rid.startsWith('family');
      case 'favorites':
        return !!recipe.liked;
      default:
        return true;
    }
  });

  // Sorting logic
  filteredRecipes = [...filteredRecipes];
  switch (sort) {
    case 'favorites':
      filteredRecipes.sort((a, b) => (b.likes_count ?? 0) - (a.likes_count ?? 0));
      break;
    case 'popular':
      filteredRecipes.sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0));
      break;
    case 'updated':
      // TODO: Add updated date to Recipe and sort by it
      break;
    case 'newest':
    default:
      // TODO: Add created date to Recipe and sort by it
      break;
  }

  // Limit max columns in grid
  const gridTemplate = `repeat(${maxColumns}, minmax(275px, 1fr))`;

  return (
    <>
      {loading && <p>Loading recipes...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {filteredRecipes.length === 0 && !loading && !error && (
        <p className="text-gray-500">No recipes found.</p>
      )}
      <div className="grid gap-8" style={{ gridTemplateColumns: gridTemplate }}>
        {filteredRecipes.map((recipe, idx) => (
          <RecipeCard
            key={recipe._id || recipe.id || idx}
            recipe={recipe}
            onClick={onSelectRecipe}
          />
        ))}
      </div>
    </>
  );
};
