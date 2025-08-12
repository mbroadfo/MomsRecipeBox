import React, { useState } from 'react';

export const Rating: React.FC = () => {
  const [rating,setRating]=useState(0);
  const [hover,setHover]=useState(0);
  const handle = (v:number)=> setRating(r=> r===v?0:v);
  const Star = ({i}:{i:number}) => { const filled = (hover||rating)>=i; return (
    <button type="button" aria-label={`Rate ${i} star${i>1?'s':''}`} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(0)} onClick={()=>handle(i)}>
      <svg viewBox="0 0 24 24" fill={filled? 'url(#grad)':'none'} stroke={filled?'url(#grad)':'#94a3b8'} strokeWidth={filled?0:2}>
        <defs><linearGradient id="grad" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="50%" stopColor="#f97316" /><stop offset="100%" stopColor="#dc2626" /></linearGradient></defs>
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    </button>
  ); };
  return (
    <div className="section-block">
      <h2>My Rating</h2>
      <div className="rating-stars" role="radiogroup" aria-label="Rate this recipe">{[1,2,3,4,5].map(i=> <Star key={i} i={i} />)}<span className="rating-value">{rating? `${rating}/5` : 'Not rated'}</span></div>
    </div>
  );
};
