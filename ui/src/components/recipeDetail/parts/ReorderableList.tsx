import React, { useRef, useState } from 'react';

interface ReorderableListProps<T> {
  items: T[];
  onReorder(from: number, to: number): void; // inclusive indices
  render(item: T, index: number): React.ReactNode; // row content (excluding handle)
  getKey?(item: T, index: number): React.Key;
  className?: string;
  itemGap?: string;
  handleAriaLabel?: string;
}

// Generic ghost-drag reorderable vertical list (no external DnD libs)
export function ReorderableList<T>({ items, onReorder, render, getKey, className, itemGap = '.5rem', handleAriaLabel = 'Drag to reorder' }: ReorderableListProps<T>) {
  interface DragState {
    idx: number; // original index
    over: number; // insertion index 0..len
    startY: number;
    offsetY: number;
    rect: DOMRect;
    rects: DOMRect[];
  }
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const buildRects = () => {
    if (!containerRef.current) return [] as DOMRect[];
    const nodes = Array.from(containerRef.current.querySelectorAll('[data-rli-item]')) as HTMLElement[];
    return nodes.map(n => n.getBoundingClientRect());
  };

  const onPointerDown = (idx: number, e: React.PointerEvent) => {
    const rects = buildRects();
    const rect = rects[idx];
    setDrag({ idx, over: idx, startY: e.clientY, offsetY: 0, rect, rects });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const calcOverIndex = (clientY: number, d: DragState) => {
    const { rects } = d;
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const mid = r.top + r.height / 2;
      if (clientY < mid) return i;
    }
    return rects.length; // end
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
    if (drag) {
      let target = drag.over;
      if (target > drag.idx) target -= 1; // removal gap adjustment
      if (target !== drag.idx && target >= 0 && target < items.length) {
        onReorder(drag.idx, target);
      }
    }
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDrag(null);
  };

  const insertionIndex = drag ? drag.over : -1;

  return (
    <div ref={containerRef} className={className} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      {items.map((item, idx) => {
        const hidden = drag && idx === drag.idx;
        const placeholderHere = drag && insertionIndex === idx;
        return (
          <React.Fragment key={getKey ? getKey(item, idx) : idx}>
            {placeholderHere && drag && (
              <div style={{ height: drag.rect.height, marginBottom: itemGap, border: '2px dashed #94a3b8', borderRadius: '.5rem', background: '#f1f5f9' }} />
            )}
            <div
              data-rli-item
              style={{ display: 'flex', gap: '.6rem', marginBottom: itemGap, alignItems: 'flex-start', borderRadius: '.5rem', visibility: hidden ? 'hidden' : 'visible' }}
            >
              <div
                onPointerDown={e => onPointerDown(idx, e)}
                style={{ cursor: 'grab', userSelect: 'none', fontSize: '.9rem', lineHeight: 1, padding: '.35rem .3rem', display: 'flex', flexDirection: 'column', gap: '2px' }}
                aria-label={handleAriaLabel}
                title={handleAriaLabel}
              >
                <span style={{ display: 'block', height: '2px', width: '14px', background: '#64748b' }} />
                <span style={{ display: 'block', height: '2px', width: '14px', background: '#64748b' }} />
                <span style={{ display: 'block', height: '2px', width: '14px', background: '#64748b' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>{render(item, idx)}</div>
            </div>
          </React.Fragment>
        );
      })}
      {drag && insertionIndex === items.length && (
        <div style={{ height: drag.rect.height, marginBottom: itemGap, border: '2px dashed #94a3b8', borderRadius: '.5rem', background: '#f1f5f9' }} />
      )}
      {drag && (
        <div
          style={{ position: 'fixed', top: drag.rect.top + drag.offsetY, left: drag.rect.left, width: drag.rect.width, height: drag.rect.height, pointerEvents: 'none', zIndex: 9999, background: '#ffffffcc', backdropFilter: 'blur(2px)', border: '1px solid #cbd5e1', borderRadius: '.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', gap: '.6rem', alignItems: 'center', padding: '0 .6rem' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ display: 'block', height: '2px', width: '14px', background: '#64748b' }} />
            <span style={{ display: 'block', height: '2px', width: '14px', background: '#64748b' }} />
            <span style={{ display: 'block', height: '2px', width: '14px', background: '#64748b' }} />
          </div>
          <div style={{ flex: 1, fontSize: '.7rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {(() => {
              const item = items[drag.idx];
              if (typeof item === 'string') return item || <em style={{ opacity: .6 }}>Item</em>;
              try {
                const anyItem: any = item as any;
                return anyItem.name || anyItem.title || anyItem.quantity || JSON.stringify(anyItem);
              } catch { return 'Item'; }
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
