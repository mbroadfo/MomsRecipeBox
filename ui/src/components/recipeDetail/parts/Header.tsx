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
}

export const Header: React.FC<Props> = ({ title, editing, saving, onTitleChange, onEdit, onSave, onCancel, onBack }) => {
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
      <div style={{ padding:'0.45rem 3rem 0 2.25rem' }}>
        <button onClick={onBack} className="back-button" style={{ margin:0 }}>← Back</button>
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
