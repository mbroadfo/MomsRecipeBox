import React from 'react';

interface Props { source?: string; author?: string; editing: boolean; onChange: (p: { source?: string; author?: string; }) => void; }
export const Meta: React.FC<Props> = ({ source, author, editing, onChange }) => {
  return (
    <div className="meta-row">
      {editing ? (
        <>
          <label style={{ fontSize: '.75rem', fontWeight: 600 }}>Source<input value={source||''} onChange={e=>onChange({ source: e.target.value })} style={{ display:'block', fontSize:'.85rem', padding:'.25rem .5rem', border:'1px solid #cbd5e1', borderRadius:'.4rem', marginTop:'.3rem' }} /></label>
          <label style={{ fontSize: '.75rem', fontWeight: 600 }}>Author<input value={author||''} onChange={e=>onChange({ author: e.target.value })} style={{ display:'block', fontSize:'.85rem', padding:'.25rem .5rem', border:'1px solid #cbd5e1', borderRadius:'.4rem', marginTop:'.3rem' }} /></label>
        </>
      ) : (
        <>
          {source && <span><strong>Source:</strong> {source}</span>}
          {author && <span><strong>Author:</strong> {author}</span>}
        </>
      )}
    </div>
  );
};
