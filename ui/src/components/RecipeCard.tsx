import React from 'react';
import fallbackImage from '../assets/default.png';

interface Recipe {
  _id?: string;
  id?: string;
  title: string;
  likes_count?: number;
  liked?: boolean;
  image_url?: string;
  comments?: number | any[];
}

interface RecipeCardProps {
  recipe: Recipe;
  onClick: (id: string) => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick }) => {
  // Handle mixed image URL formats (S3 URLs and API URLs)
  let imageUrl = recipe.image_url || fallbackImage;
  
  // Convert API image URLs to direct S3 URLs
  if (imageUrl && imageUrl.startsWith('/api/recipes/') && imageUrl.endsWith('/image')) {
    // Extract recipe ID from /api/recipes/{id}/image format
    const match = imageUrl.match(/\/api\/recipes\/([^\/]+)\/image/);
    if (match) {
      const recipeId = match[1];
      // Convert to direct S3 URL - try .png first, then .jpg if .png fails
      imageUrl = `https://mrb-recipe-images-dev.s3.amazonaws.com/${recipeId}.png`;
    }
  }

  const favorites = typeof recipe.likes_count === 'number'
    ? recipe.likes_count
    : 0;

  const comments = Array.isArray(recipe.comments) ? recipe.comments.length : (recipe.comments as number) || 0;
  const liked = !!recipe.liked;

  return (
    <div
      onClick={() => {
        const recipeId = (recipe as any)._id || recipe.id;
        if (recipeId) onClick(recipeId);
      }}
      className="bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden flex flex-col"
      style={{
        height: '400px',
        margin: '16px',
        padding: '18px',
        boxSizing: 'border-box',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        fontSize: '16px', /* Ensure base font size is set */
      }}
    >
      {/* Image section */}
      <div className="flex justify-center items-center" style={{ width: '100%', height: '275px', overflow: 'hidden', padding: 0 }}>
        <img
          src={imageUrl}
          alt={recipe.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', maxWidth: '275px', maxHeight: '275px', padding: 0 }}
          onError={(e) => {
            const currentSrc = e.currentTarget.src;
            e.currentTarget.onerror = null;
            
            // If it was a converted API URL ending in .png, try .jpg
            if (currentSrc.includes('mrb-recipe-images-dev.s3.amazonaws.com') && currentSrc.endsWith('.png')) {
              const jpgUrl = currentSrc.replace('.png', '.jpg');
              e.currentTarget.src = jpgUrl;
            } else if (currentSrc.includes('mrb-recipe-images-dev.s3.amazonaws.com') && currentSrc.endsWith('.jpg')) {
              // If .jpg also failed, try .jpeg
              const jpegUrl = currentSrc.replace('.jpg', '.jpeg');
              e.currentTarget.src = jpegUrl;
            } else if (currentSrc.includes('mrb-recipe-images-dev.s3.amazonaws.com') && currentSrc.endsWith('.jpeg')) {
              // If .jpeg also failed, try .webp
              const webpUrl = currentSrc.replace('.jpeg', '.webp');
              e.currentTarget.src = webpUrl;
            } else {
              // Final fallback to default image
              e.currentTarget.src = fallbackImage;
            }
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
            fontWeight: 700, /* Explicitly set font-weight to bold */
            fontSize: '1.125rem', /* Explicitly set font size to match text-lg */
            lineHeight: '1.75rem',
          }}
        >
          {recipe.title}
        </h2>
      </div>
      {/* Favorites and comments section */}
      <div className="mt-2 flex items-center text-gray-700 text-base font-bold" style={{ fontWeight: 700, fontSize: '1rem', lineHeight: '1.5rem' }}>
        <span className="flex items-center gap-2 mr-6">
          <svg width="20" height="20" fill={liked ? '#e53e3e' : 'none'} stroke="#e53e3e" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 1.01 4.5 2.09C13.09 4.01 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{favorites}</span>
        </span>
        <span className="flex items-center gap-2">
          <svg width="20" height="20" fill="#3182ce" stroke="#3182ce" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="7" width="18" height="10" rx="2" />
            <rect x="7" y="11" width="2" height="2" rx="1" fill="#fff" />
            <rect x="11" y="11" width="2" height="2" rx="1" fill="#fff" />
            <rect x="15" y="11" width="2" height="2" rx="1" fill="#fff" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{comments}</span>
        </span>
      </div>
    </div>
  );
};

export default RecipeCard;
