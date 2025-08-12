import React, { useRef, useEffect } from 'react';

interface Props { value?: string; editing: boolean; onChange: (v: string) => void; }

export const Notes: React.FC<Props> = ({ value, editing, onChange }) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const autoResize = () => {
    const el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(800, el.scrollHeight) + 'px';
  };
  useEffect(() => { autoResize(); }, [value, editing]);
  return (
    <div className="section-block">
      <h2>Notes</h2>
      {editing ? (
        <textarea
          ref={ref}
          rows={1}
            value={value||''}
          onChange={e=>{ onChange(e.target.value); autoResize(); }}
          placeholder="Add notes..."
          style={{ width:'100%', resize:'none', overflow:'hidden', minHeight:'1.4rem', border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.45rem .6rem', fontSize:'.8rem', lineHeight:1.25 }}
        />
      ) : (value ? <div className="note-box" style={{ whiteSpace:'pre-wrap' }}>{value}</div> : null)}
    </div>
  );
};
