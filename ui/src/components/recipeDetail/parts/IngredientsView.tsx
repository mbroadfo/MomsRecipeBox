import React from 'react';
import type { IngredientGroup } from '../hooks/useWorkingRecipe';

export const IngredientsView: React.FC<{ groups: IngredientGroup[] }> = ({ groups }) => {
  const list = groups[0] || { items: [] } as IngredientGroup;
  return (
    <div className="section-block">
      <h2>Ingredients</h2>
      <ul className="ingredients-list">
        {list.items.map((it, ii) => {
          const rawName: any = (it as any).name;
          const rawQty: any = (it as any).quantity;
          const name = typeof rawName === 'string' ? rawName.trim() : '';
          const qty = typeof rawQty === 'string' ? rawQty.trim() : '';
          const isGroup = !name && !!qty; // quantity used as group label when name blank
          if (isGroup) {
            return (
              <li
                key={ii}
                style={{
                  listStyle: 'none',
                  paddingLeft: 0,
                  fontWeight: 700,
                  marginTop: ii === 0 ? 0 : '0.75rem',
                }}
                className="ingredient-group-label"
              >
                <span
                  style={{
                    fontSize: '.9rem',
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    color: '#334155',
                  }}
                >
                  {qty}
                </span>
              </li>
            );
          }
          if (!name && !qty) return null; // skip completely empty rows just in case
          return <li key={ii}>{[qty, name].filter(Boolean).join(' ')}</li>;
        })}
      </ul>
    </div>
  );
};
