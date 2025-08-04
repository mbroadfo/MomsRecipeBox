// File: ui/src/components/RecipeList.tsx
import React, { useEffect, useState } from 'react';
import RecipeCard from './RecipeCard';

interface Recipe {
  id: string;
  title: string;
  subtitle?: string;
  image_url?: string;
}

interface RecipeListProps {
  onSelectRecipe: (id: string) => void;
  filter?: string;
}

export const RecipeList: React.FC<RecipeListProps> = ({ onSelectRecipe, filter = 'all' }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/recipes')
      .then((res) => res.json())
      .then((data) => {
        // Try common response shapes
        if (Array.isArray(data)) {
          setRecipes(data);
        } else if (Array.isArray(data.items)) {
          setRecipes(data.items);
        } else if (Array.isArray(data.recipes)) {
          setRecipes(data.recipes);
        } else {
          setRecipes([]);
        }
        setError(null);
      })
      .catch((err) => {
        console.error('Error fetching recipes:', err);
        setError('Failed to load recipes');
      })
      .finally(() => setLoading(false));
  }, []);

  // Simple filter logic placeholder
  const filteredRecipes = recipes.filter((recipe) => {
    switch (filter) {
      case 'mine':
        // TODO: Replace with real user filtering
        return recipe.id.startsWith('mine');
      case 'families':
        // TODO: Replace with real family filtering
        return recipe.id.startsWith('family');
      case 'favorites':
        // TODO: Replace with real favorites filtering
        return recipe.id.startsWith('fav');
      default:
        return true;
    }
  });

  return (
    <>
      {loading && <p>Loading recipes...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {filteredRecipes.length === 0 && !loading && !error && (
        <p className="text-gray-500">No recipes found.</p>
      )}
      <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(275px, 1fr))' }}>
        {filteredRecipes.map((recipe, idx) => (
          <RecipeCard
            key={recipe.id || idx}
            recipe={recipe}
            onClick={onSelectRecipe}
          />
        ))}
      </div>
    </>
  );
};
