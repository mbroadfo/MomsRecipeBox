// File: ui/src/pages/HomePage.tsx
import React, { useState } from 'react';
import defaultLogo from '../assets/default.png';
import { RecipeList } from '../components/RecipeList';
import { RecipeDetail } from '../components/RecipeDetail';

export const HomePage: React.FC = () => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-5 bg-white shadow-md w-full">
        <div className="flex items-center gap-8 min-w-0">
          <img src={defaultLogo} alt="MRB Logo" style={{ height: '4.5rem', width: '4.5rem', minHeight: '3rem', minWidth: '3rem', maxHeight: '4.5rem', maxWidth: '4.5rem', marginRight: '2rem' }} />
          <span className="font-extrabold" style={{ fontSize: '3rem', fontWeight: 'bold', lineHeight: 1.1, marginRight: '2rem' }}>Mom's Recipe Box</span>
          <style>{`
            .special-tagline {
              font-size: 2rem !important;
            }
          `}</style>
          <span className="font-semibold italic text-blue-500 drop-shadow-sm special-tagline" style={{ marginLeft: '2rem', letterSpacing: '0.5px', textShadow: '0 1px 4px rgba(49,130,206,0.10)' }}>
            Family favorites, all in one place
          </span>
        </div>
        <div className="relative flex items-center">
          <span style={{ display: 'inline-block', width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'linear-gradient(135deg, #e53e3e 60%, #3182ce 100%)', marginLeft: '16px', marginRight: '16px' }}>
            <svg viewBox="0 0 24 24" width="32" height="32" style={{ display: 'block', margin: 'auto', marginTop: '6px' }} fill="#fff">
              <circle cx="12" cy="9" r="4" />
              <path d="M4 20c0-3.313 3.134-6 7-6s7 2.687 7 6" />
            </svg>
          </span>
        </div>
      </header>
      {/* Main content */}
      <main className="w-full">
        {selectedRecipeId ? (
          <RecipeDetail recipeId={selectedRecipeId} onBack={() => setSelectedRecipeId(null)} />
        ) : (
          <RecipeList onSelectRecipe={setSelectedRecipeId} />
        )}
      </main>
    </div>
  );
};
