import React from 'react';
import { RecipeTitle } from './RecipeTitle';
import { Visibility } from './Visibility';

interface RecipeHeaderProps {
  // Recipe data
  title: string;
  ownerId?: string;
  visibility: 'public' | 'private';
  isNew: boolean;
  liked?: boolean;
  
  // Edit state
  editMode: boolean;
  saving: boolean;
  
  // Handlers
  onBack: () => void;
  onTitleChange: (title: string) => void;
  onToggleLike: () => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({
  title,
  ownerId,
  visibility,
  isNew,
  liked = false,
  editMode,
  saving,
  onBack,
  onTitleChange,
  onToggleLike,
  onStartEdit,
  onSave,
  onCancelEdit,
}) => {
  return (
    <div style={{ width: '100%', marginBottom: '1rem' }}>
      {/* Main Header Row - Back, Title, Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.5rem',
        width: '100%',
        padding: '0'
      }}>
        {/* Back Arrow */}
        <button 
          onClick={onBack}
          aria-label="Back to recipes"
          style={{
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#1d4ed8';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#3b82f6';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>

        {/* Title Column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <RecipeTitle 
            title={title}
            editing={editMode}
            onTitleChange={onTitleChange}
          />
        </div>

        {/* Right Side Actions */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          flexShrink: 0
        }}>
          {/* Like Heart - Only for existing recipes */}
          {!isNew && (
            <button
              onClick={onToggleLike}
              aria-label={liked ? "Unlike recipe" : "Like recipe"}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="22" 
                height="22" 
                viewBox="0 0 24 24" 
                fill={liked ? "#dc2626" : "none"} 
                stroke={liked ? "#dc2626" : "#6b7280"} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
          
          {/* Edit/Save/Cancel Buttons */}
          {!editMode ? (
            <button 
              onClick={onStartEdit}
              aria-label="Edit recipe"
              style={{ 
                background: 'none',
                border: 'none',
                color: '#22c55e',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#15803d';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#22c55e';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button 
                onClick={onSave} 
                disabled={saving} 
                aria-label="Save changes"
                style={{ 
                  background: '#047857', 
                  color: '#fff', 
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  padding: '0.4rem 0.6rem', 
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={onCancelEdit} 
                disabled={saving} 
                aria-label="Cancel editing"
                style={{ 
                  background: '#6b7280', 
                  color: '#fff', 
                  fontSize: '0.7rem', 
                  fontWeight: 600, 
                  padding: '0.4rem 0.6rem', 
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Info Row - Email and Visibility Badge */}
      {ownerId && (
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '0.5rem',
          padding: '0'
        }}>
          {/* User Email - Left Side */}
          <div style={{
            color: '#6b7280',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap'
          }}>
            by {(() => {
              const authId = ownerId;
              if (authId.includes('@')) return authId;
              if (authId.includes('|')) {
                const parts = authId.split('|');
                return `user${parts[1]?.substring(0, 6) || 'unknown'}@example.com`;
              }
              return `${authId.substring(0, 8)}@example.com`;
            })()}
          </div>
          
          {/* Visibility Badge - Right Side */}
          <div style={{ flexShrink: 0 }}>
            <Visibility 
              visibility={visibility}
              owner_id={ownerId}
              editing={editMode}
              onChange={() => {}} // Header doesn't have mutation access; parent should handle changes
              compact={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};