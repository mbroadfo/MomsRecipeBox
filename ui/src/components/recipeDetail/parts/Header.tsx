import React from 'react';

interface Props {
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onBack: () => void;
}

export const Header: React.FC<Props> = ({ 
  editing, 
  saving, 
  onEdit, 
  onSave, 
  onCancel, 
  onBack
}) => {
  return (
    <div style={{ position:'relative', zIndex:10 }}>
      {/* Minimal header - just back and edit buttons for title area */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '0', 
          marginTop: '0.5rem',
          minHeight: '48px'
        }}
      >
        {/* Back button - just < symbol */}
        <button 
          onClick={onBack}
          aria-label="Back to recipes list"
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            color: '#64748b',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f5f9';
            e.currentTarget.style.color = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#64748b';
          }}
        >
          ‹
        </button>
        
        {/* Spacer */}
        <div style={{ flex: 1 }} />
        
        {/* Edit button - just pencil icon or save/cancel */}
        {!editing ? (
          <button 
            onClick={onEdit}
            aria-label="Edit recipe"
            style={{ 
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              color: '#64748b',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '.5rem' }}>
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
    </div>
  );
};
