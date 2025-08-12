import React from 'react';

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
  return (
    <div>
      <button className="back-button" onClick={onBack}>← Back</button>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
        {editing ? (
          <input value={title} onChange={e => onTitleChange(e.target.value)} style={{ fontSize: '2.4rem', fontWeight: 800, flex: '1 1 600px', border: 'none', background: 'transparent', outline: 'none' }} aria-label="Title" />
        ) : (
          <h1 className="recipe-title" style={{ marginBottom: 0 }}>{title}</h1>
        )}
        <div style={{ display: 'flex', gap: '.75rem' }}>
          {!editing && <button onClick={onEdit} style={{ background: '#2563eb', color: '#fff', fontSize: '.75rem', fontWeight: 600 }}>Edit</button>}
          {editing && <button onClick={onSave} disabled={saving} style={{ background: '#047857', color: '#fff', fontSize: '.75rem', fontWeight: 600 }}>{saving ? 'Saving...' : 'Save'}</button>}
            {editing && <button onClick={onCancel} disabled={saving} style={{ background: '#334155', color: '#fff', fontSize: '.75rem', fontWeight: 600 }}>Cancel</button>}
        </div>
      </div>
    </div>
  );
};
