// File: ui/src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import defaultLogo from '../assets/default.png';
import { RecipeList } from '../components/RecipeList';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
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


  // Avatar dropdown state
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  // Sorting options
  const sortingOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'favorites', label: 'Most Favorited' },
    { value: 'az', label: 'A-Z' },
    { value: 'updated', label: 'Recently Updated' },
  ];
  const [sort, setSort] = useState<string>('newest');

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
          <div className="relative">
            <span
              style={{ display: 'inline-block', width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'linear-gradient(135deg, #e53e3e 60%, #3182ce 100%)', marginLeft: '16px', marginRight: '16px', cursor: 'pointer' }}
              onClick={() => setAvatarMenuOpen((open) => !open)}
              tabIndex={0}
              aria-label="User menu"
            >
              <svg viewBox="0 0 24 24" width="32" height="32" style={{ display: 'block', margin: 'auto', marginTop: '6px' }} fill="#fff">
                <circle cx="12" cy="9" r="4" />
                <path d="M4 20c0-3.313 3.134-6 7-6s7 2.687 7 6" />
              </svg>
            </span>
            {avatarMenuOpen && (
              <div className="absolute mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50" style={{ right: '0.5rem', minWidth: '10.5rem', whiteSpace: 'nowrap' }}>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => {/* TODO: Edit profile logic */ setAvatarMenuOpen(false); }}>Edit Profile</button>
                <div className="border-t border-gray-200 my-1"></div>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => {/* TODO: Logout logic */ setAvatarMenuOpen(false); }}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Add vertical spacing between header and main layout */}
      <div className="h-6"></div>

      {/* Main layout: drawer + content */}
      <div className="flex w-full min-h-[calc(100vh-6rem)]">{/* 6rem header height */}
        {/* Left nav drawer */}
        <aside
          className={`
            transition-all duration-300
            bg-gray-100 shadow-lg z-30
            ${drawerOpen ? 'w-72' : 'w-0'}
            overflow-hidden
            md:w-64 md:static md:shadow-none md:bg-gray-100
          `}
          style={{ minWidth: drawerOpen ? '18rem' : '0', maxWidth: '18rem' }}
          aria-hidden={!drawerOpen && window.innerWidth < 768}
        >
          {drawerOpen && (
            <div
              className="pl-8 pr-6 pt-6 pb-6 bg-gray-100 rounded-xl shadow-md"
              style={{ margin: '1rem', minHeight: 'calc(100vh - 7rem)' }}
            >
              <h2 className="font-bold text-xl mb-4">Filter Recipes</h2>
              <form className="flex flex-col gap-3 mb-6">
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
              <div
                className="mx-auto"
                style={{ borderTop: '1px solid #e5e7eb', opacity: 0.85, width: '100%', marginTop: '2.5rem', marginBottom: '2.5rem' }}
              ></div>
              <h2 className="font-bold text-xl mb-4">Sort By</h2>
              <form className="flex flex-col gap-3">
                {sortingOptions.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2">
                    <input type="radio" name="sort" value={opt.value} checked={sort === opt.value} onChange={() => setSort(opt.value)} />
                    {opt.label}
                  </label>
                ))}
              </form>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 w-full">
          <div className="flex justify-between items-center px-6 py-4">
            <h2 className="text-2xl font-bold">Recipes</h2>
            <button 
              onClick={() => {
                const userId = (window as any).currentUser?.id || (window as any).currentUserId || 'demo-user';
                fetch('/api/recipes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    title: 'New Recipe',
                    description: '',
                    owner_id: userId,
                    visibility: 'private',
                    ingredients: [],
                    steps: []
                  })
                })
                .then(res => res.json())
                .then(data => {
                  if (data._id) {
                    navigate(`/recipe/${data._id}`);
                  }
                })
                .catch(err => {
                  console.error('Error creating recipe:', err);
                  alert('Failed to create new recipe');
                });
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Recipe
            </button>
          </div>
          <RecipeList
            onSelectRecipe={(id) => navigate(`/recipe/${id}`)}
            filter={filter}
            sort={sort}
            maxColumns={5}
          />
        </main>
      </div>
    </div>
  );
};
