import { createContext, useContext } from 'react';

export interface PageContext {
  page: 'shopping-list' | 'recipe' | 'other';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

export interface AIContextType {
  isVisible: boolean;
  pageContext: PageContext | null;
  showAI: (context?: PageContext) => void;
  hideAI: () => void;
  toggleAI: (context?: PageContext) => void;
}

export const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
