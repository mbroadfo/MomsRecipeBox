import React from 'react';
import { ReorderableList } from './ReorderableList';

interface Props {
  steps: string[];
  update(idx: number, value: string): void;
  add(): void;
  remove(idx: number): void;
  move(from: number, to: number): void;
}

export const StepsEditor: React.FC<Props> = ({ steps, update, add, remove, move }) => {
  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(800, el.scrollHeight) + 'px';
  };
  return (
    <div className="section-block">
      <h2>Instructions</h2>
      <ReorderableList
        items={steps}
        onReorder={(from,to)=>move(from,to)}
        render={(s, i) => (
          <div style={{ display:'flex', gap:'.6rem', alignItems:'flex-start', width:'100%' }}>
            <textarea
              rows={1}
              value={s}
              onChange={e=>{ update(i, e.target.value); autoResize(e.target); }}
              ref={r=>{ if (r) autoResize(r); }}
              style={{ flex:1, resize:'none', overflow:'hidden', minHeight:'1.4rem', border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.3rem .5rem', fontSize:'.8rem', lineHeight:1.25 }}
              placeholder={`Step ${i+1}`}
            />
            <button type="button" onClick={()=>remove(i)} style={{ background:'#dc2626', color:'#fff', fontSize:'.6rem', fontWeight:600, height:'1.4rem', alignSelf:'flex-start' }}>Del</button>
          </div>
        )}
      />
      <button type="button" onClick={add} style={{ background:'#2563eb', color:'#fff', fontSize:'.7rem', fontWeight:600, marginTop:'.5rem' }}>+ Step</button>
    </div>
  );
};
