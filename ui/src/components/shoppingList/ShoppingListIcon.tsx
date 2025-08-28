import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShoppingList } from './useShoppingList';

interface ShoppingListIconProps {
  className?: string;
}

const ShoppingListIcon: React.FC<ShoppingListIconProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { shoppingList } = useShoppingList();
  
  const itemCount = shoppingList?.items.length || 0;
  const hasItems = itemCount > 0;
  
  return (
    <button
      onClick={() => navigate('/shopping-list')}
      className={`relative p-2 hover:bg-gray-100 rounded-full ${className}`}
      aria-label="Shopping List"
      title="Shopping List"
    >
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        className="text-gray-700"
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <circle cx="8" cy="21" r="1"></circle>
        <circle cx="19" cy="21" r="1"></circle>
        <path d="M2 2h2l3.6 12h10.8l3.6-9H5.5"></path>
      </svg>
      
      {hasItems && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  );
};

export default ShoppingListIcon;
