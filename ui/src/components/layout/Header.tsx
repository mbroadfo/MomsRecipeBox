import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import defaultLogo from '../../assets/default.png';
import './Header.css';

interface HeaderProps {
  // No sidebar props needed anymore
}

export const Header: React.FC<HeaderProps> = () => {
  const location = useLocation();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const { user, logout } = useAuth0();

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
          <div className="flex flex-col">
            <span className="app-title block">Mom's Recipe Box</span>
            <span className="font-semibold italic text-blue-500 drop-shadow-sm text-sm md:text-lg">
              Family favorites, all in one place
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center justify-end gap-3 md:gap-4 flex-shrink-0 ml-auto">
        <nav className="hidden md:flex gap-8 mr-4">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'nav-link-active' : 'text-gray-700 hover:text-blue-500'}`}
          >
            Recipes
          </Link>
        </nav>
        
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
              <button className="avatar-dropdown-item" onClick={() => {/* TODO: Edit profile logic */ setAvatarMenuOpen(false); }}>Edit Profile</button>
              <div className="avatar-dropdown-divider"></div>
              <Link 
                to="/admin" 
                className="avatar-dropdown-item avatar-dropdown-admin"
                onClick={() => setAvatarMenuOpen(false)}
              >
                Admin Panel
              </Link>
              <div className="avatar-dropdown-divider"></div>
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
    </header>
  );
};

export default Header;
