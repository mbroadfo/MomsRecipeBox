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
    <div style={{ position:'sticky', top:0, zIndex:50, background:'#f1f5f9cc', backdropFilter:'blur(6px)', padding:'0.65rem 3rem .75rem', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'flex-start', gap:'1.25rem', height:'4.5rem', boxSizing:'border-box' }}>
      <button className="back-button" onClick={onBack} style={{ marginBottom:0 }}>← Back</button>
      <div style={{ flex:1, minWidth:0 }}>
        <h1
          ref={h1Ref}
          className="recipe-title"
          style={{ margin:'0 0 .15rem', fontSize:'1.7rem', lineHeight:1.08, outline:'none', cursor: editing ? 'text' : 'default', userSelect:'text' }}
          contentEditable={editing}
          suppressContentEditableWarning
          data-placeholder="Recipe title"
          onInput={e => editing && onTitleChange((e.target as HTMLElement).innerText)}
          aria-label="Title"
        >{title}</h1>
        <div style={{ fontSize:'.6rem', letterSpacing:'.05em', fontWeight:600, color: editing ? '#334155' : '#64748b' }}>{editing ? 'Editing' : 'View Mode'}</div>
      </div>
      <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
        {!editing && <button onClick={onEdit} style={{ background: '#2563eb', color: '#fff', fontSize: '.65rem', fontWeight: 600, padding:'.5rem .8rem', borderRadius:'.55rem' }}>Edit</button>}
        {editing && <button onClick={onSave} disabled={saving} style={{ background: '#047857', color: '#fff', fontSize: '.65rem', fontWeight: 600, padding:'.5rem .8rem', borderRadius:'.55rem' }}>{saving ? 'Saving...' : 'Save'}</button>}
        {editing && <button onClick={onCancel} disabled={saving} style={{ background: '#334155', color: '#fff', fontSize: '.65rem', fontWeight: 600, padding:'.5rem .8rem', borderRadius:'.55rem' }}>Cancel</button>}
      </div>
    </div>
  );
};
