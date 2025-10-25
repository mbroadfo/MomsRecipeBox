import React, { useRef, useEffect } from 'react';
import { Visibility } from './Visibility';
import { showToast, ToastType } from '../../Toast';

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
    <div style={{ position:'relative', zIndex:10 }}>
      <style>{`
        h1[data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          font-style: italic;
        }
      `}</style>
      <div className="shopping-list-header" style={{ marginBottom: '0', marginTop: '0.5rem' }}>
        <div className="back-button-container">
          <button 
            className="back-to-recipes-button"
            onClick={onBack}
            aria-label="Back to recipes list"
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span>Back to Recipes</span>
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginLeft: '1rem' }}>
            <button
              type="button"
              onClick={onToggleLike}
              aria-pressed={liked}
              aria-label={liked ? 'Unlike this recipe' : 'Like this recipe'}
              style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'inline-flex' }}
            >
              <svg viewBox="0 0 24 24" width={24} height={24} role="img" aria-hidden="true" style={{ filter:'drop-shadow(0 1px 2px rgba(0,0,0,.25))', transition:'transform 140ms ease' }}>
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
        </div>
        
        <h1 className="shopping-list-title">
          {!editing ? (
            title
          ) : (
            <div
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
                margin:'0', 
                fontSize:'inherit', 
                lineHeight:'inherit', 
                fontWeight:'inherit',
                outline:'none',
                cursor:'text', 
                userSelect:'text', 
                border: '1px dashed rgba(37, 99, 235, 0.5)', 
                borderRadius: '4px',
                padding: '4px 8px',
                color: '#1e3a8a',
                background: 'rgba(255, 255, 255, 0.9)',
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
          )}
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
          {/* Visibility controls */}
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
          }}>
            {!editing ? (
              <button 
                onClick={onEdit} 
                style={{ 
                  background:'#2563eb', 
                  color:'#fff', 
                  fontSize:'.75rem', 
                  fontWeight:600, 
                  padding:'.4rem .85rem', 
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
                    fontSize:'.75rem', 
                    fontWeight:600, 
                    padding:'.4rem .85rem', 
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
                    fontSize:'.75rem', 
                    fontWeight:600, 
                    padding:'.4rem .85rem', 
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
                onClick={() => showToast('Profile/Logout options coming soon', ToastType.Info)}
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
      </div>
    </div>
  );
};
