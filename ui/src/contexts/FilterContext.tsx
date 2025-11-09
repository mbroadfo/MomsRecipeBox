// File: ui/src/contexts/FilterContext.tsx
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface FilterContextType {
  filter: string;
  setFilter: (filter: string) => void;
  sort: string;
  setSort: (sort: string) => void;
  sortMenuOpen: boolean;
  setSortMenuOpen: (open: boolean) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filter, setFilter] = useState<string>('all');
  const [sort, setSort] = useState<string>('newest');
  const [sortMenuOpen, setSortMenuOpen] = useState<boolean>(false);

  const value: FilterContextType = {
    filter,
    setFilter,
    sort,
    setSort,
    sortMenuOpen,
    setSortMenuOpen,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};