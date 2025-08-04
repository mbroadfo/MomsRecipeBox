// File: ui/src/components/RecipeDetail.tsx
import React, { useEffect, useState } from 'react';

interface RecipeDetailProps {
  recipeId: string;
  onBack: () => void;
}

export const RecipeDetail: React.FC<RecipeDetailProps> = ({ recipeId, onBack }) => {
  const [recipe, setRecipe] = useState<any>(null);

  useEffect(() => {
    fetch(`http://localhost:3000/recipe?id=${recipeId}&expand=full`)
      .then((res) => res.json())
      .then((data) => setRecipe(data))
      .catch((err) => {
        console.error('Error loading recipe detail:', err);
      });
  }, [recipeId]);

  if (!recipe) return <p>Loading...</p>;

  return (
    <div>
      <button className="mb-4 text-blue-600 underline" onClick={onBack}>← Back to list</button>
      <h1 className="text-2xl font-bold mb-2">{recipe.title}</h1>
      {recipe.subtitle && <p className="text-lg text-gray-600 mb-2">{recipe.subtitle}</p>}
      {recipe.image_url && <img src={recipe.image_url} alt={recipe.title} className="mb-4 rounded-xl" />}
      <p className="mb-4">{recipe.description}</p>

      <h2 className="font-semibold text-lg mt-4">Ingredients</h2>
      <ul className="list-disc ml-6">
        {recipe.ingredients?.map((ing: any, idx: number) => (
          <li key={idx}>{ing.quantity} {ing.name}</li>
        ))}
      </ul>

      <h2 className="font-semibold text-lg mt-4">Instructions</h2>
      <ol className="list-decimal ml-6">
        {recipe.sections?.map((sec: any, idx: number) => (
          sec.section_type === 'Instructions' && (
            <li key={idx}>{sec.content}</li>
          )
        ))}
      </ol>
    </div>
  );
};
