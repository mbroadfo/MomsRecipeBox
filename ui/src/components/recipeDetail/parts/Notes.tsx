import React from 'react';

export const Notes: React.FC<{ value?: string; editing: boolean; onChange: (v:string)=>void; }> = ({ value, editing, onChange }) => (
  <div className="section-block">
    <h2>Notes</h2>
    {editing ? <textarea value={value||''} onChange={e=>onChange(e.target.value)} style={{ width:'100%', minHeight:'120px', border:'1px solid #cbd5e1', borderRadius:'.9rem', padding:'.85rem 1rem', fontSize:'.8rem', lineHeight:1.5 }} /> : (value ? <div className="note-box">{value}</div> : null)}
  </div>
);
