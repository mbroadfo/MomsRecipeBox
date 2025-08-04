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
  favorites?: number;
  comments?: number;
}

interface RecipeCardProps {
  recipe: Recipe;
  onClick: (id: string) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  const imageUrl = recipe.image_url || fallbackImage;

  // Calculate favorites/likes and comments from recipe data
  // Supports array or number fields
  const favorites = Array.isArray((recipe as any).favorites)
    ? (recipe as any).favorites.length
    : typeof recipe.favorites === 'number'
      ? recipe.favorites
      : Array.isArray((recipe as any).likes)
        ? (recipe as any).likes.length
        : typeof (recipe as any).likes === 'number'
          ? (recipe as any).likes
          : 0;

  const comments = Array.isArray((recipe as any).comments)
    ? (recipe as any).comments.length
    : typeof recipe.comments === 'number'
      ? recipe.comments
      : 0;

  return (
    <div
      onClick={() => onClick(recipe.id.toString())}
      className="bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden flex flex-col"
      style={{
        height: '400px',
        margin: '16px',
        padding: '18px',
        boxSizing: 'border-box',
        border: '1px solid #e5e7eb', // Tailwind gray-200
        borderRadius: '16px', // rounded-2xl
      }}
    >
      {/* Image section */}
      <div className="flex justify-center items-center" style={{ width: '100%', height: '275px', overflow: 'hidden', padding: 0 }}>
        <img
          src={imageUrl}
          alt={recipe.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', maxWidth: '275px', maxHeight: '275px', padding: 0 }}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = fallbackImage;
          }}
        />
      </div>
      {/* Title section */}
      <div className="mt-3 flex-1 flex flex-col justify-start">
        <h2
          className="font-bold text-gray-900 text-left text-lg leading-tight"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'normal',
            minHeight: '3em',
            maxHeight: '3em',
          }}
        >
          {recipe.title}
        </h2>
      </div>
      {/* Favorites and comments section */}
      <div className="mt-2 flex items-center text-gray-700 text-base font-bold">
        <span className="flex items-center gap-3 mr-8">
          <svg width="20" height="20" fill="#e53e3e" stroke="#e53e3e" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 1.01 4.5 2.09C13.09 4.01 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span>{favorites}</span>
        </span>
        <span className="inline-block" style={{ width: '32px' }}></span>
        <span className="flex items-center gap-3">
          <svg width="20" height="20" fill="#3182ce" stroke="#3182ce" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="7" width="18" height="10" rx="2" />
            <rect x="7" y="11" width="2" height="2" rx="1" fill="#fff" />
            <rect x="11" y="11" width="2" height="2" rx="1" fill="#fff" />
            <rect x="15" y="11" width="2" height="2" rx="1" fill="#fff" />
          </svg>
          <span>{comments}</span>
        </span>
      </div>
    </div>
  );
};

export default RecipeCard;
