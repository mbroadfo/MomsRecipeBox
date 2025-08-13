import React, { useRef } from 'react';

interface Props { tags: string[]; editing: boolean; add: (t: string) => void; remove: (t: string) => void; }
export const Tags: React.FC<Props> = ({ tags, editing, add, remove }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const handleKey: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = inputRef.current?.value.trim();
      if (v && !tags.includes(v)) { add(v); inputRef.current!.value=''; }
    }
  };
  if (!editing && (!tags || !tags.length)) return null;
  return editing ? (
    <div className="badge-row" style={{ gap: '.55rem' }}>
      {tags.map(t => (
        <span
          key={t}
          className="badge"
          style={{ position:'relative', padding:'0.45rem 1.75rem 0.45rem 1rem', display:'inline-flex', alignItems:'center', lineHeight:1 }}
        >
          <span style={{ whiteSpace:'nowrap' }}>{t}</span>
          <button
            type="button"
            aria-label={`Remove ${t}`}
            onClick={() => remove(t)}
            style={{ position:'absolute', right:'.4rem', top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.6)', border:'1px solid #1d4ed8', width:'1.1rem', height:'1.1rem', lineHeight:1, borderRadius:'50%', color:'#1d4ed8', cursor:'pointer', fontWeight:700, fontSize:'.75rem', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}
          >×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        onKeyDown={handleKey}
        placeholder="Add tag"
        style={{ border:'1px dashed #94a3b8', padding:'.45rem .75rem', borderRadius:'999px', fontSize:'.7rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', minWidth:'110px' }}
      />
    </div>
  ) : (
    <div className="badge-row">{tags.map(t => <span key={t} className="badge">{t}</span>)}</div>
  );
};
