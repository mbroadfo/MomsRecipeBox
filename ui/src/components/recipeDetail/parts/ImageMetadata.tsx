import React from 'react';
import { Visibility } from './Visibility';
import { showToast, ToastType } from '../../Toast';

interface Props {
  liked: boolean;
  onToggleLike: () => void;
  visibility?: string;
  owner_id?: string;
  editing: boolean;
  onVisibilityChange: (updates: { visibility?: string; owner_id?: string }) => void;
}

export const ImageMetadata: React.FC<Props> = ({
  liked,
  onToggleLike,
  visibility = 'private',
  owner_id = '',
  editing,
  onVisibilityChange
}) => {
  // Convert Auth0 ID to email format for display
  const getUserEmail = (authId: string) => {
    if (!authId) return '';
    
    // If it's already an email, return as is
    if (authId.includes('@')) {
      return authId;
    }
    
    // If it's an auth0 ID like "auth0|123456", extract and format
    if (authId.includes('|')) {
      const parts = authId.split('|');
      if (parts.length > 1) {
        // For demo purposes, create a mock email from the ID
        return `user${parts[1].substring(0, 6)}@example.com`;
      }
    }
    
    // Fallback - create email from the ID
    return `${authId.substring(0, 8)}@example.com`;
  };

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginTop: '1rem',
        padding: '1rem',
        background: 'rgba(248, 250, 252, 0.8)',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap'
      }}
    >
      {/* Heart (Like) Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <button
          type="button"
          onClick={onToggleLike}
          aria-pressed={liked}
          aria-label={liked ? 'Unlike this recipe' : 'Like this recipe'}
          style={{ 
            background: 'none', 
            border: 'none', 
            padding: 0, 
            cursor: 'pointer', 
            display: 'inline-flex',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg viewBox="0 0 24 24" width={28} height={28} role="img" aria-hidden="true" style={{ filter:'drop-shadow(0 2px 4px rgba(0,0,0,.15))' }}>
            <defs>
              <linearGradient id="imageHeartGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="60%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </defs>
            <path
              d="M12 21s-1.45-1.32-3.17-2.99C6.39 15.7 4 13.42 4 10.5 4 8.02 5.94 6 8.4 6c1.54 0 3.04.99 3.6 2.09C12.56 6.99 14.06 6 15.6 6 18.06 6 20 8.02 20 10.5c0 2.92-2.39 5.2-4.83 7.51C13.45 19.68 12 21 12 21z"
              fill={liked ? 'url(#imageHeartGrad)' : 'none'}
              stroke={liked ? 'url(#imageHeartGrad)' : '#f87171'}
              strokeWidth={liked ? 0 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span style={{ 
          fontSize: '.875rem', 
          fontWeight: 600, 
          color: liked ? '#e11d48' : '#6b7280',
          transition: 'color 0.2s ease',
          userSelect: 'none'
        }}>
          {liked ? 'Liked' : 'Like'}
        </span>
      </div>

      {/* Visibility Badge - Shorter */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Visibility 
          visibility={visibility} 
          owner_id={owner_id} 
          editing={editing} 
          onChange={onVisibilityChange}
          compact={true}
        />
      </div>

      {/* User Email */}
      {owner_id && (
        <div 
          onClick={() => showToast('User profile coming soon', ToastType.Info)}
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '.5rem',
            padding: '.5rem .75rem',
            backgroundColor: '#fff',
            borderRadius: '.5rem',
            border: '1px solid #d1d5db',
            fontSize: '.875rem',
            fontWeight: 500,
            color: '#374151',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>{getUserEmail(owner_id)}</span>
        </div>
      )}
    </div>
  );
};