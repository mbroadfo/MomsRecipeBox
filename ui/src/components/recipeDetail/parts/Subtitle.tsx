import React from 'react';

export const Subtitle: React.FC<{ value?: string; editing: boolean; onChange: (v: string) => void; }> = ({ value, editing, onChange }) => (
  editing ? <textarea value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Subtitle" style={{ width:'100%', fontSize:'1.15rem', fontWeight:500, color:'#475569', border:'1px solid #e2e8f0', borderRadius:'.75rem', padding:'.75rem 1rem', resize:'vertical', minHeight:'56px' }} /> : (value ? <div className="subtitle">{value}</div> : null)
);
