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
    <div className="badge-row" style={{ gap: '.4rem' }}>
      {tags.map(t => <span key={t} className="badge" style={{ position:'relative', paddingRight:'1.4rem' }}>{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => remove(t)} style={{ position:'absolute', right:'.35rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#1d4ed8', cursor:'pointer', fontWeight:700 }}>×</button></span>)}
      <input ref={inputRef} onKeyDown={handleKey} placeholder="Add tag" style={{ border:'1px dashed #94a3b8', padding:'.4rem .65rem', borderRadius:'999px', fontSize:'.7rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }} />
    </div>
  ) : (
    <div className="badge-row">{tags.map(t => <span key={t} className="badge">{t}</span>)}</div>
  );
};
