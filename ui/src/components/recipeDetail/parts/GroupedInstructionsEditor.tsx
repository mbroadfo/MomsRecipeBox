import React from 'react';

interface Group { id: string; title: string; steps: string[]; }
interface Props {
  groups: Group[];
  updateStep(gid: string, idx: number, value: string): void;
  addStep(gid: string): void;
  removeStep(gid: string, idx: number): void;
  moveStep(gid: string, idx: number, dir: -1 | 1): void;
  moveStepToGroup(fromId: string, idx: number, toId: string): void;
  updateGroupTitle(gid: string, title: string): void;
  addGroup(): void;
  removeGroup(gid: string): void;
  moveGroup(gid: string, dir: -1 | 1): void;
}

export const GroupedInstructionsEditor: React.FC<Props> = ({ groups, updateStep, addStep, removeStep, moveStep, moveStepToGroup, updateGroupTitle, addGroup, removeGroup, moveGroup }) => {
  return (
    <div className="section-block">
      <h2>Instructions</h2>
      <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
        {groups.map((g, gi) => (
          <div key={g.id} style={{ border:'1px solid #e2e8f0', borderRadius:'1rem', padding:'1rem .9rem', background:'#fff' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'.6rem', marginBottom:'.65rem' }}>
              <input value={g.title} onChange={e=>updateGroupTitle(g.id, e.target.value)} placeholder={`Group ${gi+1} title (optional)`} style={{ flex:1, border:'1px solid #cbd5e1', borderRadius:'.5rem', padding:'.45rem .6rem', fontSize:'.75rem', fontWeight:600 }} />
              <div style={{ display:'flex', gap:'.35rem' }}>
                <button type="button" aria-label="Move group up" disabled={gi===0} onClick={()=>moveGroup(g.id,-1)} style={{ fontSize:'.65rem' }}>↑</button>
                <button type="button" aria-label="Move group down" disabled={gi===groups.length-1} onClick={()=>moveGroup(g.id,1)} style={{ fontSize:'.65rem' }}>↓</button>
                <button type="button" aria-label="Delete group" disabled={groups.length===1} onClick={()=>removeGroup(g.id)} style={{ fontSize:'.65rem', color:'#dc2626' }}>Del</button>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'.85rem' }}>
              {g.steps.map((s, si) => (
                <div key={si} style={{ display:'flex', flexDirection:'column', gap:'.35rem' }}>
                  <textarea value={s} onChange={e=>updateStep(g.id, si, e.target.value)} style={{ width:'100%', minHeight:'90px', border:'1px solid #cbd5e1', borderRadius:'.7rem', padding:'.65rem .85rem', fontSize:'.8rem', lineHeight:1.4, paddingRight:'.5rem' }} />
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'.4rem' }}>
                    <button type="button" onClick={()=>moveStep(g.id, si, -1)} disabled={si===0} style={{ fontSize:'.6rem' }}>↑ Step</button>
                    <button type="button" onClick={()=>moveStep(g.id, si, 1)} disabled={si===g.steps.length-1} style={{ fontSize:'.6rem' }}>↓ Step</button>
                    <button type="button" onClick={()=>removeStep(g.id, si)} style={{ fontSize:'.6rem', color:'#dc2626' }}>Delete</button>
                    {groups.length>1 && (
                      <select value={g.id} onChange={e=>moveStepToGroup(g.id, si, e.target.value)} style={{ fontSize:'.6rem' }}>
                        {groups.map(gr => <option key={gr.id} value={gr.id}>{gr.title || 'Group '+(groups.indexOf(gr)+1)}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={()=>addStep(g.id)} style={{ background:'#2563eb', color:'#fff', fontSize:'.65rem', fontWeight:600 }}>+ Step</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addGroup} style={{ background:'#1d4ed8', color:'#fff', fontSize:'.7rem', fontWeight:600 }}>+ Group</button>
      </div>
    </div>
  );
};
