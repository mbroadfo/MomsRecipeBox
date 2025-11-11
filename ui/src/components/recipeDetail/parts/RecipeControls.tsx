import React from 'react';
import { Visibility } from './Visibility';

interface Props {
  // Navigation and editing
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onBack: () => void;
  
  // Recipe interactions
  visibility?: string;
  owner_id?: string;
  onVisibilityChange: (updates: { visibility?: string; owner_id?: string }) => void;
}

export const RecipeControls: React.FC<Props> = ({
  editing,
  saving,
  onEdit,
  onSave,
  onCancel,
  onBack,
  visibility = 'private',
  owner_id = '',
  onVisibilityChange
}) => {

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '1rem',
        minHeight: '44px'
      }}
    >
      {/* Left side: Back button */}
      <button 
        onClick={onBack}
        aria-label="Back to recipes list"
        style={{
          background: 'none',
          border: 'none',
          color: '#3b82f6',
          cursor: 'pointer',
          padding: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '44px',
          height: '44px',
          fontSize: '2rem',
          fontWeight: 'bold',
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
        ‹
      </button>

      {/* Center controls: Just Visibility */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        flex: 1,
        justifyContent: 'center'
      }}>
        {/* Compact Visibility Badge */}
        <Visibility 
          visibility={visibility} 
          owner_id={owner_id} 
          editing={editing} 
          onChange={onVisibilityChange}
          compact={true}
        />
      </div>

      {/* Right side: Edit button */}
      {!editing ? (
        <button 
          onClick={onEdit}
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
            width: '44px',
            height: '44px',
            transition: 'all 0.2s ease',
            flexShrink: 0
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
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
          <button 
            onClick={onSave} 
            disabled={saving} 
            aria-label="Save changes"
            style={{ 
              background: '#047857', 
              color: '#fff', 
              fontSize: '.75rem', 
              fontWeight: 600, 
              padding: '.5rem .75rem', 
              border: 'none',
              borderRadius: '.375rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button 
            onClick={onCancel} 
            disabled={saving} 
            aria-label="Cancel editing"
            style={{ 
              background: '#6b7280', 
              color: '#fff', 
              fontSize: '.75rem', 
              fontWeight: 600, 
              padding: '.5rem .75rem', 
              border: 'none',
              borderRadius: '.375rem',
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
  );
};