import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { getApiUrl } from '../../config/environment.js';
import type { RawRecipe } from '../recipeDetail/hooks/useRecipe';
import type { IngredientGroup, IngredientItem } from '../recipeDetail/hooks/useWorkingRecipe';
import './CookingMode.css';

type Tab = 'ingredients' | 'instructions';

interface ScrollPositions {
  ingredients: number;
  instructions: number;
}

interface CheckedItems {
  ingredients: Set<number>;
  instructions: Set<number>;
}

export const CookingMode: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  
  const [recipe, setRecipe] = useState<RawRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('ingredients');
  const [scrollPositions, setScrollPositions] = useState<ScrollPositions>({
    ingredients: 0,
    instructions: 0
  });
  const [checkedItems, setCheckedItems] = useState<CheckedItems>(() => {
    // Load from sessionStorage on mount
    if (id && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`cooking-checked-${id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            ingredients: new Set(parsed.ingredients || []),
            instructions: new Set(parsed.instructions || [])
          };
        } catch {
          // If parse fails, return empty
        }
      }
    }
    return {
      ingredients: new Set(),
      instructions: new Set()
    };
  });
  
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Load checkmarks when recipe ID changes (navigating to different recipe)
  useEffect(() => {
    if (id && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`cooking-checked-${id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCheckedItems({
            ingredients: new Set(parsed.ingredients || []),
            instructions: new Set(parsed.instructions || [])
          });
        } catch {
          // If parse fails, reset to empty
          setCheckedItems({
            ingredients: new Set(),
            instructions: new Set()
          });
        }
      } else {
        // No stored data for this recipe, reset to empty
        setCheckedItems({
          ingredients: new Set(),
          instructions: new Set()
        });
      }
    }
  }, [id]); // Run whenever recipe ID changes

  // Save to sessionStorage whenever checkmarks change
  useEffect(() => {
    if (id && typeof window !== 'undefined') {
      const toStore = {
        ingredients: Array.from(checkedItems.ingredients),
        instructions: Array.from(checkedItems.instructions)
      };
      sessionStorage.setItem(`cooking-checked-${id}`, JSON.stringify(toStore));
    }
  }, [checkedItems, id]);

  // Load recipe data
  useEffect(() => {
    const loadRecipe = async () => {
      if (!id) return;
      
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: 'https://momsrecipebox/api'
          }
        });

        const response = await fetch(getApiUrl(`recipes/${id}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load recipe');
        }

        const data = await response.json();
        setRecipe(data);
      } catch (error) {
        console.error('Error loading recipe:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [id, getAccessTokenSilently]);

  // Save scroll position when tab changes
  const handleTabChange = (newTab: Tab) => {
    if (contentRef.current && activeTab !== newTab) {
      // Save current scroll position
      setScrollPositions(prev => ({
        ...prev,
        [activeTab]: contentRef.current?.scrollTop || 0
      }));
      
      // Switch tab
      setActiveTab(newTab);
    }
  };

  // Restore scroll position after tab change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = scrollPositions[activeTab];
    }
  }, [activeTab, scrollPositions]);

  const toggleIngredient = (index: number) => {
    setCheckedItems(prev => {
      const newIngredients = new Set(prev.ingredients);
      if (newIngredients.has(index)) {
        newIngredients.delete(index);
      } else {
        newIngredients.add(index);
      }
      return { ...prev, ingredients: newIngredients };
    });
  };

  const toggleInstruction = (index: number) => {
    setCheckedItems(prev => {
      const newInstructions = new Set(prev.instructions);
      if (newInstructions.has(index)) {
        newInstructions.delete(index);
      } else {
        newInstructions.add(index);
      }
      return { ...prev, instructions: newInstructions };
    });
  };

  const clearAllIngredients = () => {
    setCheckedItems(prev => ({
      ...prev,
      ingredients: new Set()
    }));
  };

  const clearAllInstructions = () => {
    setCheckedItems(prev => ({
      ...prev,
      instructions: new Set()
    }));
  };

  const handleBack = () => {
    navigate(`/recipe/${id}`);
  };

  if (loading) {
    return (
      <div className="cooking-mode">
        <div className="cooking-loading">
          <div className="cooking-spinner"></div>
          <p>Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="cooking-mode">
        <div className="cooking-error">
          <p>Recipe not found</p>
          <button onClick={() => navigate('/')} className="cooking-back-btn">
            Back to Recipes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cooking-mode">
      {/* Header with back button and tabs */}
      <div className="cooking-header">
        <button 
          onClick={handleBack}
          className="cooking-back-button"
          aria-label="Back to recipe"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <div className="cooking-tabs">
          <button
            className={`cooking-tab ${activeTab === 'ingredients' ? 'active' : ''}`}
            onClick={() => handleTabChange('ingredients')}
          >
            Ingredients
          </button>
          <button
            className={`cooking-tab ${activeTab === 'instructions' ? 'active' : ''}`}
            onClick={() => handleTabChange('instructions')}
          >
            Instructions
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="cooking-content" ref={contentRef}>
        {activeTab === 'ingredients' && (
          <div className="cooking-section">
            <div className="cooking-section-header">
              <h2 className="cooking-section-title">{recipe.title}</h2>
              {checkedItems.ingredients.size > 0 && (
                <button 
                  onClick={clearAllIngredients}
                  className="cooking-clear-button"
                  aria-label="Clear all ingredient checkmarks"
                >
                  Clear All
                </button>
              )}
            </div>
            {recipe.yield && (
              <div className="cooking-yield">
                <strong>Yield:</strong> {recipe.yield}
              </div>
            )}
            <div className="cooking-ingredients">
              {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
                (() => {
                  let flatIndex = 0;
                  return recipe.ingredients.map((ing: unknown, groupIndex: number) => {
                    // Handle both flat ingredients and grouped ingredients
                    const ingredient = ing as (IngredientGroup | IngredientItem);
                    const ingredientGroup = ingredient as IngredientGroup;
                    const ingredientItem = ingredient as IngredientItem;
                    
                    if (ingredientGroup.items && Array.isArray(ingredientGroup.items)) {
                      // Grouped ingredients
                      return (
                        <React.Fragment key={groupIndex}>
                          {ingredientGroup.group && (
                            <div className="cooking-ingredient-group">{ingredientGroup.group}</div>
                          )}
                          {ingredientGroup.items.map((item: IngredientItem) => {
                            const currentIndex = flatIndex++;
                            const isChecked = checkedItems.ingredients.has(currentIndex);
                            return (
                              <div 
                                key={currentIndex} 
                                className={`cooking-ingredient ${isChecked ? 'checked' : ''}`}
                                onClick={() => toggleIngredient(currentIndex)}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleIngredient(currentIndex)}
                                  className="cooking-checkbox"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                {item.quantity && (
                                  <span className="cooking-ingredient-quantity">{item.quantity}</span>
                                )}
                                <span className="cooking-ingredient-name">{item.name}</span>
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    }
                    
                    // Flat ingredient
                    const currentIndex = flatIndex++;
                    const isChecked = checkedItems.ingredients.has(currentIndex);
                    return (
                      <div 
                        key={groupIndex} 
                        className={`cooking-ingredient ${isChecked ? 'checked' : ''}`}
                        onClick={() => toggleIngredient(currentIndex)}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleIngredient(currentIndex)}
                          className="cooking-checkbox"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {ingredientItem.quantity && (
                          <span className="cooking-ingredient-quantity">{ingredientItem.quantity}</span>
                        )}
                        <span className="cooking-ingredient-name">{ingredientItem.name}</span>
                      </div>
                    );
                  });
                })()
              ) : (
                <p className="cooking-empty">No ingredients listed</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'instructions' && (
          <div className="cooking-section">
            <div className="cooking-section-header">
              <h2 className="cooking-section-title">{recipe.title}</h2>
              {checkedItems.instructions.size > 0 && (
                <button 
                  onClick={clearAllInstructions}
                  className="cooking-clear-button"
                  aria-label="Clear all instruction checkmarks"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="cooking-instructions">
              {recipe.instructions && recipe.instructions.length > 0 ? (
                recipe.instructions.map((instruction, index) => {
                  const isChecked = checkedItems.instructions.has(index);
                  return (
                    <div 
                      key={index} 
                      className={`cooking-instruction ${isChecked ? 'checked' : ''}`}
                      onClick={() => toggleInstruction(index)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleInstruction(index)}
                        className="cooking-checkbox"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="cooking-instruction-number">{index + 1}</div>
                      <div className="cooking-instruction-text">{instruction}</div>
                    </div>
                  );
                })
              ) : (
                <p className="cooking-empty">No instructions listed</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
