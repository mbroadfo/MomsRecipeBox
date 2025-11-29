import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface PageAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

interface PageActionsContextType {
  actions: PageAction[];
  setActions: (actions: PageAction[]) => void;
  clearActions: () => void;
}

const PageActionsContext = createContext<PageActionsContextType | undefined>(undefined);

export const PageActionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [actions, setActions] = useState<PageAction[]>([]);

  const clearActions = () => setActions([]);

  return (
    <PageActionsContext.Provider value={{ actions, setActions, clearActions }}>
      {children}
    </PageActionsContext.Provider>
  );
};

export const usePageActions = () => {
  const context = useContext(PageActionsContext);
  if (!context) {
    throw new Error('usePageActions must be used within PageActionsProvider');
  }
  return context;
};
