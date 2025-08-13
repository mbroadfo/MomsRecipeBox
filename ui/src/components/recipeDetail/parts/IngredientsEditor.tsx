import React from 'react';
import type { IngredientGroup } from '../hooks/useWorkingRecipe';
import { ReorderableList } from './ReorderableList';

interface Props {
  groups: IngredientGroup[]; // length 1
  update(groupIdx: number, itemIdx: number, field: 'name' | 'quantity', value: string): void;
  addItem(groupIdx: number): void;
  removeItem(groupIdx: number, itemIdx: number): void;
  moveItem?(groupIdx: number, fromIdx: number, toIdx: number): void;
}

export const IngredientsEditor: React.FC<Props> = ({ groups, update, addItem, removeItem, moveItem }) => {
  const list = groups[0];
  return (
    <div className="section-block">
      <h2>Ingredients</h2>
      <ReorderableList
        items={list.items}
        onReorder={(from,to)=> moveItem && moveItem(0, from, to)}
        getKey={(_,i)=>i}
        render={(it, ii) => (
          <div style={{ display:'flex', gap:'.6rem', alignItems:'center' }}>
            <input value={it.quantity||''} onChange={e=>update(0, ii, 'quantity', e.target.value)} placeholder="Qty" style={{ width:'110px', border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.45rem .6rem', fontSize:'.8rem' }} />
            <input value={it.name} onChange={e=>update(0, ii, 'name', e.target.value)} placeholder="Enter ingredient or leave blank for group" style={{ flex:1, border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.45rem .6rem', fontSize:'.8rem' }} />
            <button type="button" onClick={()=>removeItem(0, ii)} style={{ background:'#dc2626', color:'#fff', fontSize:'.65rem', fontWeight:600 }}>Del</button>
          </div>
        )}
      />
      <button type="button" onClick={()=>addItem(0)} style={{ background:'#2563eb', color:'#fff', fontSize:'.7rem', fontWeight:600, marginTop:'.25rem' }}>+ Ingredient</button>
    </div>
  );
};
