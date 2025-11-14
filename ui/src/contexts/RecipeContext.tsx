import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Recipe = Record<string, any>;

interface RecipeContextType {
  currentRecipe: Recipe | null;
  recipeMode: 'view' | 'edit' | 'new' | null;
  setCurrentRecipe: (recipe: Recipe | null) => void;
  setRecipeMode: (mode: 'view' | 'edit' | 'new' | null) => void;
}

const RecipeContext = createContext<RecipeContextType>({
  currentRecipe: null,
  recipeMode: null,
  setCurrentRecipe: () => {},
  setRecipeMode: () => {},
});

export const RecipeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [recipeMode, setRecipeMode] = useState<'view' | 'edit' | 'new' | null>(null);

  return (
    <RecipeContext.Provider value={{ currentRecipe, recipeMode, setCurrentRecipe, setRecipeMode }}>
      {children}
    </RecipeContext.Provider>
  );
};

export const useRecipe = () => {
  return useContext(RecipeContext);
};
