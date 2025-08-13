import React, { useState } from 'react';

export const Rating: React.FC = () => {
  const [liked, setLiked] = useState(false);
  return (
    <div className="section-block">
      <h2>My Rating</h2>
      <div className="like-toggle">
        <button
          type="button"
            aria-pressed={liked}
            aria-label={liked ? 'Unlike this recipe' : 'Like this recipe'}
            onClick={() => setLiked(l => !l)}
        >
          <svg viewBox="0 0 24 24" width={36} height={36} role="img" aria-hidden="true">
            <defs>
              <linearGradient id="heartGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="60%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </defs>
            <path
              d="M12 21s-1.45-1.32-3.17-2.99C6.39 15.7 4 13.42 4 10.5 4 8.02 5.94 6 8.4 6c1.54 0 3.04.99 3.6 2.09C12.56 6.99 14.06 6 15.6 6 18.06 6 20 8.02 20 10.5c0 2.92-2.39 5.2-4.83 7.51C13.45 19.68 12 21 12 21z"
              fill={liked ? 'url(#heartGrad)' : 'none'}
              stroke={liked ? 'url(#heartGrad)' : '#f87171'}
              strokeWidth={liked ? 0 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="like-label" aria-live="polite">{liked ? 'Liked' : 'Like'}</span>
      </div>
    </div>
  );
};
