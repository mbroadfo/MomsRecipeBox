import React from "react";

interface Recipe {
  id: string;
  title: string;
  author?: string;
  description?: string;
  image_url?: string;
}

const RecipeCard: React.FC<{ recipe: Recipe }> = ({ recipe }) => {
  return (
    <div className="rounded-2xl shadow bg-white overflow-hidden hover:shadow-lg transition">
      {recipe.image_url && (
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        <h2 className="text-xl font-bold mb-1">{recipe.title}</h2>
        {recipe.author && <p className="text-sm text-gray-600">by {recipe.author}</p>}
        {recipe.description && <p className="text-base mt-2">{recipe.description}</p>}
      </div>
    </div>
  );
};

export default RecipeCard;
