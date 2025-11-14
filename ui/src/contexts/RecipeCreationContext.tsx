import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface ParsedRecipe {
  title?: string;
  subtitle?: string;
  description?: string;
  author?: string;
  source?: string;
  yield?: string;
  time?: { prep?: string; cook?: string; total?: string };
  ingredients?: { quantity?: string; name?: string }[];
  steps?: string[];
  tags?: string[];
  notes?: string;
  imageUrl?: string;
}

interface RecipeCreationContextType {
  onApplyRecipe?: (recipe: ParsedRecipe) => Promise<void>;
}

const RecipeCreationContext = createContext<RecipeCreationContextType>({});

export const RecipeCreationProvider: React.FC<{ 
  children: ReactNode;
  onApplyRecipe?: (recipe: ParsedRecipe) => Promise<void>;
}> = ({ children, onApplyRecipe }) => {
  return (
    <RecipeCreationContext.Provider value={{ onApplyRecipe }}>
      {children}
    </RecipeCreationContext.Provider>
  );
};

export const useRecipeCreation = () => {
  return useContext(RecipeCreationContext);
};
