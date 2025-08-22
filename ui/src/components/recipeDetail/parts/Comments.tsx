import React from 'react';

export const Comments: React.FC<{ comments: any[] }> = ({ comments }) => (
  <div className="section-block">
    <h2>Comments</h2>
    <ul className="comment-list">{comments && comments.length? comments.map((c,i)=>(<li key={i} className="comment-item"><header>{c.author||'Anonymous'} {c.date && <span style={{ opacity:0.55 }}>{c.date}</span>}</header><div>{c.text||c.content}</div></li>)) : <li className="comment-empty">No comments yet.</li>}</ul>
  </div>
);
