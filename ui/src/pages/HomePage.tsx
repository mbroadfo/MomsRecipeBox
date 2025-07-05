// File: ui/src/pages/HomePage.tsx
import React, { useState } from 'react';
import { RecipeList } from '../components/RecipeList';
import { RecipeDetail } from '../components/RecipeDetail';

export const HomePage: React.FC = () => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);

  return (
    <div className="p-4">
      {selectedRecipeId ? (
        <RecipeDetail recipeId={selectedRecipeId} onBack={() => setSelectedRecipeId(null)} />
      ) : (
        <RecipeList onSelectRecipe={setSelectedRecipeId} />
      )}
    </div>
  );
};
