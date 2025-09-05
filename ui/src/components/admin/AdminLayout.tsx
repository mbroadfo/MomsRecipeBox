import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminContext';
import './AdminLayout.css';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAdminAuth();
  const location = useLocation();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      )
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      )
    },
    {
      name: 'Recipe Moderation',
      href: '/admin/recipes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      disabled: true // Coming in Phase 3
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      disabled: true // Coming in Phase 4
    }
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-sidebar-content">
          {/* Header */}
          <div className="admin-sidebar-header">
            <h1 className="admin-sidebar-title">Admin Panel</h1>
          </div>

          {/* Navigation */}
          <nav className="admin-navigation">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.disabled ? '#' : item.href}
                className={`admin-nav-item ${
                  item.disabled 
                    ? 'admin-nav-item-disabled' 
                    : isActiveRoute(item.href)
                      ? 'admin-nav-item-active'
                      : 'admin-nav-item-default'
                }`}
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                {item.name}
                {item.disabled && (
                  <span className="admin-nav-badge">
                    Soon
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="admin-sidebar-footer">
            <div className="admin-user-info">
              <div className="admin-user-avatar">
                <span className="admin-user-initial">
                  {user?.given_name?.[0] || user?.name?.[0] || 'A'}
                </span>
              </div>
              <div className="admin-user-details">
                <p className="admin-user-name">
                  {user?.name || user?.email || 'Admin User'}
                </p>
                <p className="admin-user-role">Administrator</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="admin-logout-btn"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-header">
          <div className="admin-header-content">
            <div className="admin-header-inner">
              <h2 className="admin-page-title">
                {location.pathname === '/admin' && 'Dashboard'}
                {location.pathname.startsWith('/admin/users') && 'User Management'}
                {location.pathname.startsWith('/admin/recipes') && 'Recipe Moderation'}
                {location.pathname.startsWith('/admin/analytics') && 'Analytics'}
              </h2>
              <div className="admin-header-actions">
                <Link
                  to="/"
                  className="admin-back-link"
                >
                  ← Back to App
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
