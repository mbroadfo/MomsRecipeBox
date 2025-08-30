import React from 'react';
import type { ReactNode } from 'react';
import { Header } from './Header';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
  onToggleSidebar?: () => void;
  showSidebar?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  onToggleSidebar, 
  showSidebar = false 
}) => {
  return (
    <div className="app-layout bg-gray-50 text-gray-900">
      <Header 
        onToggleSidebar={onToggleSidebar} 
        showSidebar={showSidebar}
      />
      <div className="app-content">
        {children}
      </div>
    </div>
  );
};

export default Layout;
