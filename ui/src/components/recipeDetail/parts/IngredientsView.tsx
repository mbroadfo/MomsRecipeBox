import React from 'react';
import type { IngredientGroup } from '../hooks/useWorkingRecipe';

export const IngredientsView: React.FC<{ groups: IngredientGroup[] }> = ({ groups }) => {
  return (
    <div className="section-block">
      <h2>Ingredients</h2>
      {groups.map((g, gi) => (
        <div key={gi} style={{ marginBottom: '1.3rem' }}>
          {g.group && <h3 style={{ margin: '0 0 .5rem', fontSize: '.85rem', textTransform:'uppercase', letterSpacing:'.1em', color:'#475569' }}>{g.group}</h3>}
          <ul className="ingredients-list">
            {g.items.map((it, ii) => <li key={ii}>{[it.quantity, it.name].filter(Boolean).join(' ')}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
};
