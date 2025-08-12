import React from 'react';

export const Counters: React.FC<{ likes: number; comments: number; }> = ({ likes, comments }) => (
  <div className="counter-row">
    <span className="counter" title="Likes"><svg viewBox="0 0 24 24" fill="#e11d48" stroke="#e11d48" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.4 4.4 3 7.5 3c1.75 0 3.42 1 4.5 2.09C13.08 4 14.75 3 16.5 3 19.6 3 22 5.4 22 8.5c0 3.78-3.4 6.86-8.56 11.54L12 21.35z" /></svg>{likes}</span>
    <span className="counter" title="Comments"><svg viewBox="0 0 24 24" fill="#2563eb" stroke="#2563eb" strokeWidth="0"><path d="M4 4h16a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H8.6a1 1 0 0 0-.7.3L5 21v-3.5H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></svg>{comments}</span>
  </div>
);
