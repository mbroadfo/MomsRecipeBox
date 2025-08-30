// File: ui/src/components/RecipeList.tsx
import React, { useEffect, useState } from 'react';
import RecipeCard from './RecipeCard';

interface Recipe {
  _id?: string;
  id?: string;
  title: string;
  likes_count?: number;
  liked?: boolean;
  image_url?: string;
  comments?: number;
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
    // Explicitly use 'demo-user' as default to ensure consistent user ID
    const userId = (window as any).currentUser?.id || (window as any).currentUserId || 'demo-user';
    fetch(`/api/recipes?user_id=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.recipes)) setRecipes(data.recipes as any);
        else if (Array.isArray(data)) setRecipes(data as any);
        else if (Array.isArray((data as any).items)) setRecipes((data as any).items as any);
        else setRecipes([]);
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching recipes:', err);
        setError('Failed to load recipes');
      })
      .finally(() => setLoading(false));
  }, []);

  // Simple filter logic placeholder
  let filteredRecipes = recipes.filter((recipe) => {
    const rid = (recipe as any).id || (recipe as any)._id || '';
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
            key={(recipe as any)._id || recipe.id || idx}
            recipe={recipe as any}
            onClick={onSelectRecipe}
          />
        ))}
      </div>
    </>
  );
};
