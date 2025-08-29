import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  chip?: React.ReactNode;
}

interface ActionMenuProps {
  label: string;
  items: ActionMenuItem[];
}

const ActionMenu: React.FC<ActionMenuProps> = ({ label, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useRef(`menu-${Math.random().toString(36).substring(2, 9)}`).current;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
        id={`${menuId}-button`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen(!isOpen)}
      >
        {label}
        <MoreVertical className="w-4 h-4 ml-1" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-30 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-1"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={`${menuId}-button`}
        >
          {items.map((item, index) => (
            <button
              key={index}
              className={`
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'}
                ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
                group flex w-full items-center px-4 py-2 text-sm
              `}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  setIsOpen(false);
                }
              }}
            >
              {item.icon && (
                <span className="mr-3 h-5 w-5">{item.icon}</span>
              )}
              <span className="flex-1 text-left">{item.label}</span>
              {item.chip && (
                <span className="ml-2">{item.chip}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
