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
        <div className="flex items-center gap-4 min-w-0">
          <img src={defaultLogo} alt="MRB Logo" style={{ height: '3rem', width: '3rem', minHeight: '2rem', minWidth: '2rem', maxHeight: '3rem', maxWidth: '3rem' }} className="h-3 w-3" />
          <span className="font-bold text-2xl tracking-tight whitespace-nowrap">Mom's Recipe Box</span>
          <span className="ml-4 text-base text-gray-500 truncate">Family favorites, all in one place</span>
        </div>
        {/* Dropdown menu for navigation */}
        <div className="relative flex-1 flex justify-center">
          <div className="group inline-block">
            <button className="flex items-center gap-2 font-medium hover:text-blue-600 px-4 py-2 rounded-md bg-white shadow hover:bg-gray-100">
              Recipes...
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block bg-white border rounded shadow-lg min-w-[160px] z-10">
              <a href="#" className="block px-4 py-2 hover:bg-gray-100 text-gray-700">My Favorites</a>
              <a href="#" className="block px-4 py-2 hover:bg-gray-100 text-gray-700">My Recipes</a>
              <a href="#" className="block px-4 py-2 hover:bg-gray-100 text-gray-700">My Family</a>
            </div>
          </div>
        </div>
        <div className="relative flex items-center">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200">
            <span className="material-icons text-2xl">account_circle</span>
          </button>
          {/* Dropdown (placeholder) */}
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
