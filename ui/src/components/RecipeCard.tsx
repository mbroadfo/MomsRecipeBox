import React from 'react';
import fallbackImage from '../assets/default.png';

interface Recipe {
  id: string;
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
  onClick: (id: string) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  const imageUrl = recipe.image_url || fallbackImage;

  return (
    <div
      onClick={() => onClick(recipe.id.toString())}
      className="bg-white rounded-xl shadow-md hover:shadow-lg ring-1 ring-gray-200 transition-all cursor-pointer overflow-hidden p-2 mx-auto" style={{ width: '220px' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-16 h-16 flex-shrink-0">
          <img
            src={imageUrl}
            alt={recipe.title}
            className="w-16 h-16 object-cover rounded-md"
            style={{ maxWidth: '4rem', maxHeight: '4rem' }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = fallbackImage;
            }}
          />
        </div>
        <div>
          <h2 className="text-base font-semibold">{recipe.title}</h2>
          {recipe.subtitle && (
            <p className="text-xs text-gray-600 italic">{recipe.subtitle}</p>
          )}
          {recipe.summary && (
            <p className="text-xs text-gray-700">{recipe.summary}</p>
          )}
          {recipe.author && (
            <p className="text-xs text-gray-500">Submitted by: {recipe.author}</p>
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
