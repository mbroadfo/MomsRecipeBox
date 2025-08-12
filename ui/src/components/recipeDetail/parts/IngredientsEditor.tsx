import React, { useRef, useState } from 'react';
import type { IngredientGroup } from '../hooks/useWorkingRecipe';

interface Props {
  groups: IngredientGroup[]; // length 1
  update(groupIdx: number, itemIdx: number, field: 'name' | 'quantity', value: string): void;
  addItem(groupIdx: number): void;
  removeItem(groupIdx: number, itemIdx: number): void;
  moveItem?(groupIdx: number, fromIdx: number, toIdx: number): void;
}

export const IngredientsEditor: React.FC<Props> = ({ groups, update, addItem, removeItem, moveItem }) => {
  const list = groups[0];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<null | {
    idx: number; // original index
    over: number; // insertion index (0..len)
    startY: number;
    offsetY: number;
    rect: DOMRect; // rect of dragged element
    rects: DOMRect[]; // original rects of all items
  }>(null);

  const buildRects = () => {
    if (!containerRef.current) return [] as DOMRect[];
    const nodes = Array.from(containerRef.current.querySelectorAll('[data-ing-item]')) as HTMLElement[];
    return nodes.map(n => n.getBoundingClientRect());
  };

  const onPointerDown = (idx: number, e: React.PointerEvent) => {
    const rects = buildRects();
    const rect = rects[idx];
    setDrag({ idx, over: idx, startY: e.clientY, offsetY: 0, rect, rects });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const calcOverIndex = (clientY: number, d: NonNullable<typeof drag>) => {
    const { rects } = d;
    // insertion position before item whose midpoint the pointer is above
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const mid = r.top + r.height / 2;
      if (clientY < mid) return i; // before i
    }
    return rects.length; // at end
  };

  const onPointerMove = (e: React.PointerEvent) => {
    setDrag(d => {
      if (!d) return d;
      const offsetY = e.clientY - d.startY;
      const over = calcOverIndex(e.clientY, d);
      if (offsetY === d.offsetY && over === d.over) return d;
      return { ...d, offsetY, over };
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (drag && moveItem) {
      let target = drag.over; // insertion index
      if (target > drag.idx) target -= 1; // account for removal gap
      if (target !== drag.idx && target >= 0 && target < list.items.length) {
        moveItem(0, drag.idx, target);
      }
    }
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDrag(null);
  };

  const insertionIndex = drag ? drag.over : -1; // 0..len or -1 none

  return (
    <div className="section-block">
      <h2>Ingredients</h2>
      <div ref={containerRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {list.items.map((it, ii) => {
          const hidden = drag && ii === drag.idx; // hide original while dragging
          const placeholderHere = drag && insertionIndex === ii; // placeholder before this item
          return (
            <React.Fragment key={ii}>
              {placeholderHere && (
                <div style={{ height: drag.rect.height, marginBottom: '.5rem', border: '2px dashed #94a3b8', borderRadius: '.5rem', background: '#f1f5f9' }} />
              )}
              <div
                data-ing-item
                style={{ display:'flex', gap:'.6rem', marginBottom: '.5rem', alignItems:'center', borderRadius:'.5rem', visibility: hidden ? 'hidden' : 'visible' }}
              >
                <div
                  onPointerDown={e=>onPointerDown(ii,e)}
                  style={{ cursor:'grab', userSelect:'none', fontSize:'.9rem', lineHeight:1, padding:'.25rem .3rem', display:'flex', flexDirection:'column', gap:'2px' }}
                  title="Drag to reorder"
                >
                  <span style={{ display:'block', height:'2px', width:'14px', background:'#64748b' }} />
                  <span style={{ display:'block', height:'2px', width:'14px', background:'#64748b' }} />
                  <span style={{ display:'block', height:'2px', width:'14px', background:'#64748b' }} />
                </div>
                <input value={it.quantity||''} onChange={e=>update(0, ii, 'quantity', e.target.value)} placeholder="Qty" style={{ width:'110px', border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.45rem .6rem', fontSize:'.8rem' }} />
                <input value={it.name} onChange={e=>update(0, ii, 'name', e.target.value)} placeholder="Ingredient" style={{ flex:1, border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.45rem .6rem', fontSize:'.8rem' }} />
                <button type="button" onClick={()=>removeItem(0, ii)} style={{ background:'#dc2626', color:'#fff', fontSize:'.65rem', fontWeight:600 }}>Del</button>
              </div>
            </React.Fragment>
          );
        })}
        {drag && insertionIndex === list.items.length && (
          <div style={{ height: drag.rect.height, marginBottom: '.5rem', border: '2px dashed #94a3b8', borderRadius: '.5rem', background: '#f1f5f9' }} />
        )}
        {drag && (
          <div
            style={{ position:'fixed', top: drag.rect.top + drag.offsetY, left: drag.rect.left, width: drag.rect.width, height: drag.rect.height, pointerEvents:'none', zIndex:9999, background:'#ffffffcc', backdropFilter:'blur(2px)', border:'1px solid #cbd5e1', borderRadius:'.5rem', boxShadow:'0 4px 12px rgba(0,0,0,0.2)', display:'flex', gap:'.6rem', alignItems:'center', padding:'0 .6rem' }}
          >
            <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
              <span style={{ display:'block', height:'2px', width:'14px', background:'#64748b' }} />
              <span style={{ display:'block', height:'2px', width:'14px', background:'#64748b' }} />
              <span style={{ display:'block', height:'2px', width:'14px', background:'#64748b' }} />
            </div>
            <div style={{ width:'110px', fontSize:'.65rem', color:'#334155' }}>{list.items[drag.idx].quantity}</div>
            <div style={{ flex:1, fontSize:'.7rem', fontWeight:500, color:'#1e293b' }}>{list.items[drag.idx].name || <em style={{ opacity:.6 }}>Ingredient</em>}</div>
          </div>
        )}
      </div>
      <button type="button" onClick={()=>addItem(0)} style={{ background:'#2563eb', color:'#fff', fontSize:'.7rem', fontWeight:600, marginTop:'.25rem' }}>+ Ingredient</button>
    </div>
  );
};
