import React from 'react';

interface Props { steps: string[]; update(idx:number,value:string):void; add():void; remove(idx:number):void; }
export const InstructionsEditor: React.FC<Props> = ({ steps, update, add, remove }) => {
  return (
    <div className="section-block">
      <h2>Instructions</h2>
      <div style={{ display:'flex', flexDirection:'column', gap:'.6rem' }}>
        {steps.map((s,i)=>(
          <div key={i} style={{ position:'relative' }}>
            <textarea value={s} onChange={e=>update(i,e.target.value)} style={{ width:'100%', minHeight:'88px', border:'1px solid #cbd5e1', borderRadius:'.7rem', padding:'.65rem .85rem', fontSize:'.8rem', lineHeight:1.4 }} />
            <button type="button" onClick={()=>remove(i)} style={{ position:'absolute', top:'.4rem', right:'.4rem', background:'#dc2626', color:'#fff', fontSize:'.65rem', fontWeight:600 }}>Del</button>
          </div>
        ))}
        <button type="button" onClick={add} style={{ background:'#2563eb', color:'#fff', fontSize:'.7rem', fontWeight:600 }}>+ Step</button>
      </div>
    </div>
  );
};
