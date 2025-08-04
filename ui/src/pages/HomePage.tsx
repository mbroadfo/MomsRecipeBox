// File: ui/src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import defaultLogo from '../assets/default.png';
import { RecipeList } from '../components/RecipeList';
import { RecipeDetail } from '../components/RecipeDetail';

export const HomePage: React.FC = () => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(window.innerWidth >= 768);
  // Responsive drawer: open by default on desktop, closed on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setDrawerOpen(true);
      } else {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [filter, setFilter] = useState<string>('all');


  // Responsive drawer styles
  const drawerBase = "fixed top-0 left-0 h-full bg-white shadow-lg z-30 transition-transform duration-300";
  const drawerWidth = "w-72";
  const drawerClosed = "-translate-x-full";
  const drawerOpenClass = "translate-x-0";


  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header always on top */}
      <header className="flex items-center justify-between px-10 py-5 bg-white shadow-md w-full">
        <div className="flex items-center gap-8 min-w-0">
          <button
            type="button"
            aria-label="Toggle navigation drawer"
            onClick={() => setDrawerOpen((open) => !open)}
            className="focus:outline-none"
            style={{ background: 'none', border: 'none', padding: 0, marginRight: '2rem', cursor: 'pointer' }}
          >
            <img src={defaultLogo} alt="MRB Logo" style={{ height: '4.5rem', width: '4.5rem', minHeight: '3rem', minWidth: '3rem', maxHeight: '4.5rem', maxWidth: '4.5rem' }} />
          </button>
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

      {/* Main layout: drawer + content */}
      <div className="flex w-full min-h-[calc(100vh-6rem)]">{/* 6rem header height */}
        {/* Left nav drawer */}
        <aside
          className={`
            transition-all duration-300
            bg-white shadow-lg z-30
            ${drawerOpen ? 'w-72' : 'w-0'}
            overflow-hidden
            md:w-64 md:static md:shadow-none md:bg-transparent
          `}
          style={{ minWidth: drawerOpen ? '18rem' : '0', maxWidth: '18rem' }}
          aria-hidden={!drawerOpen && window.innerWidth < 768}
        >
          {drawerOpen && (
            <div
              className="pl-8 pr-6 pt-6 pb-6 bg-white rounded-xl shadow-md"
              style={{ margin: '1rem', minHeight: 'calc(100vh - 7rem)' }}
            >
              <h2 className="font-bold text-xl mb-4">Filter Recipes</h2>
              <form className="flex flex-col gap-3">
                <label className="flex items-center gap-2">
                  <input type="radio" name="filter" value="all" checked={filter === 'all'} onChange={() => setFilter('all')} />
                  All
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="filter" value="mine" checked={filter === 'mine'} onChange={() => setFilter('mine')} />
                  My Recipes
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="filter" value="families" checked={filter === 'families'} onChange={() => setFilter('families')} />
                  My Families
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="filter" value="favorites" checked={filter === 'favorites'} onChange={() => setFilter('favorites')} />
                  My Favorites
                </label>
              </form>
              <div className="mt-8">
                <h2 className="font-bold text-xl mb-4">Sort By</h2>
                {/* Sorting controls placeholder */}
                <div className="text-gray-400 italic">(Sorting controls coming soon)</div>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full">
          {selectedRecipeId ? (
            <RecipeDetail recipeId={selectedRecipeId} onBack={() => setSelectedRecipeId(null)} />
          ) : (
            <RecipeList onSelectRecipe={setSelectedRecipeId} filter={filter} />
          )}
        </main>
      </div>
    </div>
  );
};
