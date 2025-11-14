import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { isUserAdmin } from '../../auth/types';
import { useFilter } from '../../contexts/FilterContext';
import { useAI } from '../../contexts/AIContext';
import defaultLogo from '../../assets/default.png';
import './Header.css';

export const Header: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  
  // Get filter context (always available now since FilterProvider wraps everything)
  const { filter, setFilter, sort, setSort } = useFilter();
  const { isVisible: aiVisible, toggleAI } = useAI();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth0();

  // Check if current user has admin privileges
  const userIsAdmin = user ? isUserAdmin(user) : false;

  // Debug: Log admin status for verification
  if (user && import.meta.env.DEV) {
    console.log('🔍 Header admin check:', {
      userEmail: user.email,
      isAdmin: userIsAdmin,
      momsRoles: user['https://momsrecipebox.app/roles'],
      cruiseRoles: user['https://cruise-viewer.app/roles'],
      appMetadata: user.app_metadata?.role
    });
  }

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  };

  return (
    <header className="app-header flex items-center justify-between">
      <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-shrink-0">
        
        <Link to="/" className="flex items-center gap-4 flex-shrink-0">
          <img src={defaultLogo} alt="MRB Logo" className="app-logo" />
          <div className="flex flex-col mobile-header-text">
            <span className="app-title block">Mom's Recipe Box</span>
            <span className="app-tagline font-semibold italic text-blue-500 drop-shadow-sm text-sm md:text-lg">
              Family favorites, all in one place
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center justify-end gap-3 md:gap-4 flex-shrink-0 ml-auto">
        {/* Mobile: Hamburger menu (only show on HomePage) */}
        {location.pathname === '/' && (
          <button
            className="mobile-hamburger-btn md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Filter and sort menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        )}
        
        <nav className="hidden md:flex gap-8 mr-4">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'nav-link-active' : 'text-gray-700 hover:text-blue-500'}`}
          >
            Recipes
          </Link>
        </nav>
        
        {/* AI Assistant Toggle Button */}
        <button
          onClick={toggleAI}
          className="ai-toggle-btn"
          aria-label="AI Assistant"
          title="AI Assistant"
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={aiVisible ? 'ai-icon-active' : ''}
          >
            {/* Sparkles/AI icon */}
            <path d="M12 3L14 8L19 10L14 12L12 17L10 12L5 10L10 8L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
          </svg>
        </button>
        
        <div className="relative">
          <span
            style={{ 
              display: 'inline-block', 
              width: '2.5rem', 
              height: '2.5rem', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #e53e3e 60%, #3182ce 100%)', 
              cursor: 'pointer' 
            }}
            onClick={() => setAvatarMenuOpen((open) => !open)}
            tabIndex={0}
            aria-label="User menu"
            className="flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" width="32" height="32" style={{ display: 'block', margin: 'auto', marginTop: '6px' }} fill="#fff">
              <circle cx="12" cy="9" r="4" />
              <path d="M4 20c0-3.313 3.134-6 7-6s7 2.687 7 6" />
            </svg>
          </span>
          {avatarMenuOpen && (
            <div className="avatar-dropdown">
              {user && (
                <>
                  <div className="px-4 py-2 text-sm text-gray-600 border-b">
                    <div className="font-medium">{user.name || user.email}</div>
                    {user.name && user.email && (
                      <div className="text-xs text-gray-500">{user.email}</div>
                    )}
                  </div>
                </>
              )}
              <Link 
                to="/profile" 
                className="avatar-dropdown-item"
                onClick={() => setAvatarMenuOpen(false)}
              >
                Edit Profile
              </Link>
              <div className="avatar-dropdown-divider"></div>
              {userIsAdmin && (
                <>
                  <Link 
                    to="/admin" 
                    className="avatar-dropdown-item avatar-dropdown-admin"
                    onClick={() => {
                      console.log('🔗 Admin panel link clicked');
                      setAvatarMenuOpen(false);
                    }}
                  >
                    Admin Panel
                  </Link>
                  <div className="avatar-dropdown-divider"></div>
                </>
              )}
              <button 
                className="avatar-dropdown-item" 
                onClick={() => {
                  setAvatarMenuOpen(false);
                  handleLogout();
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter/Sort Menu */}
      {mobileMenuOpen && isHomePage && (
        <div className="mobile-filter-menu">
          {/* Filter Section */}
          <div className="mobile-menu-section">
            <h3 className="mobile-menu-title">Show:</h3>
            <div className="mobile-menu-buttons">
              <button 
                className={`mobile-menu-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setFilter?.('all');
                  setMobileMenuOpen(false);
                }}
              >
                All
              </button>
              <button 
                className={`mobile-menu-btn ${filter === 'mine' ? 'active' : ''}`}
                onClick={() => {
                  setFilter?.('mine');
                  setMobileMenuOpen(false);
                }}
              >
                Mine
              </button>
              <button 
                className={`mobile-menu-btn ${filter === 'families' ? 'active' : ''}`}
                onClick={() => {
                  setFilter?.('families');
                  setMobileMenuOpen(false);
                }}
              >
                Family
              </button>
              <button 
                className={`mobile-menu-btn ${filter === 'favorites' ? 'active' : ''}`}
                onClick={() => {
                  setFilter?.('favorites');
                  setMobileMenuOpen(false);
                }}
              >
                Favorites
              </button>
            </div>
          </div>

          {/* Sort Section */}
          <div className="mobile-menu-section">
            <h3 className="mobile-menu-title">Sort by:</h3>
            <div className="mobile-menu-buttons">
              <button 
                className={`mobile-menu-btn ${sort === 'newest' ? 'active' : ''}`}
                onClick={() => {
                  setSort?.('newest');
                  setMobileMenuOpen(false);
                }}
              >
                Newest
              </button>
              <button 
                className={`mobile-menu-btn ${sort === 'popular' ? 'active' : ''}`}
                onClick={() => {
                  setSort?.('popular');
                  setMobileMenuOpen(false);
                }}
              >
                Most Popular
              </button>
              <button 
                className={`mobile-menu-btn ${sort === 'favorites' ? 'active' : ''}`}
                onClick={() => {
                  setSort?.('favorites');
                  setMobileMenuOpen(false);
                }}
              >
                Most Favorited
              </button>
              <button 
                className={`mobile-menu-btn ${sort === 'az' ? 'active' : ''}`}
                onClick={() => {
                  setSort?.('az');
                  setMobileMenuOpen(false);
                }}
              >
                A-Z
              </button>
              <button 
                className={`mobile-menu-btn ${sort === 'updated' ? 'active' : ''}`}
                onClick={() => {
                  setSort?.('updated');
                  setMobileMenuOpen(false);
                }}
              >
                Recently Updated
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
