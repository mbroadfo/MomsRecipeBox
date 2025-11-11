import React from 'react';
import './ResponsiveLayout.css';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ResponsiveLayout provides a consistent container structure for desktop and mobile.
 * On desktop: Creates a two-column layout with main content and optional sidebar
 * On mobile: Stacks content vertically with full-width containers
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  className = '',
  style = {},
}) => {
  return (
    <div 
      className={`responsive-layout ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: '100vh',
        ...style
      }}
    >
      {/* Mobile-first: Stack everything vertically */}
      <div 
        className="layout-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          padding: '0 1rem',
          gap: '1rem',
        }}
      >
        {/* Main Content Area */}
        <main 
          className={`main-content ${!sidebar ? 'full-width' : ''}`}
          style={{
            flex: 1,
            minWidth: 0, // Prevents flex item from overflowing
            width: '100%',
          }}
        >
          {children}
        </main>

        {/* Sidebar Area (if provided) */}
        {sidebar && (
          <aside 
            className="sidebar"
            style={{
              width: '100%',
            }}
          >
            {sidebar}
          </aside>
        )}
      </div>
    </div>
  );
};

/**
 * FullWidthContainer ensures content spans the full width without constraints
 * Useful for components that need to break out of padding constraints
 */
export const FullWidthContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className = '', style = {} }) => {
  return (
    <div 
      className={`full-width-container ${className}`}
      style={{
        width: '100%',
        margin: 0,
        padding: 0,
        ...style
      }}
    >
      {children}
    </div>
  );
};

/**
 * ContentSection provides consistent spacing and structure for recipe sections
 */
export const ContentSection: React.FC<{
  children: React.ReactNode;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, title, className = '', style = {} }) => {
  return (
    <section 
      className={`content-section ${className}`}
      style={{
        marginBottom: '1.5rem',
        ...style
      }}
    >
      {title && (
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          marginBottom: '0.75rem',
          color: '#374151'
        }}>
          {title}
        </h3>
      )}
      {children}
    </section>
  );
};