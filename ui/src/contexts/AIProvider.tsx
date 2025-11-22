import React, { useState } from 'react';
import { AIContext, type PageContext } from './AIContext';

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);

  const showAI = (context?: PageContext) => {
    if (context) {
      setPageContext(context);
    }
    setIsVisible(true);
  };

  const hideAI = () => {
    setIsVisible(false);
    // Keep context for a moment in case panel reopens quickly
    setTimeout(() => setPageContext(null), 500);
  };

  const toggleAI = (context?: PageContext) => {
    if (!isVisible && context) {
      setPageContext(context);
    }
    setIsVisible(prev => !prev);
  };

  return (
    <AIContext.Provider value={{ isVisible, pageContext, showAI, hideAI, toggleAI }}>
      {children}
    </AIContext.Provider>
  );
};
