import React, { createContext, useContext, useState } from 'react';

interface AIContextType {
  isVisible: boolean;
  showAI: () => void;
  hideAI: () => void;
  toggleAI: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);

  const showAI = () => setIsVisible(true);
  const hideAI = () => setIsVisible(false);
  const toggleAI = () => setIsVisible(prev => !prev);

  return (
    <AIContext.Provider value={{ isVisible, showAI, hideAI, toggleAI }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};
