// File: ui/src/pages/HomePage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RecipeList } from '../components/RecipeList';
import './HomePage.css';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');
  const [sortMenuOpen, setSortMenuOpen] = useState<boolean>(false);

  // Sorting options
  const sortingOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'favorites', label: 'Most Favorited' },
    { value: 'az', label: 'A-Z' },
    { value: 'updated', label: 'Recently Updated' },
  ];
  const [sort, setSort] = useState<string>('newest');

  // Handle clicking outside of the sort dropdown to close it
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.sort-dropdown-button') && !target.closest('.sort-dropdown-menu')) {
        setSortMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-gray-50 text-gray-900">
      <div className="min-h-[calc(100vh-4.5rem)]">
        {/* Sticky Filter Toolbar */}
        <div className="filter-toolbar">
          {/* Left: Add Recipe Button */}
          <button 
            onClick={() => navigate('/recipe/new')}
            className="btn-add-recipe"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add Recipe</span>
          </button>
          
          {/* Center: Filter Segmented Control */}
          <div className="filter-section">
            <div className="filter-label">Show:</div>
            <div className="filter-segmented-control">
              <button 
                className={`filter-segment-button ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button 
                className={`filter-segment-button ${filter === 'mine' ? 'active' : ''}`}
                onClick={() => setFilter('mine')}
              >
                My Recipes
              </button>
              <button 
                className={`filter-segment-button ${filter === 'families' ? 'active' : ''}`}
                onClick={() => setFilter('families')}
              >
                My Family's
              </button>
              <button 
                className={`filter-segment-button ${filter === 'favorites' ? 'active' : ''}`}
                onClick={() => setFilter('favorites')}
              >
                My Favorites
              </button>
            </div>
          </div>
          
          {/* Sort Dropdown */}
          <div className="sort-section">
            <div className="sort-label">Sort By:</div>
            <div className="relative">
              <button 
                className="sort-dropdown-button"
                onClick={() => setSortMenuOpen(prev => !prev)}
              >
                <span>{sortingOptions.find(opt => opt.value === sort)?.label || 'Sort'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            
              {sortMenuOpen && (
                <div className="sort-dropdown-menu">
                  {sortingOptions.map(option => (
                    <div 
                      key={option.value}
                      className="sort-dropdown-item"
                      onClick={() => {
                        setSort(option.value);
                        setSortMenuOpen(false);
                      }}
                    >
                      <span>{option.label}</span>
                      {sort === option.value && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right: Shopping List Button */}
          <Link 
            to="/shopping-list" 
            className="btn-shopping-list"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span>Shopping List</span>
          </Link>
        </div>

        {/* Main content */}
        <main className="w-full px-4 py-2">
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
