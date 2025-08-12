import React from 'react';
import type { IngredientGroup } from '../hooks/useWorkingRecipe';

interface Props {
  groups: IngredientGroup[];
  update(groupIdx: number, itemIdx: number, field: 'name' | 'quantity', value: string): void;
  addItem(groupIdx: number): void;
  removeItem(groupIdx: number, itemIdx: number): void;
  addGroup(): void;
  setGroupName(groupIdx: number, name: string): void;
  removeGroup(groupIdx: number): void;
}

export const IngredientsEditor: React.FC<Props> = ({ groups, update, addItem, removeItem, addGroup, setGroupName, removeGroup }) => {
  return (
    <div className="section-block">
      <h2>Ingredients</h2>
      {groups.map((g, gi) => (
        <div key={gi} style={{ marginBottom: '1.4rem' }}>
          <div style={{ display:'flex', gap:'.6rem', alignItems:'center', marginBottom:'.6rem' }}>
            <input value={g.group||''} onChange={e=>setGroupName(gi, e.target.value)} placeholder="Group (optional)" style={{ flex:1, border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.45rem .6rem', fontSize:'.7rem' }} />
            {groups.length>1 && <button type="button" onClick={()=>removeGroup(gi)} style={{ background:'#dc2626', color:'#fff', fontSize:'.65rem', fontWeight:600 }}>Del Group</button>}
          </div>
          {g.items.map((it, ii) => (
            <div key={ii} style={{ display:'flex', gap:'.6rem', marginBottom: '.5rem' }}>
              <input value={it.quantity||''} onChange={e=>update(gi, ii, 'quantity', e.target.value)} placeholder="Qty" style={{ width:'120px', border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.45rem .6rem', fontSize:'.8rem' }} />
              <input value={it.name} onChange={e=>update(gi, ii, 'name', e.target.value)} placeholder="Ingredient" style={{ flex:1, border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.45rem .6rem', fontSize:'.8rem' }} />
              <button type="button" onClick={()=>removeItem(gi, ii)} style={{ background:'#dc2626', color:'#fff', fontSize:'.65rem', fontWeight:600 }}>Del</button>
            </div>
          ))}
          <button type="button" onClick={()=>addItem(gi)} style={{ background:'#2563eb', color:'#fff', fontSize:'.7rem', fontWeight:600, marginTop:'.25rem' }}>+ Ingredient</button>
        </div>
      ))}
      <button type="button" onClick={addGroup} style={{ background:'#1d4ed8', color:'#fff', fontSize:'.7rem', fontWeight:600 }}>+ Group</button>
    </div>
  );
};
