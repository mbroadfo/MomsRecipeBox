import React from 'react';
import type { ReactNode } from 'react';
import { FilterProvider } from '../../contexts/FilterContext';
import { Header } from './Header';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children 
}) => {
  return (
    <FilterProvider>
      <div className="app-layout bg-gray-50 text-gray-900">
        <Header />
        <div className="app-content p-0 m-0">
          {children}
        </div>
      </div>
    </FilterProvider>
  );
};

export default Layout;
