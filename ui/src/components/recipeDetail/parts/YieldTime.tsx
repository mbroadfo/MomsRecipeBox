import React from 'react';

interface Props {
  yieldValue?: string;
  time: { total?: string; prep?: string; cook?: string; [k: string]: any };
  editing: boolean;
  onChange: (p: { yield?: string; time?: any }) => void;
}
export const YieldTime: React.FC<Props> = ({ yieldValue, time, editing, onChange }) => {
  return (
    <div className="stat-grid">
      {editing ? (
        <div className="stat-card" style={{ display:'flex', flexDirection:'column', gap:'.35rem' }}>
          <h4>Yield</h4>
          <input value={yieldValue||''} onChange={e=>onChange({ yield: e.target.value })} style={{ border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.4rem .55rem', fontSize:'.8rem' }} />
        </div>
      ) : (yieldValue && <div className="stat-card"><h4>Yield</h4><p>{yieldValue}</p></div>)}
      {editing ? (
        <div className="stat-card" style={{ display:'flex', flexDirection:'column', gap:'.35rem' }}>
          <h4>Time</h4>
          <input placeholder="Total" value={time?.total||''} onChange={e=>onChange({ time: { ...time, total: e.target.value } })} style={{ border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.35rem .55rem', fontSize:'.7rem', marginBottom:'.25rem' }} />
          <div style={{ display:'flex', gap:'.4rem' }}>
            <input placeholder="Prep" value={time?.prep||''} onChange={e=>onChange({ time: { ...time, prep: e.target.value } })} style={{ border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.35rem .55rem', fontSize:'.7rem', flex:1 }} />
            <input placeholder="Cook" value={time?.cook||''} onChange={e=>onChange({ time: { ...time, cook: e.target.value } })} style={{ border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.35rem .55rem', fontSize:'.7rem', flex:1 }} />
          </div>
        </div>
      ) : ((time?.total || time?.prep || time?.cook) && <div className="stat-card"><h4>Time</h4><p>{time.total || `${time.prep||''} ${time.cook||''}`.trim()}</p></div>)}
    </div>
  );
};
