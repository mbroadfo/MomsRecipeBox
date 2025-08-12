import React from 'react';
import type { IngredientGroup } from '../hooks/useWorkingRecipe';

export const IngredientsView: React.FC<{ groups: IngredientGroup[] }> = ({ groups }) => {
  const list = groups[0];
  return (
    <div className="section-block">
      <h2>Ingredients</h2>
      <ul className="ingredients-list">
        {list.items.map((it, ii) => <li key={ii}>{[it.quantity, it.name].filter(Boolean).join(' ')}</li>)}
      </ul>
    </div>
  );
};
