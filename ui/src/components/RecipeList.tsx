// File: ui/src/components/RecipeList.tsx
import React, { useEffect, useState } from 'react';
import RecipeCard from './RecipeCard';

interface Recipe {
  id: number;
  title: string;
  subtitle?: string;
  image_url?: string;
}

interface RecipeListProps {
  onSelectRecipe: (id: number) => void;
}

export const RecipeList: React.FC<RecipeListProps> = ({ onSelectRecipe }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/recipes?expand=full')
      .then((res) => res.json())
      .then((data) => setRecipes(data.recipes || []))
      .catch((err) => {
        console.error('Error fetching recipes:', err);
        setError('Failed to load recipes');
      });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Mom's Recipe Box</h1>
      {error && <p className="text-red-500">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onClick={onSelectRecipe}
          />
        ))}
      </div>
    </div>
  );
};
