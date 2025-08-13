import React, { useRef, useEffect } from 'react';

interface Props {
  title: string;
  editing: boolean;
  saving: boolean;
  onTitleChange: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onBack: () => void;
  liked: boolean;
  onToggleLike: () => void;
}

export const Header: React.FC<Props> = ({ title, editing, saving, onTitleChange, onEdit, onSave, onCancel, onBack, liked, onToggleLike }) => {
  const h1Ref = useRef<HTMLHeadingElement | null>(null);
  // Keep caret at end when entering edit mode
  useEffect(() => {
    if (editing && h1Ref.current) {
      const range = document.createRange();
      range.selectNodeContents(h1Ref.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  return (
    <div style={{ position:'sticky', top:0, zIndex:50 }}>
      <div style={{ padding:'0.45rem 3rem 0.2rem 2.25rem', display:'flex', alignItems:'center', gap:'.85rem' }}>
        <button onClick={onBack} className="back-button" style={{ margin:0 }}>← Back</button>
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike this recipe' : 'Like this recipe'}
          style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'inline-flex' }}
        >
          <svg viewBox="0 0 24 24" width={28} height={28} role="img" aria-hidden="true" style={{ filter:'drop-shadow(0 1px 2px rgba(0,0,0,.25))', transition:'transform 140ms ease' }}>
            <defs>
              <linearGradient id="headerHeartGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="60%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </defs>
            <path
              d="M12 21s-1.45-1.32-3.17-2.99C6.39 15.7 4 13.42 4 10.5 4 8.02 5.94 6 8.4 6c1.54 0 3.04.99 3.6 2.09C12.56 6.99 14.06 6 15.6 6 18.06 6 20 8.02 20 10.5c0 2.92-2.39 5.2-4.83 7.51C13.45 19.68 12 21 12 21z"
              fill={liked ? 'url(#headerHeartGrad)' : 'none'}
              stroke={liked ? 'url(#headerHeartGrad)' : '#f87171'}
              strokeWidth={liked ? 0 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span style={{ fontSize:'.8rem', fontWeight:600, letterSpacing:'.05em', color:'#1e293b', userSelect:'none' }}>{liked ? 'Liked' : 'Like'}</span>
      </div>
      <div style={{ background:'#f1f5f9d9', backdropFilter:'blur(8px)', padding:'0.65rem 3rem 0.85rem 2.25rem', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'flex-start', gap:'1.5rem', height:'5.2rem', boxSizing:'border-box', boxShadow:'0 4px 12px -4px rgba(15,23,42,0.08)', borderRadius:'0 0 1rem 1rem' }}>
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'flex-start' }}>
          <h1
            ref={h1Ref}
            className="recipe-title"
            style={{ margin:'0 0 .15rem', fontSize:'1.9rem', lineHeight:1.12, fontWeight:800, outline:'none', cursor: editing ? 'text' : 'default', userSelect:'text', overflow:'hidden', textOverflow:'ellipsis' }}
            contentEditable={editing}
            suppressContentEditableWarning
            data-placeholder="Recipe title"
            onInput={e => editing && onTitleChange((e.target as HTMLElement).innerText)}
            aria-label="Title"
          >{title}</h1>
        </div>
        <div style={{ display:'flex', gap:'.6rem', flexWrap:'wrap', alignSelf:'center' }}>
          {!editing && <button onClick={onEdit} style={{ background: '#2563eb', color: '#fff', fontSize: '.68rem', fontWeight: 600, padding:'.55rem .85rem', borderRadius:'.6rem', boxShadow:'0 2px 4px rgba(37,99,235,0.35)' }}>Edit</button>}
          {editing && <button onClick={onSave} disabled={saving} style={{ background: '#047857', color: '#fff', fontSize: '.68rem', fontWeight: 600, padding:'.55rem .85rem', borderRadius:'.6rem' }}>{saving ? 'Saving...' : 'Save'}</button>}
          {editing && <button onClick={onCancel} disabled={saving} style={{ background: '#334155', color: '#fff', fontSize: '.68rem', fontWeight: 600, padding:'.55rem .85rem', borderRadius:'.6rem' }}>Cancel</button>}
        </div>
      </div>
    </div>
  );
};
