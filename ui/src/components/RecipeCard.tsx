import React from 'react';
import fallbackImage from '../assets/default.png';

interface Recipe {
  id: number;
  title: string;
  subtitle?: string;
  summary?: string;
  description?: string;
  author?: string;
  tags?: string[];
  image_url?: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  onClick: (id: number) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  const imageUrl = recipe.image_url || fallbackImage;

  return (
    <div
      onClick={() => onClick(recipe.id)}
      className="bg-white rounded-xl shadow-md hover:shadow-lg ring-1 ring-gray-200 transition-all cursor-pointer overflow-hidden p-4"
    >
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 flex-shrink-0">
          <img
            src={imageUrl}
            alt={recipe.title}
            className="w-24 h-24 object-cover rounded-md"
            style={{ maxWidth: '6rem', maxHeight: '6rem' }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackImage;
            }}
          />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{recipe.title}</h2>
          {recipe.subtitle && (
            <p className="text-sm text-gray-600 italic">{recipe.subtitle}</p>
          )}
          {recipe.summary && (
            <p className="text-sm text-gray-700">{recipe.summary}</p>
          )}
          {recipe.author && (
            <p className="text-sm text-gray-500">Submitted by: {recipe.author}</p>
          )}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {recipe.tags.map((tag, i) => (
                <span
                  key={i}
                  className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
