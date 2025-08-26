import React, { useRef, useEffect } from 'react';
import { Visibility } from './Visibility';

interface Props {
  title: string;
  editing: boolean;
  saving: boolean;
  onTitleChange: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onBack: () => void;
  liked: boolean;
  onToggleLike: () => void;
  visibility?: string;
  owner_id?: string;
  onVisibilityChange: (updates: { visibility?: string; owner_id?: string }) => void;
}

export const Header: React.FC<Props> = ({ 
  title, 
  editing, 
  saving, 
  onTitleChange, 
  onEdit, 
  onSave, 
  onCancel, 
  onBack, 
  liked, 
  onToggleLike,
  visibility = 'private',
  owner_id = '',
  onVisibilityChange
}) => {
  const h1Ref = useRef<HTMLHeadingElement | null>(null);
  
  // Reset the ref when editing changes
  useEffect(() => {
    if (!editing) {
      // Clear the ref when not editing so it will reinitialize on next edit
      h1Ref.current = null;
    }
  }, [editing]);

  return (
    <div style={{ position:'sticky', top:0, zIndex:50 }}>
      <style>{`
        h1[data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          font-style: italic;
        }
      `}</style>
      <div style={{ padding:'0.45rem 2.25rem 0.2rem 2.25rem', display:'flex', alignItems:'center' }}>
        {/* Left section: Back button and Like button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem', flex: '1' }}>
          <button onClick={onBack} className="back-button" style={{ margin:0, display:'flex', alignItems:'center', gap:'0.25rem' }}>
            <span style={{ fontSize:'1.1rem' }}>←</span> Back to List
          </button>
          <button
            type="button"
            onClick={onToggleLike}
            aria-pressed={liked}
            aria-label={liked ? 'Unlike this recipe' : 'Like this recipe'}
            style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'inline-flex' }}
          >
            <svg viewBox="0 0 24 24" width={28} height={28} role="img" aria-hidden="true" style={{ filter:'drop-shadow(0 1px 2px rgba(0,0,0,.25))', transition:'transform 140ms ease' }}>
              <defs>
                <linearGradient id="headerHeartGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="60%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#e11d48" />
                </linearGradient>
              </defs>
              <path
                d="M12 21s-1.45-1.32-3.17-2.99C6.39 15.7 4 13.42 4 10.5 4 8.02 5.94 6 8.4 6c1.54 0 3.04.99 3.6 2.09C12.56 6.99 14.06 6 15.6 6 18.06 6 20 8.02 20 10.5c0 2.92-2.39 5.2-4.83 7.51C13.45 19.68 12 21 12 21z"
                fill={liked ? 'url(#headerHeartGrad)' : 'none'}
                stroke={liked ? 'url(#headerHeartGrad)' : '#f87171'}
                strokeWidth={liked ? 0 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <span style={{ fontSize:'.8rem', fontWeight:600, letterSpacing:'.05em', color:'#1e293b', userSelect:'none' }}>{liked ? 'Liked' : 'Like'}</span>
        </div>
        
        {/* Center section: Visibility controls */}
        <Visibility 
          visibility={visibility} 
          owner_id={owner_id} 
          editing={editing} 
          onChange={onVisibilityChange}
          compact={true} 
        />
        
        {/* Right section: Edit button and user badge */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '.5rem',
          marginLeft: 'auto' /* This pushes the entire container to the right */
        }}>
          {!editing ? (
            <button 
              onClick={onEdit} 
              style={{ 
                background:'#2563eb', 
                color:'#fff', 
                fontSize:'.68rem', 
                fontWeight:600, 
                padding:'.35rem .75rem', 
                borderRadius:'.5rem',
                boxShadow:'0 2px 4px rgba(37,99,235,0.25)'
              }}
            >
              Edit
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button 
                onClick={onSave} 
                disabled={saving} 
                style={{ 
                  background:'#047857', 
                  color:'#fff', 
                  fontSize:'.68rem', 
                  fontWeight:600, 
                  padding:'.35rem .75rem', 
                  borderRadius:'.5rem',
                  opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={onCancel} 
                disabled={saving} 
                style={{ 
                  background:'#334155', 
                  color:'#fff', 
                  fontSize:'.68rem', 
                  fontWeight:600, 
                  padding:'.35rem .75rem', 
                  borderRadius:'.5rem',
                  opacity: saving ? 0.7 : 1
                }}
              >
                Cancel
              </button>
            </div>
          )}
          
          {/* Owner badge - clickable and right-justified */}
          {owner_id && (
            <div 
              onClick={() => alert('Profile/Logout options would go here')}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '.3rem',
                padding: '.35rem .5rem',
                backgroundColor: '#f1f5f9',
                borderRadius: '.5rem',
                border: '1px solid #e2e8f0',
                fontSize: '.7rem',
                fontWeight: 500,
                color: '#64748b',
                cursor: 'pointer',
                marginLeft: '.5rem'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              {owner_id}
            </div>
          )}
        </div>
      </div>
      <div style={{ background:'#f1f5f9d9', backdropFilter:'blur(8px)', padding:'0.65rem 2.25rem 0.85rem 2.25rem', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'flex-start', gap:'1.5rem', height:'5.2rem', boxSizing:'border-box', boxShadow:'0 4px 12px -4px rgba(15,23,42,0.08)', borderRadius:'0 0 1rem 1rem' }}>
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', justifyContent:'flex-start' }}>
          {editing ? (
            <h1
              ref={(el) => {
                if (el && !h1Ref.current) {
                  h1Ref.current = el;
                  
                  // Initialize the content of the element when first rendered
                  el.textContent = title || '';
                  
                  // Focus and set cursor at the beginning if empty or at the end if there's content
                  el.focus();
                  const range = document.createRange();
                  range.selectNodeContents(el);
                  // If title is empty, collapse to start position for easier typing
                  range.collapse(!title);
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                }
              }}
              className="recipe-title-edit"
              style={{ 
                margin:'0 0 .15rem', 
                fontSize:'1.9rem', 
                lineHeight:1.12, 
                fontWeight:800, 
                outline:'none',
                cursor:'text', 
                userSelect:'text', 
                border: '1px dashed rgba(37, 99, 235, 0.5)', 
                borderRadius: '4px',
                padding: '4px 8px',
                color: '#1e3a8a', // Use a solid color instead of transparent
                background: 'rgba(255, 255, 255, 0.9)',
                minHeight: '2.5rem',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.15)'
              }}
              contentEditable={true}
              suppressContentEditableWarning
              data-placeholder="Enter recipe title"
              data-no-autofill="true"
              data-form-type="other"
              data-lpignore="true"
              onInput={(e) => {
                // Simply update the title value without messing with the DOM
                onTitleChange((e.target as HTMLElement).innerText);
              }}
              aria-label="Title"
            />
          ) : (
            <h1
              className="recipe-title"
              style={{ margin:'0 0 .15rem', fontSize:'1.9rem', lineHeight:1.12, fontWeight:800, outline:'none', cursor:'default', userSelect:'text', overflow:'hidden', textOverflow:'ellipsis' }}
              aria-label="Title"
            >{title}</h1>
          )}
        </div>
      </div>
    </div>
  );
};
