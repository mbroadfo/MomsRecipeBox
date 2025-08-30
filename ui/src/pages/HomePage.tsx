// File: ui/src/pages/HomePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    
    // Listen for toggle sidebar events from the Layout component
    const toggleSidebar = () => {
      setDrawerOpen(prev => !prev);
    };
    window.addEventListener('toggle-sidebar', toggleSidebar);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('toggle-sidebar', toggleSidebar);
    };
  }, []);
  const [filter, setFilter] = useState<string>('all');

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
    <div className="bg-gray-50 text-gray-900">
      {/* Main layout: drawer + content */}
      <div className="flex w-full min-h-[calc(100vh-4.5rem)]">{/* Adjusted for new header height */}
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
              onClick={() => navigate('/recipe/new')}
              style={{ 
                backgroundColor: '#2563eb', 
                color: 'white', 
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '1rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
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
