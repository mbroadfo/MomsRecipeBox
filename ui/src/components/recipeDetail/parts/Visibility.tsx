import React from 'react';

interface VisibilityProps {
  visibility?: string;
  owner_id?: string;
  editing: boolean;
  onChange: (updates: { visibility?: string; owner_id?: string }) => void;
  compact?: boolean; // For header display
}

export const Visibility: React.FC<VisibilityProps> = ({ visibility = 'private', owner_id = '', editing, onChange, compact = false }) => {
  // Get the current user ID for default values
  const currentUserId = (window as any).currentUser?.id || (window as any).currentUserId || 'demo-user';

  // Function to cycle through visibility options
  const cycleVisibility = () => {
    if (!editing) return; // Only allow cycling in edit mode
    
    const cycle = {
      'private': 'family',
      'family': 'public',
      'public': 'private'
    };
    
    onChange({ visibility: cycle[visibility as keyof typeof cycle] });
  };

  // Render a compact version for the header
  if (compact) {
    const getVisibilityBadge = () => {
      const bgColor = visibility === 'public' ? '#10b981' : 
                      visibility === 'family' ? '#3b82f6' : 
                      '#6b7280';
      const label = visibility === 'public' ? 'Public' : 
                   visibility === 'family' ? 'Family' : 
                   'Private';
      
      return (
        <button
          onClick={editing ? cycleVisibility : undefined}
          style={{ 
            backgroundColor: bgColor, 
            color: '#fff', 
            padding: '.2rem .5rem', 
            borderRadius: '.25rem', 
            fontSize: '.7rem',
            fontWeight: '500',
            marginRight: '.5rem',
            cursor: editing ? 'pointer' : 'default',
            border: 'none',
            outline: editing ? '1px solid #fff' : 'none',
            transition: 'background-color 0.2s, transform 0.1s',
            transform: editing ? 'scale(1)' : 'none',
            boxShadow: editing ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
          }}
          disabled={!editing}
          title={editing ? "Click to change visibility" : undefined}
        >
          {label}
        </button>
      );
    };
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        {getVisibilityBadge()}
        {/* Owner ID field removed - will use profile badge in header instead */}
      </div>
    );
  }

  // Regular full-size display for the recipe detail section
  if (!editing) {
    return (
      <div className="section-block visibility-display">
        <h2>Visibility</h2>
        <div style={{ fontSize: '.9rem', color: '#4b5563', marginTop: '.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '.5rem' }}>
            <span style={{ fontWeight: '600', minWidth: '80px' }}>Status:</span>
            <span style={{ 
              backgroundColor: visibility === 'public' ? '#10b981' : visibility === 'family' ? '#3b82f6' : '#6b7280', 
              color: '#fff', 
              padding: '.2rem .5rem', 
              borderRadius: '.25rem', 
              fontSize: '.8rem',
              fontWeight: '500'
            }}>
              {visibility === 'public' ? 'Public' : 
               visibility === 'family' ? 'Family Only' : 'Private'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', minWidth: '80px' }}>Owner:</span>
            <span>{owner_id || currentUserId}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-block visibility-editor">
      <h2>Visibility</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginTop: '.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontWeight: '600', minWidth: '80px' }}>Status:</label>
          <select
            value={visibility}
            onChange={e => onChange({ visibility: e.target.value })}
            style={{
              padding: '.4rem .6rem',
              borderRadius: '.375rem',
              border: '1px solid #d1d5db',
              backgroundColor: '#f9fafb',
              fontSize: '.9rem',
              width: '180px'
            }}
          >
            <option value="private">Private</option>
            <option value="family">Family Only</option>
            <option value="public">Public</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontWeight: '600', minWidth: '80px' }}>Owner:</label>
          <span>{owner_id || currentUserId}</span>
        </div>
        <div style={{ fontSize: '.8rem', color: '#6b7280', marginTop: '.25rem' }}>
          <p><strong>Private:</strong> Only visible to the owner</p>
          <p><strong>Family Only:</strong> Visible to owner and family members</p>
          <p><strong>Public:</strong> Visible to everyone</p>
        </div>
      </div>
    </div>
  );
};
